import hashlib, hmac, json, threading, time, unittest, urllib.parse, urllib.request, tempfile, os
from datetime import datetime
from http.server import ThreadingHTTPServer
from zoneinfo import ZoneInfo
import server as S

TOKEN = "123456:TEST-TOKEN-NOT-REAL"


def sign(fields, token=TOKEN):
    check = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    return urllib.parse.urlencode({**fields, "hash": hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()})


def good(now=None, uid=42):
    return sign({"auth_date": str(int(now or time.time())), "user": json.dumps({"id": uid, "first_name": "T"})})


class InitData(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(S.verify_init_data(good(), TOKEN)["id"], 42)

    def test_wrong_token(self):
        self.assertIsNone(S.verify_init_data(good(), "999:OTHER"))

    def test_tampered_user(self):
        bad = good().replace("%22id%22%3A+42", "%22id%22%3A+43")
        self.assertNotEqual(bad, good())
        self.assertIsNone(S.verify_init_data(bad, TOKEN))

    def test_expired(self):
        self.assertIsNone(S.verify_init_data(good(now=time.time() - 90000), TOKEN))

    def test_missing_hash_and_garbage(self):
        self.assertIsNone(S.verify_init_data("auth_date=1", TOKEN))
        self.assertIsNone(S.verify_init_data("", TOKEN))
        self.assertIsNone(S.verify_init_data("%%%", TOKEN))


class Clean(unittest.TestCase):
    def test_ok(self):
        r = S.clean_record({"enabled": True, "lat": 41.3, "lon": 69.2, "method": 3, "school": 1, "lang": "en"})
        self.assertEqual((r["school"], r["lang"]), (1, "en"))

    def test_bad(self):
        for b in ({"lat": 91, "lon": 0}, {"lat": 0, "lon": 181}, {"lat": 0, "lon": 0, "school": 2}, {"lat": "x", "lon": 0}, {"lon": 0}):
            with self.assertRaises((ValueError, KeyError)):
                S.clean_record(b)


class Due(unittest.TestCase):
    T = {"Fajr": "05:04", "Dhuhr": "12:13", "Asr": "15:31", "Maghrib": "18:05", "Isha": "19:21"}

    def at(self, h, m):
        return datetime(2026, 10, 8, h, m, tzinfo=ZoneInfo("Asia/Tashkent"))

    def test_window(self):
        self.assertEqual(S.due_prayers(self.T, self.at(12, 13), set()), ["Dhuhr"])
        self.assertEqual(S.due_prayers(self.T, self.at(12, 14), set()), ["Dhuhr"])
        self.assertEqual(S.due_prayers(self.T, self.at(12, 15), set()), [])
        self.assertEqual(S.due_prayers(self.T, self.at(12, 12), set()), [])

    def test_not_twice(self):
        self.assertEqual(S.due_prayers(self.T, self.at(12, 13), {"Dhuhr"}), [])


class Sched(unittest.TestCase):
    def test_sends_once_in_city_timezone(self):
        d = tempfile.mkdtemp()
        st = S.Store(os.path.join(d, "s.json"))
        st.put(1, {"enabled": True, "lat": 41.3, "lon": 69.2, "method": 3, "school": 0, "lang": "ru"})
        sent, calls = [], []
        def fetch(rec, day):
            calls.append(day.date().isoformat())
            return {"Fajr": "05:04", "Dhuhr": "12:13", "Asr": "15:31", "Maghrib": "18:05", "Isha": "19:21", "tz": "Asia/Tashkent"}
        # 12:13 in Tashkent (UTC+5) is 07:13 UTC
        clock = [datetime(2026, 10, 8, 7, 13, tzinfo=ZoneInfo("UTC")).timestamp()]
        sch = S.Scheduler(st, lambda c, text: sent.append((c, text)), fetch, lambda: clock[0])
        sch.tick(); sch.tick()
        self.assertEqual(len(sent), 1)
        self.assertIn("Зухр", sent[0][1])
        clock[0] += 3600 * 3 + 18 * 60  # 15:31 local
        sch.tick()
        self.assertEqual(len(sent), 2)
        self.assertIn("Аср", sent[1][1])

    def test_failing_user_does_not_stop_others(self):
        d = tempfile.mkdtemp()
        st = S.Store(os.path.join(d, "s.json"))
        for uid, lat in ((1, 10), (2, 20)):
            st.put(uid, {"enabled": True, "lat": lat, "lon": 0, "method": 3, "school": 0, "lang": "en"})
        sent = []
        def fetch(rec, day):
            if rec["lat"] == 10:
                raise RuntimeError("api down")
            return {"Fajr": "00:00", "Dhuhr": "12:00", "Asr": "15:00", "Maghrib": "18:00", "Isha": "20:00", "tz": "UTC"}
        t = datetime(2026, 10, 8, 12, 0, tzinfo=ZoneInfo("UTC")).timestamp()
        S.Scheduler(st, lambda c, text: sent.append(c), fetch, lambda: t).tick()
        self.assertEqual(sent, [2])


    def test_backs_off_after_api_error_and_prunes_old_marks(self):
        st = S.Store(os.path.join(tempfile.mkdtemp(), "s.json"))
        st.put(1, {"enabled": True, "lat": 10.0, "lon": 0.0, "method": 3, "school": 0, "lang": "ru"})
        calls, clock = [], [datetime(2026, 10, 8, 12, 0, tzinfo=ZoneInfo("UTC")).timestamp()]
        def fetch(rec, day):
            calls.append(day)
            raise RuntimeError("api down")
        sch = S.Scheduler(st, lambda c, text: None, fetch, lambda: clock[0])
        sch.tick(); sch.tick()
        self.assertEqual(len(calls), 1)  # second tick is inside the 5 minute back-off
        clock[0] += 301
        sch.tick()
        self.assertEqual(len(calls), 2)
        sch.sent[("1", "2026-10-01")] = {"Fajr"}
        sch.sent[("1", "2026-10-07")] = {"Fajr"}
        sch.tick()
        self.assertEqual(sorted(k[1] for k in sch.sent), ["2026-10-07"])

class Http(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp()
        cls.store = S.Store(os.path.join(cls.dir, "s.json"))
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), S.make_handler(cls.store, TOKEN))
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()
        cls.url = f"http://127.0.0.1:{cls.srv.server_port}/api/subscribe"

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def post(self, body):
        req = urllib.request.Request(self.url, json.dumps(body).encode(), {"Content-Type": "application/json"})
        try:
            return urllib.request.urlopen(req).status
        except urllib.error.HTTPError as e:
            return e.code

    def test_subscribe_and_unsubscribe(self):
        b = {"initData": good(uid=7), "enabled": True, "lat": 41.3, "lon": 69.2, "method": 3, "school": 0, "lang": "ru"}
        self.assertEqual(self.post(b), 200)
        self.assertIn("7", self.store.all())
        b["enabled"] = False
        self.assertEqual(self.post(b), 200)
        self.assertNotIn("7", self.store.all())

    def test_rejects_unsigned_and_bad_input(self):
        self.assertEqual(self.post({"initData": "x=1", "enabled": True, "lat": 1, "lon": 1}), 401)
        self.assertEqual(self.post({"initData": good(), "enabled": True, "lat": 999, "lon": 1}), 400)


if __name__ == "__main__":
    unittest.main()
