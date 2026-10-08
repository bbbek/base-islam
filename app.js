/* Nur Salah: prayer times, Quran, dhikr, Qibla as a Telegram Mini App. No build step. */
(() => {
'use strict';
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) { try { tg.ready(); tg.expand(); } catch (e) {} }
const $ = (s, r = document) => r.querySelector(s);
const view = $('#view'), player = $('#player');

// ---------- i18n ----------
const I18N = {
  ru: {
    home: 'Намаз', quran: 'Коран', dhikr: 'Зикр', qibla: 'Кибла', more: 'Ещё',
    next: 'Следующий намаз', in: 'через', fajr: 'Фаджр', sunrise: 'Восход', dhuhr: 'Зухр', asr: 'Аср', maghrib: 'Магриб', isha: 'Иша',
    loading: 'Загрузка…', offline: 'Нет сети. Показаны сохранённые данные.', fail: 'Не удалось загрузить',
    city: 'Город', search: 'Найти город', useGps: 'Моё местоположение', method: 'Метод расчёта', madhab: 'Мазхаб (Аср)',
    shafii: 'Шафи’и, малики, ханбали', hanafi: 'Ханафи', lang: 'Язык', calendar: 'Календарь', favorites: 'Избранное и заметки',
    settings: 'Настройки', adhanBot: 'Азан сообщением от бота', adhanOff: 'Бот не подключён (нужен BOT_API_URL)',
    adhanOn: 'Включено', adhanSaved: 'Азан включён', adhanStopped: 'Азан выключен',
    surahs: 'Суры', resume: 'Продолжить чтение', ayah: 'Аят', translation: 'Перевод', translit: 'Транслитерация', reciter: 'Чтец',
    play: 'Слушать', pause: 'Пауза', fav: 'В избранное', unfav: 'Убрать', note: 'Заметка', share: 'Поделиться', copy: 'Копировать',
    copied: 'Скопировано', noteQ: 'Ваша заметка к аяту', empty: 'Пока пусто', font: 'Размер шрифта', save: 'Сохранить для офлайн', saved: 'Сохранено офлайн',
    back: 'Назад', today: 'Сегодня', reset: 'Сбросить', goal: 'Цель', done: 'Цель достигнута',
    qiblaDir: 'Направление на Каабу', degrees: 'от севера', compassOn: 'Включить компас', noSensor: 'Датчик компаса недоступен. Поверните телефон так, чтобы север был сверху, и ориентируйтесь по углу.',
    locDenied: 'Нет доступа к геолокации. Выберите город вручную.', found: 'Найдено', notFound: 'Ничего не найдено',
    hijri: 'по хиджре', trademark: 'Данные: Aladhan, alquran.cloud, islamic.network',
  },
  en: {
    home: 'Prayer', quran: 'Quran', dhikr: 'Dhikr', qibla: 'Qibla', more: 'More',
    next: 'Next prayer', in: 'in', fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
    loading: 'Loading…', offline: 'Offline. Showing saved data.', fail: 'Could not load',
    city: 'City', search: 'Find city', useGps: 'Use my location', method: 'Calculation method', madhab: 'Madhab (Asr)',
    shafii: 'Shafi’i, Maliki, Hanbali', hanafi: 'Hanafi', lang: 'Language', calendar: 'Calendar', favorites: 'Favorites and notes',
    settings: 'Settings', adhanBot: 'Adhan message from the bot', adhanOff: 'Bot not connected (set BOT_API_URL)',
    adhanOn: 'On', adhanSaved: 'Adhan enabled', adhanStopped: 'Adhan disabled',
    surahs: 'Surahs', resume: 'Continue reading', ayah: 'Ayah', translation: 'Translation', translit: 'Transliteration', reciter: 'Reciter',
    play: 'Play', pause: 'Pause', fav: 'Favorite', unfav: 'Remove', note: 'Note', share: 'Share', copy: 'Copy',
    copied: 'Copied', noteQ: 'Your note for this ayah', empty: 'Nothing yet', font: 'Font size', save: 'Save for offline', saved: 'Saved offline',
    back: 'Back', today: 'Today', reset: 'Reset', goal: 'Goal', done: 'Goal reached',
    qiblaDir: 'Direction to the Kaaba', degrees: 'from north', compassOn: 'Enable compass', noSensor: 'No compass sensor. Point your phone so north is up and use the angle.',
    locDenied: 'Location access denied. Pick a city manually.', found: 'Found', notFound: 'Nothing found',
    hijri: 'Hijri', trademark: 'Data: Aladhan, alquran.cloud, islamic.network',
  },
};
const TRANSLATIONS = { ru: 'ru.kuliev', en: 'en.sahih' };
const METHODS = [[3, 'Muslim World League'], [2, 'ISNA (North America)'], [4, 'Umm al-Qura (Makkah)'], [5, 'Egyptian General Authority'],
  [1, 'Karachi (Univ. of Islamic Sciences)'], [13, 'Diyanet (Turkey)'], [14, 'Spiritual Admin. of Muslims of Russia'], [0, 'Jafari (Shia Ithna-Ashari)']];
// [id, name, kbps]: bitrates verified against the audio CDN (some reciters only exist at 64).
const RECITERS = [['ar.alafasy', 'Mishary Alafasy', 128], ['ar.husary', 'Mahmoud Khalil Al-Husary', 128], ['ar.abdulsamad', 'Abdul Basit Abdul Samad', 64],
  ['ar.abdurrahmaansudais', 'Abdurrahman As-Sudais', 64], ['ar.mahermuaiqly', 'Maher Al-Muaiqly', 128]];
const DHIKR = [['سبحان الله', 33], ['الحمد لله', 33], ['الله أكبر', 34], ['لا إله إلا الله', 100], ['أستغفر الله', 100]];
const KAABA = { lat: 21.4225, lon: 39.8262 };

// ---------- storage (localStorage + Telegram CloudStorage) ----------
const KEY = 'ns:';
const cloud = tg && tg.initData && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9') ? tg.CloudStorage : null;
const store = {
  get(k, d) { try { const v = localStorage.getItem(KEY + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) {
    const s = JSON.stringify(v);
    try { localStorage.setItem(KEY + k, s); } catch (e) { /* quota or blocked */ }
    if (cloud && s.length < 3900 && /^(settings|pos|dhikr|favs|n_)/.test(k)) { try { cloud.setItem(k.slice(0, 128), s); } catch (e) {} }
  },
  del(k) { try { localStorage.removeItem(KEY + k); } catch (e) {} if (cloud) { try { cloud.removeItem(k); } catch (e) {} } },
};
function cloudPull() {
  return new Promise(res => {
    if (!cloud) return res();
    try {
      cloud.getKeys((e, keys) => {
        if (e || !keys || !keys.length) return res();
        cloud.getItems(keys.slice(0, 100), (e2, items) => {
          if (!e2 && items) for (const k of Object.keys(items)) {
            if (localStorage.getItem(KEY + k) == null && items[k]) { try { localStorage.setItem(KEY + k, items[k]); } catch (x) {} }
          }
          res();
        });
      });
    } catch (e) { res(); }
  });
}

// ---------- state ----------
const defaults = { lang: 'ru', method: 3, school: 0, size: 26, reciter: 'ar.alafasy', adhan: false,
  loc: { name: 'Mecca', lat: 21.4225, lon: 39.8262 } };
const S = Object.assign({}, defaults, store.get('settings', {}));
if (!I18N[S.lang]) S.lang = 'ru';
const t = k => (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k;
const saveSettings = () => store.set('settings', S);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let toastTimer;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 1800); }
function haptic(kind = 'light') { try { tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred(kind); } catch (e) {} if (!tg && navigator.vibrate) navigator.vibrate(8); }
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// ---------- prayer times ----------
const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const API_KEYS = { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };
function nowIn(tz) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date());
  const g = type => +p.find(x => x.type === type).value;
  return { y: g('year'), m: g('month'), d: g('day'), secs: g('hour') * 3600 + g('minute') * 60 + g('second') };
}
const hm = s => { const [h, m] = String(s).slice(0, 5).split(':').map(Number); return h * 3600 + m * 60; };
const fmtHM = secs => { const m = Math.round(secs / 60) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const fmtHMS = secs => { secs = Math.max(0, Math.floor(secs)); return [Math.floor(secs / 3600), Math.floor(secs % 3600 / 60), secs % 60].map(n => String(n).padStart(2, '0')).join(':'); };
function calKey(y, m) { return `cal:${S.loc.lat.toFixed(2)},${S.loc.lon.toFixed(2)}:${S.method}:${S.school}:${y}-${m}`; }
async function month(y, m) {
  const key = calKey(y, m);
  const hit = store.get(key);
  if (hit) return hit;
  const url = `https://api.aladhan.com/v1/calendar/${y}/${m}?latitude=${S.loc.lat}&longitude=${S.loc.lon}&method=${S.method}&school=${S.school}`;
  const j = await getJSON(url);
  const out = { tz: j.data[0].meta.timezone, days: j.data.map(x => ({
    d: +x.date.gregorian.day, hijri: `${x.date.hijri.day} ${x.date.hijri.month.en} ${x.date.hijri.year}`,
    t: PRAYERS.map(p => hm(x.timings[API_KEYS[p]])) })) };
  store.set(key, out);
  evictOldCalendars(key);
  return out;
}
function evictOldCalendars(keep) {
  try {
    const keys = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(KEY + 'cal:')) keys.push(k); }
    keys.filter(k => k !== KEY + keep).slice(0, Math.max(0, keys.length - 8)).forEach(k => localStorage.removeItem(k));
  } catch (e) {}
}
async function today() {
  // The city's time zone is only known after the first fetch, so start from the device zone and correct it.
  let n = nowIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
  let mo = await month(n.y, n.m);
  const local = nowIn(mo.tz);
  if (local.y !== n.y || local.m !== n.m) mo = await month(local.y, local.m);
  n = local;
  const day = mo.days.find(x => x.d === n.d) || mo.days[0];
  const next = new Date(Date.UTC(n.y, n.m - 1, n.d + 1));
  const tm = next.getUTCMonth() + 1 === n.m ? mo : await month(next.getUTCFullYear(), next.getUTCMonth() + 1);
  const tmDay = tm.days.find(x => x.d === next.getUTCDate()) || day;
  return { tz: mo.tz, day, tomorrow: tmDay, n };
}
function nextPrayer(info) {
  const secs = nowIn(info.tz).secs;
  const adhan = [0, 2, 3, 4, 5]; // skip sunrise
  for (const i of adhan) if (info.day.t[i] > secs) return { i, left: info.day.t[i] - secs };
  return { i: 0, left: 86400 - secs + info.tomorrow.t[0] };
}

// ---------- Qibla ----------
function qiblaBearing(lat, lon) {
  const r = Math.PI / 180, dl = (KAABA.lon - lon) * r;
  const y = Math.sin(dl) * Math.cos(KAABA.lat * r);
  const x = Math.cos(lat * r) * Math.sin(KAABA.lat * r) - Math.sin(lat * r) * Math.cos(KAABA.lat * r) * Math.cos(dl);
  return (Math.atan2(y, x) / r + 360) % 360;
}

// ---------- shell ----------
let tab = 'home', timers = [], navId = 0;
function clearTimers() { timers.forEach(clearInterval); timers = []; }
function renderTabs() {
  document.querySelectorAll('#tabs button').forEach(b => { b.textContent = t(b.dataset.tab); b.classList.toggle('on', b.dataset.tab === tab); });
}
function go(name, arg) {
  clearTimers(); navId++; tab = name.split(':')[0]; renderTabs(); window.scrollTo(0, 0);
  ({ home: viewHome, quran: viewQuran, dhikr: viewDhikr, qibla: viewQibla, more: viewMore, reader: viewReader, favs: viewFavs, cal: viewCal }[name] || viewHome)(arg);
}
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));

// ---------- Home ----------
async function viewHome() {
  const id = navId;
  view.innerHTML = `<h1>${esc(S.loc.name)}</h1><div class="card hint">${t('loading')}</div>`;
  let info;
  try { info = await today(); } catch (e) {
    if (id !== navId) return;
    view.innerHTML = `<h1>${esc(S.loc.name)}</h1><div class="card">${t('fail')}. ${navigator.onLine ? '' : t('offline')}</div>`; return;
  }
  const draw = () => {
    const np = nextPrayer(info);
    const rows = PRAYERS.map((p, i) => {
      const cls = i === np.i ? 'next' : (info.day.t[i] <= nowIn(info.tz).secs && !(np.i === 0 && i === 0 && np.left > 0 && info.day.t[0] > nowIn(info.tz).secs) ? 'past' : '');
      return `<div class="prayer ${cls}"><span>${t(p)}</span><span>${fmtHM(info.day.t[i])}</span></div>`;
    }).join('');
    view.innerHTML = `<h1>${esc(S.loc.name)}</h1>
      <div class="card"><div class="hint">${t('next')}: ${t(PRAYERS[np.i])}</div>
        <div class="big" id="cd">${fmtHMS(np.left)}</div>
        <div class="hint">${esc(info.day.hijri)} (${t('hijri')})</div></div>
      <div class="card">${rows}</div>`;
  };
  if (id !== navId) return;
  draw();
  timers.push(setInterval(() => {
    const np = nextPrayer(info); const el = $('#cd');
    if (el) { el.textContent = fmtHMS(np.left); if (np.left > 86300 || np.left === 0) draw(); } else clearTimers();
  }, 1000));
}

// ---------- Quran ----------
let surahList = null, playing = null;
async function getSurahs() { if (surahList) return surahList; surahList = (await getJSON('https://api.alquran.cloud/v1/surah')).data; return surahList; }
async function viewQuran() {
  const id = navId;
  view.innerHTML = `<h1>${t('quran')}</h1><div class="card hint">${t('loading')}</div>`;
  let list;
  try { list = await getSurahs(); } catch (e) { if (id !== navId) return; view.innerHTML = `<h1>${t('quran')}</h1><div class="card">${t('fail')}. ${t('offline')}</div>`; return; }
  if (id !== navId) return;
  const pos = store.get('pos');
  const resume = pos ? `<div class="card row"><div><div class="hint">${t('resume')}</div><b>${esc(list[pos.s - 1].englishName)}</b> · ${t('ayah')} ${pos.a}</div>
    <button class="btn primary" id="resume">→</button></div>` : '';
  view.innerHTML = `<h1>${t('quran')}</h1>${resume}<input id="q" placeholder="${t('surahs')}…" style="width:100%;margin-bottom:8px">
    <div class="card list" id="sl"></div>`;
  const fill = f => {
    $('#sl').innerHTML = list.filter(s => !f || (s.englishName + s.name + s.number).toLowerCase().includes(f))
      .map(s => `<button class="item" data-s="${s.number}"><span><span class="num">${s.number}</span> ${esc(s.englishName)}
        <span class="hint">· ${s.numberOfAyahs}</span></span><span class="ar" style="font-size:20px;line-height:1.4">${esc(s.name.replace('سورة', '').trim())}</span></button>`).join('');
  };
  fill('');
  $('#q').addEventListener('input', e => fill(e.target.value.trim().toLowerCase()));
  $('#sl').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) go('reader', { s: +b.dataset.s }); });
  if (pos) $('#resume').addEventListener('click', () => go('reader', { s: pos.s, a: pos.a }));
}
async function loadSurah(n) {
  const tr = TRANSLATIONS[S.lang] || 'en.sahih';
  const j = await getJSON(`https://api.alquran.cloud/v1/surah/${n}/editions/quran-uthmani,${tr},en.transliteration`);
  const [ar, tl, tlit] = j.data;
  // The API glues the basmala onto ayah 1 of every surah except 1 and 9; show it as its own line instead.
  return ar.ayahs.map((a, i) => {
    let text = a.text, basmala = false;
    if (a.numberInSurah === 1 && n !== 1 && n !== 9) {
      const w = text.split(' '); text = w.slice(4).join(' ').trim(); basmala = w.slice(0, 4).join(' ');
    }
    return { n: a.number, a: a.numberInSurah, ar: text || a.text, basmala, tr: tl.ayahs[i].text, tlit: tlit.ayahs[i].text };
  });
}
const favs = () => new Set(store.get('favs', []));
async function viewReader({ s, a }) {
  const id = navId;
  view.style.setProperty('--arsize', S.size + 'px');
  view.innerHTML = `<div class="row"><button class="btn small" id="bk">← ${t('back')}</button><button class="btn small" id="sv">${t('save')}</button></div><h1 id="sn">${t('loading')}</h1><div id="ay"></div>`;
  $('#bk').onclick = () => go('quran');
  let ayahs, meta;
  try { [ayahs, meta] = await Promise.all([loadSurah(s), getSurahs()]); } catch (e) { if (id === navId) $('#sn').textContent = t('fail'); return; }
  if (id !== navId) return;
  $('#sv').onclick = () => toast(t('saved'));
  const m = meta[s - 1];
  $('#sn').innerHTML = `${esc(m.englishName)} <span class="ar" style="font-size:24px">${esc(m.name)}</span>`;
  const fv = favs();
  const render = () => {
    $('#ay').innerHTML = ayahs.map(x => {
      const f = fv.has(s + ':' + x.a), note = store.get('n_' + s + ':' + x.a);
      return `<div class="ayah" id="a${x.a}" data-a="${x.a}">${x.basmala ? `<div class="ar" style="text-align:center;color:var(--hint)">${esc(x.basmala)}</div>` : ''}<div class="ar">${esc(x.ar)} <span class="num">${x.a}</span></div>
        <div class="tl">${esc(x.tlit)}</div><div class="tr">${esc(x.tr)}</div>
        ${note ? `<div class="hint">📝 ${esc(note)}</div>` : ''}
        <div class="acts"><button class="btn small" data-act="play">▶ ${t('play')}</button>
        <button class="btn small" data-act="fav">${f ? '★ ' + t('unfav') : '☆ ' + t('fav')}</button>
        <button class="btn small" data-act="note">📝 ${t('note')}</button>
        <button class="btn small" data-act="share">${t('share')}</button>
        <button class="btn small" data-act="copy">${t('copy')}</button></div></div>`;
    }).join('') + `<div id="playbar"><select id="rc">${RECITERS.map(r => `<option value="${r[0]}" ${r[0] === S.reciter ? 'selected' : ''}>${r[1]}</option>`).join('')}</select>
      <input type="range" id="fs" min="20" max="40" value="${S.size}" aria-label="${t('font')}" style="flex:1;padding:0"></div>`;
    $('#rc').onchange = e => { S.reciter = e.target.value; saveSettings(); };
    $('#fs').oninput = e => { S.size = +e.target.value; view.style.setProperty('--arsize', S.size + 'px'); saveSettings(); };
  };
  render();
  const find = n => ayahs.find(x => x.a === n);
  $('#ay').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const n = +b.closest('.ayah').dataset.a, x = find(n), id = s + ':' + n;
    if (b.dataset.act === 'play') playFrom(ayahs, n);
    if (b.dataset.act === 'fav') { fv.has(id) ? fv.delete(id) : fv.add(id); store.set('favs', [...fv]); render(); }
    if (b.dataset.act === 'note') {
      const v = prompt(t('noteQ'), store.get('n_' + id, '')); if (v === null) return;
      v.trim() ? store.set('n_' + id, v.trim()) : store.del('n_' + id); render();
    }
    if (b.dataset.act === 'share' || b.dataset.act === 'copy') {
      const text = `${x.ar}\n\n${x.tr}\n\n— ${m.englishName} ${s}:${n}`;
      if (b.dataset.act === 'copy') { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast(t('copied')), () => toast(text)); }
      else { const u = 'https://t.me/share/url?url=' + encodeURIComponent(' ') + '&text=' + encodeURIComponent(text);
        if (tg && tg.openTelegramLink) tg.openTelegramLink(u); else window.open(u, '_blank'); }
    }
  });
  // remember reading position
  const seen = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) store.set('pos', { s, a: +en.target.dataset.a }); }), { threshold: 0.6 });
  document.querySelectorAll('.ayah').forEach(el => seen.observe(el));
  if (a) { const el = $('#a' + a); if (el) el.scrollIntoView(); }
}
function playFrom(ayahs, startA) {
  const idx = ayahs.findIndex(x => x.a === startA);
  const go1 = i => {
    if (i >= ayahs.length) { playing = null; return; }
    document.querySelectorAll('.ayah.playing').forEach(e => e.classList.remove('playing'));
    const el = $('#a' + ayahs[i].a); if (el) { el.classList.add('playing'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    const rc = RECITERS.find(r => r[0] === S.reciter) || RECITERS[0];
    player.src = `https://cdn.islamic.network/quran/audio/${rc[2]}/${rc[0]}/${ayahs[i].n}.mp3`;
    player.onended = () => go1(i + 1);
    player.onerror = () => { toast(t('fail')); };
    player.play().catch(() => toast(t('fail')));
    playing = i;
  };
  if (playing !== null && player.src && !player.paused && idx === playing) { player.pause(); return; }
  go1(idx);
}

// ---------- Favorites ----------
async function viewFavs() {
  const id = navId;
  const list = [...favs()];
  const notes = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(KEY + 'n_')) notes.push(k.slice((KEY + 'n_').length)); }
  const ids = [...new Set([...list, ...notes])].sort((x, y) => { const [a, b] = x.split(':').map(Number), [c, d] = y.split(':').map(Number); return a - c || b - d; });
  let meta = []; try { meta = await getSurahs(); } catch (e) {}
  if (id !== navId) return;
  view.innerHTML = `<button class="btn small" id="bk">← ${t('back')}</button><h1>${t('favorites')}</h1><div class="card list">${
    ids.length ? ids.map(id => { const [s, a] = id.split(':').map(Number); const n = store.get('n_' + id);
      return `<button class="item" data-s="${s}" data-a="${a}"><span>${favs().has(id) ? '★' : '📝'} ${esc(meta[s - 1] ? meta[s - 1].englishName : 'Surah ' + s)} ${s}:${a}
      ${n ? `<br><span class="hint">${esc(n)}</span>` : ''}</span></button>`; }).join('') : `<span class="hint">${t('empty')}</span>`}</div>`;
  $('#bk').onclick = () => go('more');
  view.querySelectorAll('[data-s]').forEach(b => b.onclick = () => go('reader', { s: +b.dataset.s, a: +b.dataset.a }));
}

// ---------- Dhikr ----------
function viewDhikr() {
  const st = store.get('dhikr', { i: 0, c: {} });
  const [txt, goal] = DHIKR[st.i];
  const c = st.c[st.i] || 0;
  view.innerHTML = `<h1>${t('dhikr')}</h1>
    <div class="field"><select id="dz">${DHIKR.map((d, i) => `<option value="${i}" ${i === st.i ? 'selected' : ''}>${d[0]} · ${d[1]}</option>`).join('')}</select></div>
    <div class="ar" style="font-size:34px;text-align:center;line-height:1.6">${txt}</div>
    <button class="counter" id="cnt">${c}<small>${t('goal')}: ${goal}</small></button>
    <div class="row" style="justify-content:center"><button class="btn" id="rs">${t('reset')}</button></div>
    <p class="hint" id="gd" style="text-align:center">${c >= goal ? t('done') : ''}</p>`;
  $('#dz').onchange = e => { st.i = +e.target.value; store.set('dhikr', st); viewDhikr(); };
  $('#cnt').onclick = () => {
    st.c[st.i] = (st.c[st.i] || 0) + 1; store.set('dhikr', st);
    const v = st.c[st.i]; $('#cnt').firstChild.nodeValue = v; haptic(v === goal ? 'heavy' : 'light');
    $('#gd').textContent = v >= goal ? t('done') : '';
  };
  $('#rs').onclick = () => { st.c[st.i] = 0; store.set('dhikr', st); viewDhikr(); };
}

// ---------- Qibla ----------
function viewQibla() {
  const b = qiblaBearing(S.loc.lat, S.loc.lon);
  view.innerHTML = `<h1>${t('qibla')}</h1><div class="card" style="text-align:center">
    <div class="hint">${esc(S.loc.name)} · ${t('qiblaDir')}</div>
    <div class="big">${Math.round(b)}°</div><div class="hint">${t('degrees')}</div>
    <div class="compass"><span class="mark">N</span><div class="arrow" id="ar" style="transform:rotate(${b}deg)"></div></div>
    <button class="btn primary" id="cp">${t('compassOn')}</button><p class="hint" id="cm"></p></div>`;
  const rotate = h => { const el = $('#ar'); if (el) el.style.transform = `rotate(${(b - h + 360) % 360}deg)`; };
  const listen = () => {
    let got = false;
    const onO = e => { const h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? 360 - e.alpha : null);
      if (h != null) { got = true; rotate(h); } };
    window.addEventListener('deviceorientationabsolute', onO, true); window.addEventListener('deviceorientation', onO, true);
    setTimeout(() => { if (!got) $('#cm').textContent = t('noSensor'); }, 2000);
  };
  $('#cp').onclick = async () => {
    try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') throw 0; } listen(); }
    catch (e) { $('#cm').textContent = t('noSensor'); }
  };
}

// ---------- Calendar ----------
async function viewCal() {
  const id = navId;
  view.innerHTML = `<button class="btn small" id="bk">← ${t('back')}</button><h1>${t('calendar')}</h1><div class="card hint">${t('loading')}</div>`;
  $('#bk').onclick = () => go('more');
  try {
    const info = await today(); const mo = await month(info.n.y, info.n.m);
    if (id !== navId) return;
    $('.card').innerHTML = `<table><tr><th></th>${PRAYERS.map(p => `<th>${t(p)}</th>`).join('')}</tr>${mo.days.map(d =>
      `<tr class="${d.d === info.n.d ? 'today' : ''}"><td>${d.d}</td>${d.t.map(x => `<td>${fmtHM(x)}</td>`).join('')}</tr>`).join('')}</table>`;
  } catch (e) { $('.card').textContent = t('fail'); }
}

// ---------- More / settings ----------
function viewMore() {
  const api = (window.NS_CONFIG || {}).BOT_API_URL;
  view.innerHTML = `<h1>${t('settings')}</h1>
    <div class="card list"><button class="item" id="fv"><span>★ ${t('favorites')}</span><span>›</span></button>
      <button class="item" id="cl"><span>📅 ${t('calendar')}</span><span>›</span></button></div>
    <div class="card">
      <div class="field"><label>${t('city')}: <b>${esc(S.loc.name)}</b></label>
        <div class="row"><input id="cq" placeholder="${t('search')}" style="flex:1"><button class="btn" id="cs">🔎</button></div>
        <div id="cr" class="list"></div><button class="btn" id="gps">📍 ${t('useGps')}</button></div>
      <div class="field"><label>${t('method')}</label><select id="mt">${METHODS.map(m => `<option value="${m[0]}" ${m[0] === S.method ? 'selected' : ''}>${m[1]}</option>`).join('')}</select></div>
      <div class="field"><label>${t('madhab')}</label><select id="sc"><option value="0" ${S.school === 0 ? 'selected' : ''}>${t('shafii')}</option><option value="1" ${S.school === 1 ? 'selected' : ''}>${t('hanafi')}</option></select></div>
      <div class="field"><label>${t('lang')}</label><select id="lg"><option value="ru" ${S.lang === 'ru' ? 'selected' : ''}>Русский</option><option value="en" ${S.lang === 'en' ? 'selected' : ''}>English</option></select></div>
      <div class="field"><label><input type="checkbox" id="ad" ${S.adhan ? 'checked' : ''} ${api ? '' : 'disabled'}> ${t('adhanBot')}</label>${api ? '' : `<span class="hint">${t('adhanOff')}</span>`}</div>
    </div><p class="hint">${t('trademark')}</p>`;
  $('#fv').onclick = () => go('favs'); $('#cl').onclick = () => go('cal');
  const setLoc = (name, lat, lon) => { S.loc = { name, lat: +lat.toFixed(4), lon: +lon.toFixed(4) }; saveSettings(); syncBot(); viewMore(); };
  $('#cs').onclick = async () => {
    const q = $('#cq').value.trim(); if (!q) return;
    try {
      const j = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?count=5&language=${S.lang}&name=${encodeURIComponent(q)}`);
      const r = j.results || [];
      $('#cr').innerHTML = r.length ? r.map((x, i) => `<button class="item" data-i="${i}"><span>${esc(x.name)}, ${esc(x.country || '')} <span class="hint">${esc(x.admin1 || '')}</span></span></button>`).join('') : `<span class="hint">${t('notFound')}</span>`;
      $('#cr').onclick = e => { const b = e.target.closest('[data-i]'); if (b) { const x = r[+b.dataset.i]; setLoc(x.name, x.latitude, x.longitude); } };
    } catch (e) { toast(t('fail')); }
  };
  $('#gps').onclick = () => {
    if (!navigator.geolocation) return toast(t('locDenied'));
    navigator.geolocation.getCurrentPosition(p => setLoc(S.lang === 'ru' ? 'Моё место' : 'My location', p.coords.latitude, p.coords.longitude), () => toast(t('locDenied')), { timeout: 10000 });
  };
  $('#mt').onchange = e => { S.method = +e.target.value; saveSettings(); syncBot(); };
  $('#sc').onchange = e => { S.school = +e.target.value; saveSettings(); syncBot(); };
  $('#lg').onchange = e => { S.lang = e.target.value; saveSettings(); renderTabs(); viewMore(); };
  $('#ad').onchange = async e => { S.adhan = e.target.checked; saveSettings(); const ok = await syncBot(); toast(ok ? (S.adhan ? t('adhanSaved') : t('adhanStopped')) : t('fail')); };
}
async function syncBot() {
  const api = (window.NS_CONFIG || {}).BOT_API_URL;
  if (!api || !tg || !tg.initData) return false;
  try {
    const r = await fetch(api.replace(/\/$/, '') + '/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: tg.initData, enabled: !!S.adhan, lat: S.loc.lat, lon: S.loc.lon, method: S.method, school: S.school, lang: S.lang }) });
    return r.ok;
  } catch (e) { return false; }
}

// ---------- boot ----------
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
renderTabs();
cloudPull().then(() => { Object.assign(S, store.get('settings', {})); renderTabs(); go('home'); });
window.__ns = { qiblaBearing, nowIn, fmtHM, fmtHMS, S, go };
})();
