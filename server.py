#!/usr/bin/env python3
"""Adhan bot for the Nur Salah Mini App. Standard library only.

Env: BOT_TOKEN (required), WEBAPP_URL (https URL of the Mini App, for /start), PORT (default 8080),
     DATA_FILE (default subscribers.json), ALLOWED_ORIGIN (CORS, default *).
The Mini App posts its Telegram initData to /api/subscribe; this server verifies the signature.
"""
import hashlib, hmac, json, os, threading, time, urllib.parse, urllib.request
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from zoneinfo import ZoneInfo

PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
NAMES = {
    "ru": {"Fajr": "Фаджр", "Dhuhr": "Зухр", "Asr": "Аср", "Maghrib": "Магриб", "Isha": "Иша", "text": "Время намаза {p}"},
    "en": {"Fajr": "Fajr", "Dhuhr": "Dhuhr", "Asr": "Asr", "Maghrib": "Maghrib", "Isha": "Isha", "text": "It is time for {p}"},
}


def verify_init_data(init_data, bot_token, max_age=86400, now=None):
    """Return the Telegram user dict if the Mini App initData signature is valid, else None."""
    try:
        pairs = urllib.parse.parse_qsl(init_data, keep_blank_values=True, strict_parsing=True)
    except ValueError:
        return None
    data = dict(pairs)
    got = data.pop("hash", None)
    if not got:
        return None
    check = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    want = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(want, got):
        return None
    try:
        age = (now or time.time()) - int(data.get("auth_date", "0"))
    except ValueError:
        return None
    if age > max_age or age < -300:
        return None
    try:
        return json.loads(data.get("user", ""))
    except ValueError:
        return None


class Store:
    def __init__(self, path):
        self.path, self.lock = path, threading.Lock()
        try:
            with open(path, encoding="utf-8") as fh:
                self.subs = json.load(fh)
        except (OSError, ValueError):
            self.subs = {}

    def put(self, uid, rec):
        with self.lock:
            if rec["enabled"]:
                self.subs[str(uid)] = rec
            else:
                self.subs.pop(str(uid), None)
            tmp = self.path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(self.subs, fh)
            os.replace(tmp, self.path)

    def all(self):
        with self.lock:
            return dict(self.subs)


def clean_record(body):
    """Validate the client's request. Raises ValueError on bad input."""
    lat, lon = float(body["lat"]), float(body["lon"])
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError("coordinates")
    method, school = int(body.get("method", 3)), int(body.get("school", 0))
    if not (0 <= method <= 23 and school in (0, 1)):
        raise ValueError("method")
    lang = body.get("lang") if body.get("lang") in NAMES else "ru"
    return {"enabled": bool(body.get("enabled")), "lat": lat, "lon": lon, "method": method, "school": school, "lang": lang}


def fetch_timings(rec, day, opener=urllib.request.urlopen):
    """Prayer times for a local date from the Aladhan API: {'Fajr': 'HH:MM', ..., 'tz': 'Asia/Tashkent'}."""
    url = (f"https://api.aladhan.com/v1/timings/{day.strftime('%d-%m-%Y')}?latitude={rec['lat']}&longitude={rec['lon']}"
           f"&method={rec['method']}&school={rec['school']}")
    with opener(url, timeout=20) as r:
        j = json.load(r)["data"]
    out = {p: j["timings"][p][:5] for p in PRAYERS}
    out["tz"] = j["meta"]["timezone"]
    return out


def due_prayers(timings, now_local, sent_today, window_min=2):
    """Prayers whose time is within the last `window_min` minutes and not sent yet."""
    out = []
    for p in PRAYERS:
        h, m = map(int, timings[p].split(":"))
        diff = (now_local.hour * 60 + now_local.minute) - (h * 60 + m)
        if 0 <= diff < window_min and p not in sent_today:
            out.append(p)
    return out


class Scheduler(threading.Thread):
    def __init__(self, store, send, fetch=fetch_timings, clock=time.time):
        super().__init__(daemon=True)
        self.store, self.send, self.fetch, self.clock = store, send, fetch, clock
        self.cache, self.sent = {}, {}

    def tick(self):
        now_utc = datetime.fromtimestamp(self.clock(), ZoneInfo("UTC"))
        for uid, rec in self.store.all().items():
            try:
                key = (rec["lat"], rec["lon"], rec["method"], rec["school"])
                tz = self.cache.get(key, {}).get("tz")
                local = now_utc.astimezone(ZoneInfo(tz)) if tz else now_utc
                ck = key + (local.date().isoformat(),)
                if ck not in self.cache:
                    self.cache = {k: v for k, v in self.cache.items() if k[-1] == local.date().isoformat() or len(k) == 4}
                    self.cache[ck] = self.fetch(rec, local)
                    self.cache[key] = {"tz": self.cache[ck]["tz"]}
                    local = now_utc.astimezone(ZoneInfo(self.cache[ck]["tz"]))
                    ck = key + (local.date().isoformat(),)
                    if ck not in self.cache:
                        self.cache[ck] = self.fetch(rec, local)
                tm = self.cache[ck]
                done = self.sent.setdefault((uid, local.date().isoformat()), set())
                for p in due_prayers(tm, local, done):
                    done.add(p)
                    n = NAMES[rec["lang"]]
                    self.send(int(uid), "🕌 " + n["text"].format(p=n[p]) + f" ({tm[p]})")
            except Exception as e:  # one bad subscriber must not stop the rest
                print("scheduler error", uid, e, flush=True)

    def run(self):
        while True:
            self.tick()
            time.sleep(30)


def make_sender(token):
    def send(chat_id, text, extra=None):
        body = {"chat_id": chat_id, "text": text}
        body.update(extra or {})
        req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", json.dumps(body).encode(),
                                     {"Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=15).read()
        except Exception as e:
            print("send failed", chat_id, e, flush=True)
    return send


def make_handler(store, token, origin="*"):
    class H(BaseHTTPRequestHandler):
        def _reply(self, code, obj):
            raw = json.dumps(obj).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Access-Control-Allow-Origin", origin)
            self.end_headers()
            self.wfile.write(raw)

        def do_OPTIONS(self):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.end_headers()

        def do_POST(self):
            if self.path != "/api/subscribe":
                return self._reply(404, {"error": "not found"})
            try:
                n = int(self.headers.get("Content-Length", "0"))
                if n > 4096:
                    return self._reply(413, {"error": "too large"})
                body = json.loads(self.rfile.read(n))
                user = verify_init_data(body.get("initData", ""), token)
                if not user:
                    return self._reply(401, {"error": "bad initData"})
                rec = clean_record(body)
            except (ValueError, KeyError, TypeError):
                return self._reply(400, {"error": "bad request"})
            store.put(user["id"], rec)
            self._reply(200, {"ok": True})

        def log_message(self, *a):
            pass
    return H


def poll_start_command(token, webapp_url, send):
    """Answer /start with a button that opens the Mini App. Long polling, no webhook needed."""
    offset = 0
    while True:
        try:
            url = f"https://api.telegram.org/bot{token}/getUpdates?timeout=30&offset={offset}"
            with urllib.request.urlopen(url, timeout=40) as r:
                for u in json.load(r).get("result", []):
                    offset = u["update_id"] + 1
                    m = u.get("message") or {}
                    if (m.get("text") or "").startswith("/start") and webapp_url:
                        send(m["chat"]["id"], "Nur Salah", {"reply_markup": {"inline_keyboard": [[{"text": "Open", "web_app": {"url": webapp_url}}]]}})
        except Exception as e:
            print("poll error", e, flush=True)
            time.sleep(5)


def main():
    token = os.environ.get("BOT_TOKEN")
    if not token:
        raise SystemExit("Set BOT_TOKEN (from @BotFather) in the environment. Never commit it.")
    store = Store(os.environ.get("DATA_FILE", "subscribers.json"))
    send = make_sender(token)
    Scheduler(store, send).start()
    threading.Thread(target=poll_start_command, args=(token, os.environ.get("WEBAPP_URL", ""), send), daemon=True).start()
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8080"))), make_handler(store, token, os.environ.get("ALLOWED_ORIGIN", "*"))).serve_forever()


if __name__ == "__main__":
    main()
