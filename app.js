/* Base Islam: prayer times, Quran, dhikr, Qibla and the 99 Names. Telegram Mini App and PWA, no build step. Pure helpers live in lib.js. */
(() => {
'use strict';
const { PRAYERS, ADHAN, TRANSLATIONS, qiblaBearing, nowIn, hm, fmtHM, fmtHMS, parseMonth, nextPrayer, splitBasmala, surahUrl, surahFromUrl, nameOfDay, esc, pool, fastingPhase, isFriday, nextRepeat, afterAyah, shiftMonth } = window.BI;
const NAMES = window.BI_NAMES || [];
const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;
const inTg = !!(tg && tg.initData);
if (tg) { try { tg.ready(); tg.expand(); } catch (e) {} }
const $ = (s, r = document) => r.querySelector(s);
const view = $('#view'), player = $('#player');
const VERSION = '2.1.0';

// ---------- i18n ----------
const I18N = {
  ru: {
    home: 'Намаз', quran: 'Коран', dhikr: 'Зикр', qibla: 'Кибла', more: 'Ещё',
    next: 'Следующий намаз', at: 'в', fajr: 'Фаджр', sunrise: 'Восход', dhuhr: 'Зухр', asr: 'Аср', maghrib: 'Магриб', isha: 'Иша',
    loading: 'Загрузка…', offline: 'Нет сети — показаны сохранённые данные', fail: 'Не удалось загрузить', retry: 'Повторить',
    failHint: 'Проверьте интернет. Время намаза на этот месяц сохранится после первой загрузки.',
    city: 'Город', search: 'Найти город', useGps: 'Моё местоположение', myPlace: 'Моё местоположение', method: 'Метод расчёта', madhab: 'Мазхаб для Асра',
    shafii: 'Шафиитский и др.', hanafi: 'Ханафитский', lang: 'Язык', calendar: 'Календарь на месяц', favorites: 'Избранное и заметки',
    settings: 'Настройки', location: 'Местоположение', prayerSet: 'Расчёт времени', look: 'Оформление', theme: 'Тема', auto: 'Авто', light: 'Светлая', dark: 'Тёмная',
    adhanBot: 'Азан сообщением от бота', adhanOff: 'Бот азана не подключён', adhanSaved: 'Азан включён', adhanStopped: 'Азан выключен',
    surahs: 'Суры', searchSurah: 'Название или номер суры', resume: 'Продолжить чтение', ayah: 'Аят', ayahs: 'аятов', reciter: 'Чтец',
    meccan: 'Мекканская', medinan: 'Мединская',
    play: 'Слушать', pause: 'Пауза', fav: 'В избранное', unfav: 'Убрать из избранного', note: 'Заметка', share: 'Поделиться', copy: 'Копировать',
    copied: 'Скопировано', notePh: 'Ваша заметка к аяту', save: 'Сохранить', cancel: 'Отмена', del: 'Удалить', empty: 'Пока пусто',
    emptyFav: 'Отмечайте аяты звёздочкой или добавляйте заметки во время чтения — они появятся здесь.',
    smaller: 'Меньше', bigger: 'Больше', back: 'Назад', reset: 'Сбросить', goal: 'из', done: 'Цель достигнута. Да примет Аллах.',
    offlineTitle: 'Чтение без интернета', dlAll: 'Скачать весь Коран', dlSize: 'Арабский текст, перевод и транслитерация, ≈ 6 МБ',
    dlNow: 'Скачивание', dlDone: 'Весь Коран доступен офлайн', dlSome: 'Сохранено сур', dlFail: 'Не удалось скачать сур', savedOff: 'Сохранено офлайн',
    audioNet: 'Аудио работает только при подключении к интернету',
    qiblaDir: 'Направление на Каабу', degrees: 'от севера по часовой стрелке', compassOn: 'Включить компас', compassHint: 'Держите телефон горизонтально. Стрелка покажет направление на Каабу.',
    noSensor: 'Компас недоступен на этом устройстве. Найдите север и отложите указанный угол по часовой стрелке.',
    locDenied: 'Нет доступа к геолокации. Выберите город вручную.', notFound: 'Ничего не найдено',
    setCity: 'Укажите свой город', setCityHint: 'Сейчас время показано для Мекки. Выберите город или включите геолокацию.',
    names: '99 имён Аллаха', namesSub: 'Аль-Асма уль-Хусна', nameDay: 'Имя дня', searchName: 'Поиск по имени или значению',
    data: 'Данные: Aladhan, alquran.cloud, islamic.network, Open-Meteo', version: 'Версия',
    months: ['Мухаррам', 'Сафар', 'Раби аль-авваль', 'Раби ас-сани', 'Джумада аль-уля', 'Джумада ас-сания', 'Раджаб', 'Шаабан', 'Рамадан', 'Шавваль', 'Зуль-каада', 'Зуль-хиджа'],
    ah: 'г. х.', day: 'День',
    jumuah: 'Джума', fast: 'Пост', suhoorEnds: 'Сухур до', iftarAt: 'Ифтар в', untilSuhoor: 'До конца сухура', untilIftar: 'До ифтара', fastDone: 'Пост на сегодня завершён. Да примет Аллах.',
    whiteDays: 'Белые дни (13–15 числа) — желательно держать пост', prevMonth: 'Предыдущий месяц', nextMonth: 'Следующий месяц',
    repeat: 'Повтор аята', repeatOnce: 'Без повтора', repeatLoop: 'Повторять без конца', goAyah: 'Аят №', go: 'Перейти',
    tasbih: 'Тасбих после намаза: 33 + 33 + 34 подряд', todayCount: 'Сегодня', next2: 'Дальше',
  },
  en: {
    home: 'Prayer', quran: 'Quran', dhikr: 'Dhikr', qibla: 'Qibla', more: 'More',
    next: 'Next prayer', at: 'at', fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
    loading: 'Loading…', offline: 'Offline — showing saved data', fail: 'Could not load', retry: 'Try again',
    failHint: 'Check your connection. This month’s prayer times are kept after the first load.',
    city: 'City', search: 'Find a city', useGps: 'Use my location', myPlace: 'My location', method: 'Calculation method', madhab: 'Madhab for Asr',
    shafii: 'Shafi’i and others', hanafi: 'Hanafi', lang: 'Language', calendar: 'Monthly timetable', favorites: 'Bookmarks and notes',
    settings: 'Settings', location: 'Location', prayerSet: 'Prayer times', look: 'Appearance', theme: 'Theme', auto: 'Auto', light: 'Light', dark: 'Dark',
    adhanBot: 'Adhan message from the bot', adhanOff: 'Adhan bot is not connected', adhanSaved: 'Adhan enabled', adhanStopped: 'Adhan disabled',
    surahs: 'Surahs', searchSurah: 'Surah name or number', resume: 'Continue reading', ayah: 'Ayah', ayahs: 'ayahs', reciter: 'Reciter',
    meccan: 'Meccan', medinan: 'Medinan',
    play: 'Play', pause: 'Pause', fav: 'Bookmark', unfav: 'Remove bookmark', note: 'Note', share: 'Share', copy: 'Copy',
    copied: 'Copied', notePh: 'Your note for this ayah', save: 'Save', cancel: 'Cancel', del: 'Delete', empty: 'Nothing yet',
    emptyFav: 'Bookmark ayahs with the star or add notes while reading — they will appear here.',
    smaller: 'Smaller', bigger: 'Larger', back: 'Back', reset: 'Reset', goal: 'of', done: 'Goal reached. May Allah accept it.',
    offlineTitle: 'Read without internet', dlAll: 'Download the whole Quran', dlSize: 'Arabic, translation and transliteration, ≈ 6 MB',
    dlNow: 'Downloading', dlDone: 'The whole Quran is available offline', dlSome: 'Surahs saved', dlFail: 'Could not download surahs', savedOff: 'Saved offline',
    audioNet: 'Audio needs an internet connection',
    qiblaDir: 'Direction to the Kaaba', degrees: 'clockwise from north', compassOn: 'Enable compass', compassHint: 'Hold the phone flat. The arrow points to the Kaaba.',
    noSensor: 'No compass on this device. Find north and turn clockwise by the angle shown.',
    locDenied: 'Location access denied. Pick a city manually.', notFound: 'Nothing found',
    setCity: 'Set your city', setCityHint: 'Times are shown for Makkah. Pick your city or use your location.',
    names: '99 Names of Allah', namesSub: 'Al-Asma ul-Husna', nameDay: 'Name of the day', searchName: 'Search by name or meaning',
    data: 'Data: Aladhan, alquran.cloud, islamic.network, Open-Meteo', version: 'Version',
    months: ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhul-Qadah', 'Dhul-Hijjah'],
    ah: 'AH', day: 'Day',
    jumuah: 'Jumuah', fast: 'Fasting', suhoorEnds: 'Suhoor ends', iftarAt: 'Iftar at', untilSuhoor: 'Suhoor ends in', untilIftar: 'Iftar in', fastDone: 'Today’s fast is complete. May Allah accept it.',
    whiteDays: 'The White Days (13th–15th): fasting is recommended', prevMonth: 'Previous month', nextMonth: 'Next month',
    repeat: 'Repeat ayah', repeatOnce: 'No repeat', repeatLoop: 'Repeat forever', goAyah: 'Ayah #', go: 'Go',
    tasbih: 'After-prayer tasbih: 33 + 33 + 34 in a row', todayCount: 'Today', next2: 'Next',
  },
};
const METHODS = [[3, 'Muslim World League'], [14, 'ДУМ России / Spiritual Admin. of Muslims of Russia'], [13, 'Diyanet (Türkiye)'], [2, 'ISNA (North America)'],
  [4, 'Umm al-Qura (Makkah)'], [5, 'Egyptian General Authority'], [1, 'Karachi (Univ. of Islamic Sciences)'], [0, 'Jafari (Shia Ithna-Ashari)']];
// [id, name, kbps]: bitrates verified against the audio CDN (some reciters only exist at 64).
const RECITERS = [['ar.alafasy', 'Mishary Alafasy', 128], ['ar.husary', 'Mahmoud Khalil Al-Husary', 128], ['ar.abdulsamad', 'Abdul Basit Abdul Samad', 64],
  ['ar.abdurrahmaansudais', 'Abdurrahman As-Sudais', 64], ['ar.mahermuaiqly', 'Maher Al-Muaiqly', 128]];
// [arabic, transliteration, ru, en, goal]
const DHIKR = [['سبحان الله', 'Subhanallah', 'Пречист Аллах', 'Glory be to Allah', 33], ['الحمد لله', 'Alhamdulillah', 'Хвала Аллаху', 'All praise is due to Allah', 33],
  ['الله أكبر', 'Allahu akbar', 'Аллах велик', 'Allah is the Greatest', 34], ['لا إله إلا الله', 'La ilaha illallah', 'Нет божества, кроме Аллаха', 'There is no god but Allah', 100],
  ['أستغفر الله', 'Astaghfirullah', 'Прошу прощения у Аллаха', 'I seek Allah’s forgiveness', 100]];
const ICON = {
  pin: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
  back: '<svg class="ico" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  play: '<svg class="ico" viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z"/></svg>',
  pause: '<svg class="ico" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
  star: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  note: '<svg class="ico" viewBox="0 0 24 24"><path d="M5 4.5h10l4 4v11H5z"/><path d="M8.5 12h7M8.5 15.5h5"/></svg>',
  share: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4M5.5 13v6.5h13V13"/></svg>',
  copy: '<svg class="ico" viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V5.5a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3"/></svg>',
  down: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/></svg>',
  check: '<svg class="ico" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  search: '<svg class="ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
  cal: '<svg class="ico" viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>',
  star8: '<svg class="ico" viewBox="-12 -12 24 24"><rect x="-6.5" y="-6.5" width="13" height="13"/><rect x="-6.5" y="-6.5" width="13" height="13" transform="rotate(45)"/></svg>',
};

// ---------- storage (localStorage + Telegram CloudStorage) ----------
// The "ns:" prefix and cache names come from the app's previous name; they stay so existing users keep their data.
const KEY = 'ns:', DATA_CACHE = 'ns-data-v1';
const cloud = inTg && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9') ? tg.CloudStorage : null;
const store = {
  get(k, d) { try { const v = localStorage.getItem(KEY + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) {
    const s = JSON.stringify(v);
    try { localStorage.setItem(KEY + k, s); } catch (e) { /* quota or blocked */ }
    if (cloud && s.length < 3900 && /^(settings|pos|dhikr|favs|n_)/.test(k)) { try { cloud.setItem(k.slice(0, 128), s); } catch (e) {} }
  },
  del(k) { try { localStorage.removeItem(KEY + k); } catch (e) {} if (cloud) { try { cloud.removeItem(k); } catch (e) {} } },
  keys(prefix) { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(KEY + prefix)) out.push(k.slice(KEY.length)); } } catch (e) {} return out; },
};
function cloudPull() {
  return new Promise(res => {
    if (!cloud) return res();
    const done = setTimeout(res, 2500); // never block start-up on a slow CloudStorage
    try {
      cloud.getKeys((e, keys) => {
        if (e || !keys || !keys.length) { clearTimeout(done); return res(); }
        cloud.getItems(keys.slice(0, 100), (e2, items) => {
          if (!e2 && items) for (const k of Object.keys(items)) {
            try { if (localStorage.getItem(KEY + k) == null && items[k]) localStorage.setItem(KEY + k, items[k]); } catch (x) {}
          }
          clearTimeout(done); res();
        });
      });
    } catch (e) { clearTimeout(done); res(); }
  });
}

// ---------- state ----------
const defaults = { lang: 'ru', method: 3, school: 0, size: 28, reciter: 'ar.alafasy', adhan: false, theme: 'auto', repeat: 1,
  loc: { name: 'Makkah', lat: 21.4225, lon: 39.8262 } };
const S = Object.assign({}, defaults, store.get('settings', {}));
if (S.locSet === undefined) S.locSet = !['Mecca', 'Makkah'].includes(S.loc && S.loc.name); // the old version saved its Mecca default too
const fixSettings = () => { if (![1, 3, 5, 0].includes(S.repeat)) S.repeat = 1; if (!I18N[S.lang]) S.lang = 'ru'; if (!['auto', 'light', 'dark'].includes(S.theme)) S.theme = 'auto'; };
fixSettings();
const t = k => (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k;
const saveSettings = () => store.set('settings', S);
let toastTimer;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2200); }
function haptic(kind = 'light') { try { if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(kind); else if (navigator.vibrate) navigator.vibrate(kind === 'heavy' ? 30 : 8); } catch (e) {} }
function debounce(fn, ms) { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; }

// ---------- theme ----------
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const dark = S.theme === 'dark' || (S.theme === 'auto' && (inTg ? tg.colorScheme === 'dark' : darkMQ.matches));
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.lang = S.lang;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelectorAll('meta[name=theme-color]').forEach(m => { m.content = bg; });
  if (inTg) { try { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); if (tg.setBottomBarColor) tg.setBottomBarColor(bg); } catch (e) {} }
}
darkMQ.addEventListener && darkMQ.addEventListener('change', applyTheme);
if (tg && tg.onEvent) tg.onEvent('themeChanged', applyTheme);

// ---------- network ----------
async function fetchT(url, ms = 12000, opts = {}) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const h = ctl && setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, Object.assign({ signal: ctl && ctl.signal }, opts)); } finally { clearTimeout(h); }
}
// JSON with a timeout and one retry on network errors and 5xx.
async function getJSON(url, tries = 2) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetchT(url);
      if (r.status >= 500 && i + 1 < tries) throw new Error('HTTP ' + r.status);
      if (!r.ok) { const e = new Error('HTTP ' + r.status); e.final = true; throw e; }
      return await r.json();
    } catch (e) {
      if (e.final || i + 1 >= tries) throw e;
      await new Promise(res => setTimeout(res, 700));
    }
  }
}
const hasCaches = typeof caches !== 'undefined' && window.isSecureContext;
// Cache-first JSON for data that never changes (Quran text). Works offline once saved.
// Retries rate limits (the API allows ~12 requests a second), server errors and network errors with growing pauses.
async function cachedJSON(url, tries = 3) {
  if (hasCaches) {
    try { const hit = await (await caches.open(DATA_CACHE)).match(url); if (hit) return await hit.json(); } catch (e) {}
  }
  for (let i = 0; ; i++) {
    let r;
    try { r = await fetchT(url, 20000); } catch (e) { if (i + 1 >= tries) throw e; }
    if (r && r.ok) {
      if (hasCaches) { try { await (await caches.open(DATA_CACHE)).put(url, r.clone()); } catch (e) {} }
      return r.json();
    }
    if (r && r.status !== 429 && r.status < 500) throw new Error('HTTP ' + r.status);
    if (i + 1 >= tries) throw new Error('HTTP ' + (r ? r.status : 'network'));
    await new Promise(res => setTimeout(res, 1000 * (i + 1) + Math.random() * 500));
  }
}
function netBanner() { const el = $('#net'); el.textContent = t('offline'); el.hidden = navigator.onLine !== false; }
window.addEventListener('online', netBanner); window.addEventListener('offline', netBanner);
const skeleton = n => Array.from({ length: n }, (_, i) => `<div class="skel" style="width:${90 - (i % 3) * 18}%"></div>`).join('');
function failState(el, retry) {
  el.innerHTML = `<div class="card state"><b>${t('fail')}</b><p>${t('failHint')}</p><button class="btn primary" data-retry>${t('retry')}</button></div>`;
  el.querySelector('[data-retry]').onclick = retry;
}

// ---------- prayer times ----------
function calKey(y, m) { return `cal:${S.loc.lat.toFixed(2)},${S.loc.lon.toFixed(2)}:${S.method}:${S.school}:${y}-${m}`; }
async function month(y, m) {
  const key = calKey(y, m);
  const hit = store.get(key);
  if (hit && hit.days && hit.days[0] && typeof hit.days[0].hijri === 'object') return hit;
  const j = await getJSON(`https://api.aladhan.com/v1/calendar/${y}/${m}?latitude=${S.loc.lat}&longitude=${S.loc.lon}&method=${S.method}&school=${S.school}`);
  const out = parseMonth(j);
  store.set(key, out);
  evictOldCalendars(key);
  return out;
}
function evictOldCalendars(keep) {
  const keys = store.keys('cal:').filter(k => k !== keep);
  keys.slice(0, Math.max(0, keys.length - 6)).forEach(k => { try { localStorage.removeItem(KEY + k); } catch (e) {} });
}
const addDays = (n, k) => { const d = new Date(Date.UTC(n.y, n.m - 1, n.d + k)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };
async function today() {
  // The city's time zone is only known after the first fetch, so start from the device zone and correct it.
  let n = nowIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
  let mo = await month(n.y, n.m);
  const local = nowIn(mo.tz);
  if (local.y !== n.y || local.m !== n.m) mo = await month(local.y, local.m);
  n = local;
  const day = mo.days.find(x => x.d === n.d) || mo.days[0];
  const nx = addDays(n, 1);
  let tomorrow = day;
  try { const tm = nx.m === n.m ? mo : await month(nx.y, nx.m); tomorrow = tm.days.find(x => x.d === nx.d) || day; } catch (e) { /* offline at month end: reuse today's Fajr */ }
  // Keep next month ready for offline use.
  if (n.d >= 20 && nx.m === n.m) { const nm = addDays({ y: n.y, m: n.m, d: 1 }, 32); month(nm.y, nm.m).catch(() => {}); }
  return { tz: mo.tz, day, tomorrow, n };
}
const hijriStr = h => `${h.d} ${t('months')[h.m - 1] || ''} ${h.y} ${t('ah')}`;
const gregStr = n => { try { return new Intl.DateTimeFormat(S.lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(n.y, n.m - 1, n.d))); } catch (e) { return `${n.d}.${n.m}.${n.y}`; } };

// ---------- shell ----------
let tab = 'home', navId = 0, cleanups = [];
const onLeave = fn => cleanups.push(fn);
function renderTabs() {
  document.querySelectorAll('#tabs button').forEach(b => { b.querySelector('span').textContent = t(b.dataset.tab); b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'); });
}
const VIEWS = {};
const PARENT = { reader: 'quran', favs: 'more', cal: 'more', names: 'more' };
let backTo = null;
function go(name, arg) {
  cleanups.forEach(f => { try { f(); } catch (e) {} }); cleanups = [];
  navId++;
  tab = { reader: 'quran', favs: 'more', cal: 'more', names: 'more' }[name] || name;
  renderTabs(); window.scrollTo(0, 0);
  backTo = PARENT[name] ? (arg && arg.from) || PARENT[name] : null;
  if (tg && tg.BackButton) { try { backTo ? tg.BackButton.show() : tg.BackButton.hide(); } catch (e) {} }
  (VIEWS[name] || VIEWS.home)(arg || {});
}
if (tg && tg.BackButton) tg.BackButton.onClick(() => backTo && go(backTo));
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
const topBar = (title, extra = '') => `<div class="top">${inTg ? '' : `<button class="btn icon ghost" data-back aria-label="${t('back')}">${ICON.back}</button>`}<h1>${title}</h1>${extra}</div>`;
function wireBack() { const b = $('[data-back]'); if (b) b.onclick = () => go(backTo || 'home'); }

// ---------- Home ----------
VIEWS.home = async function viewHome() {
  const id = navId;
  view.innerHTML = `<div class="hero"><button class="loc">${ICON.pin}${esc(S.loc.name)}</button><div class="label">${t('next')}</div><div class="name">&nbsp;</div><div class="big">--:--:--</div></div><div class="card">${skeleton(6)}</div>`;
  let info;
  try { info = await today(); } catch (e) {
    if (id !== navId) return;
    view.innerHTML = `<h1>${esc(S.loc.name)}</h1><div id="err"></div>`;
    return failState($('#err'), () => go('home'));
  }
  if (id !== navId) return;
  let shownNext = -1, shownDay = info.n.d;
  const draw = () => {
    const secs = nowIn(info.tz).secs, np = nextPrayer(info.day.t, info.tomorrow.t, secs);
    shownNext = np.i;
    const nextTime = np.tomorrow ? info.tomorrow.t[0] : info.day.t[np.i];
    const fri = isFriday(info.n.y, info.n.m, info.n.d), pname = i => (i === 2 && fri ? t('jumuah') : t(PRAYERS[i]));
    const rows = PRAYERS.map((p, i) => {
      const cls = i === 1 ? 'sun' : i === np.i && !np.tomorrow ? 'next' : info.day.t[i] <= secs ? 'past' : '';
      return `<div class="prayer ${cls}"><span>${pname(i)}</span><span class="t">${fmtHM(info.day.t[i])}</span></div>`;
    }).join('');
    const h = info.day.hijri;
    let fast = '';
    if (h.m === 9) {
      const f = fastingPhase(info.day.t, secs);
      fast = `<div class="card fast"><div class="fast-top"><b>${t('fast')} · ${esc(hijriStr(h))}</b></div>
        <div class="fast-row"><span>${t('suhoorEnds')} <b>${fmtHM(info.day.t[0])}</b></span><span>${t('iftarAt')} <b>${fmtHM(info.day.t[4])}</b></span></div>
        <div class="fast-left">${f.phase === 'done' ? t('fastDone') : `${t(f.phase === 'suhoor' ? 'untilSuhoor' : 'untilIftar')}: <b id="fl">${fmtHMS(f.left)}</b>`}</div></div>`;
    } else if (h.d >= 12 && h.d <= 15) fast = `<div class="card fast hint">${t('whiteDays')}</div>`;
    const nm = NAMES[nameOfDay(info.n.y, info.n.m, info.n.d)];
    view.innerHTML = `<div class="hero">
        <button class="loc" id="loc">${ICON.pin}${esc(S.loc.name)}</button>
        <div class="label">${t('next')}</div>
        <div class="name">${np.tomorrow ? t(PRAYERS[0]) : pname(np.i)} · ${t('at')} ${fmtHM(nextTime)}</div>
        <div class="big" id="cd" role="timer">${fmtHMS(np.left)}</div>
        <div class="dates"><span>${esc(gregStr(info.n))}</span><span>${esc(hijriStr(info.day.hijri))}</span></div>
      </div>
      ${S.locSet ? '' : `<button class="card item" id="setc" style="padding:14px 16px"><span class="ok">${ICON.pin}</span><span class="grow"><b>${t('setCity')}</b><span class="sub">${t('setCityHint')}</span></span><span class="chev">›</span></button>`}
      ${fast}<div class="card prayers">${rows}</div>
      ${nm ? `<h2>${t('nameDay')}</h2><button class="card daily" id="nd"><span class="ar">${nm[0]}</span><span class="grow"><b>${esc(nm[1])}</b><span class="sub hint">${esc(S.lang === 'ru' ? nm[3] : nm[2])}</span></span><span class="chev">›</span></button>` : ''}`;
    $('#loc').onclick = () => go('more');
    if ($('#setc')) $('#setc').onclick = () => go('more');
    if ($('#nd')) $('#nd').onclick = () => go('names', { from: 'home' });
  };
  draw();
  const timer = setInterval(() => {
    const n = nowIn(info.tz);
    if (n.d !== shownDay) { clearInterval(timer); return go('home'); } // new day: reload times
    const np = nextPrayer(info.day.t, info.tomorrow.t, n.secs);
    if (np.i !== shownNext) return draw();
    const el = $('#cd'); if (el) el.textContent = fmtHMS(np.left);
    const fl = $('#fl'); if (fl) { const f = fastingPhase(info.day.t, n.secs); if (f.phase === 'done') return draw(); fl.textContent = fmtHMS(f.left); }
  }, 1000);
  onLeave(() => clearInterval(timer));
  // Returning to the app after a long pause: refresh immediately instead of waiting for the next tick.
  const vis = () => { if (document.visibilityState === 'visible') draw(); };
  document.addEventListener('visibilitychange', vis); onLeave(() => document.removeEventListener('visibilitychange', vis));
};

// ---------- Quran ----------
let surahList = null;
async function getSurahs() { if (!surahList) surahList = (await cachedJSON('https://api.alquran.cloud/v1/surah')).data; return surahList; }
async function savedSurahs() {
  if (!hasCaches) return new Set();
  try { const keys = await (await caches.open(DATA_CACHE)).keys(); return new Set(keys.map(r => surahFromUrl(r.url, S.lang)).filter(Boolean)); } catch (e) { return new Set(); }
}
const dl = { running: false, done: 0, total: 0 };
async function downloadAll() {
  if (dl.running) return;
  const have = await savedSurahs();
  const todo = Array.from({ length: 114 }, (_, i) => i + 1).filter(n => !have.has(n));
  Object.assign(dl, { running: true, done: 0, total: todo.length });
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  const failed = await pool(todo, 2, n => cachedJSON(surahUrl(n, S.lang), 5), done => { dl.done = done; paintDl(); });
  dl.running = false;
  if (failed.length) toast(`${t('dlFail')}: ${failed.length}`); else toast(t('dlDone'));
  if (tab === 'quran' && $('#sl')) VIEWS.quran();
}
function paintDl() { const b = $('#dlbar'), l = $('#dllabel'); if (b) b.style.width = (dl.total ? dl.done / dl.total * 100 : 0) + '%'; if (l) l.textContent = `${t('dlNow')}: ${dl.done} / ${dl.total}`; }
VIEWS.quran = async function viewQuran() {
  const id = navId;
  view.innerHTML = `<h1>${t('quran')}</h1><div class="card">${skeleton(8)}</div>`;
  let list;
  try { list = await getSurahs(); } catch (e) { if (id === navId) failState(view.querySelector('.card'), () => go('quran')); return; }
  const saved = await savedSurahs();
  if (id !== navId) return;
  const pos = store.get('pos');
  const resume = pos && list[pos.s - 1] ? `<button class="card item" id="resume" style="padding:14px 16px"><span class="grow"><span class="sub">${t('resume')}</span><b>${esc(list[pos.s - 1].englishName)}</b> · ${t('ayah')} ${pos.a}</span><span class="chev">›</span></button>` : '';
  const all = saved.size >= 114;
  const offline = !hasCaches ? '' : all
    ? `<div class="card dl"><span class="ok">${ICON.check}</span><span class="grow">${t('dlDone')}</span></div>`
    : `<div class="card"><div class="dl"><span class="grow"><b>${t('dlAll')}</b><span class="sub hint" id="dllabel">${dl.running ? '' : `${t('dlSize')}${saved.size ? ` · ${t('dlSome')}: ${saved.size}` : ''}`}</span></span>
        <button class="btn primary icon" id="dlb" aria-label="${t('dlAll')}" ${dl.running ? 'disabled' : ''}>${ICON.down}</button></div>${dl.running ? '<div class="bar"><i id="dlbar"></i></div>' : ''}</div>`;
  view.innerHTML = `<h1>${t('quran')}</h1>${resume}${offline}
    <div class="field" style="margin:4px 0 12px"><input type="search" id="q" placeholder="${t('searchSurah')}" autocomplete="off" aria-label="${t('searchSurah')}"></div>
    <div class="card list" id="sl"></div>`;
  if (dl.running) paintDl();
  const fill = f => {
    const rows = list.filter(s => !f || `${s.number} ${s.englishName} ${s.englishNameTranslation} ${s.name}`.toLowerCase().includes(f));
    $('#sl').innerHTML = rows.length ? rows.map(s => `<button class="item surah" data-s="${s.number}"><span class="num"><span>${s.number}</span></span>
        <span class="grow"><b>${esc(s.englishName)}</b><span class="sub">${t(s.revelationType === 'Meccan' ? 'meccan' : 'medinan')} · ${s.numberOfAyahs} ${t('ayahs')}${saved.has(s.number) && !all ? ' · ✓' : ''}</span></span>
        <span class="ar">${esc(s.name.replace('سُورَةُ', '').trim())}</span></button>`).join('') : `<div class="state hint">${t('notFound')}</div>`;
  };
  fill('');
  $('#q').addEventListener('input', e => fill(e.target.value.trim().toLowerCase()));
  $('#sl').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) go('reader', { s: +b.dataset.s }); });
  if ($('#resume')) $('#resume').onclick = () => go('reader', { s: pos.s, a: pos.a });
  if ($('#dlb')) $('#dlb').onclick = () => { downloadAll(); VIEWS.quran(); };
};
async function loadSurah(n) {
  const j = await cachedJSON(surahUrl(n, S.lang));
  const [ar, tl, tlit] = j.data;
  return ar.ayahs.map((a, i) => {
    const b = splitBasmala(a.text, n, a.numberInSurah);
    return { n: a.number, a: a.numberInSurah, ar: b.text || a.text, basmala: b.basmala, tr: tl.ayahs[i].text, tlit: tlit.ayahs[i].text };
  });
}
const favs = () => new Set(store.get('favs', []));

// Audio: one queue for the whole app, so recitation continues while browsing.
const audio = { s: 0, list: null, i: -1, title: '', played: 0 };
function markPlaying() {
  document.querySelectorAll('.ayah.playing').forEach(e => e.classList.remove('playing'));
  const pb = $('#pp'); if (pb) { pb.innerHTML = player.paused ? ICON.play : ICON.pause; pb.setAttribute('aria-label', t(player.paused ? 'play' : 'pause')); }
  if (!audio.list || audio.i < 0 || player.paused) return;
  const el = view.querySelector(`.ayah[data-s="${audio.s}"][data-a="${audio.list[audio.i].a}"]`);
  if (el) { el.classList.add('playing'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
}
function playAt(i) {
  if (!audio.list || i >= audio.list.length) { audio.i = -1; markPlaying(); return; }
  if (i !== audio.i) audio.played = 0;
  audio.i = i;
  const rc = RECITERS.find(r => r[0] === S.reciter) || RECITERS[0];
  player.src = `https://cdn.islamic.network/quran/audio/${rc[2]}/${rc[0]}/${audio.list[i].n}.mp3`;
  player.play().catch(() => toast(navigator.onLine === false ? t('audioNet') : t('fail')));
  if ('mediaSession' in navigator) {
    try { navigator.mediaSession.metadata = new MediaMetadata({ title: `${audio.title} ${audio.s}:${audio.list[i].a}`, artist: rc[1], album: 'Base Islam', artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }] }); } catch (e) {}
  }
}
player.addEventListener('ended', () => {
  audio.played++;
  if (afterAyah(S.repeat, audio.played) === 'again') { player.currentTime = 0; player.play().catch(() => {}); } else playAt(audio.i + 1);
});
const repeatLabel = () => S.repeat === 1 ? '1×' : S.repeat === 0 ? '∞' : S.repeat + '×';
const repeatTitle = () => S.repeat === 1 ? t('repeatOnce') : S.repeat === 0 ? t('repeatLoop') : `${t('repeat')}: ${S.repeat}`;
player.addEventListener('play', markPlaying); player.addEventListener('pause', markPlaying);
player.addEventListener('error', () => { if (player.getAttribute('src')) { toast(navigator.onLine === false ? t('audioNet') : t('fail')); markPlaying(); } });
if ('mediaSession' in navigator) {
  try {
    navigator.mediaSession.setActionHandler('nexttrack', () => playAt(audio.i + 1));
    navigator.mediaSession.setActionHandler('previoustrack', () => playAt(Math.max(0, audio.i - 1)));
  } catch (e) {}
}

VIEWS.reader = async function viewReader({ s, a }) {
  const id = navId;
  view.style.setProperty('--arsize', S.size + 'px');
  view.innerHTML = `${topBar(t('loading'))}<div class="card">${skeleton(10)}</div>`;
  wireBack();
  let ayahs, meta;
  try { [ayahs, meta] = await Promise.all([loadSurah(s), getSurahs()]); } catch (e) { if (id === navId) failState(view.querySelector('.card'), () => go('reader', { s, a })); return; }
  if (id !== navId) return;
  const m = meta[s - 1], fv = favs();
  const ayahHtml = x => {
    const key = s + ':' + x.a, note = store.get('n_' + key);
    return `${x.basmala ? `<div class="basmala">${esc(x.basmala)}</div>` : ''}<div class="ayah" id="a${x.a}" data-s="${s}" data-a="${x.a}">
      <div class="ar">${esc(x.ar)}<span class="end">${x.a}</span></div>
      <div class="tl">${esc(x.tlit)}</div><div class="tr">${esc(x.tr)}</div>
      <div class="note" ${note ? '' : 'hidden'}>${esc(note || '')}</div>
      <div class="acts">
        <button data-act="play" aria-label="${t('play')}">${ICON.play}</button>
        <button data-act="fav" class="${fv.has(key) ? 'on' : ''}" aria-label="${t(fv.has(key) ? 'unfav' : 'fav')}" aria-pressed="${fv.has(key)}">${ICON.star}</button>
        <button data-act="note" aria-label="${t('note')}">${ICON.note}</button>
        <button data-act="share" aria-label="${t('share')}">${ICON.share}</button>
        <button data-act="copy" aria-label="${t('copy')}">${ICON.copy}</button>
      </div></div>`;
  };
  view.innerHTML = `${topBar(`${s}. ${esc(m.englishName)}`)}
    <div class="surah-head"><div class="ar">${esc(m.name)}</div><div class="hint">${esc(m.englishNameTranslation)} · ${t(m.revelationType === 'Meccan' ? 'meccan' : 'medinan')} · ${m.numberOfAyahs} ${t('ayahs')}</div>
      ${m.numberOfAyahs > 7 ? `<form class="goayah" id="ga"><input type="number" inputmode="numeric" min="1" max="${m.numberOfAyahs}" placeholder="${t('goAyah')}" aria-label="${t('goAyah')}"><button class="btn small">${t('go')}</button></form>` : ''}</div>
    <div id="ay">${ayahs.map(ayahHtml).join('')}</div><div class="reader-pad"></div>
    <div id="playbar"><button class="btn primary icon" id="pp" aria-label="${t('play')}">${ICON.play}</button>
      <select id="rc" aria-label="${t('reciter')}">${RECITERS.map(r => `<option value="${r[0]}" ${r[0] === S.reciter ? 'selected' : ''}>${r[1]}</option>`).join('')}</select>
      <button class="btn icon rep${S.repeat === 1 ? '' : ' on'}" id="rp" aria-label="${repeatTitle()}" title="${repeatTitle()}">${repeatLabel()}</button>
      <span class="size"><button class="btn icon" id="fsm" aria-label="${t('smaller')}">A−</button><button class="btn icon" id="fsp" aria-label="${t('bigger')}">A+</button></span></div>`;
  wireBack();
  markPlaying();
  $('#rc').onchange = e => { S.reciter = e.target.value; saveSettings(); if (audio.s === s && !player.paused) playAt(audio.i); };
  const size = d => { S.size = Math.min(44, Math.max(20, S.size + d)); view.style.setProperty('--arsize', S.size + 'px'); saveSettings(); };
  $('#fsm').onclick = () => size(-2); $('#fsp').onclick = () => size(2);
  $('#rp').onclick = () => { S.repeat = nextRepeat(S.repeat); saveSettings(); const b = $('#rp'); b.textContent = repeatLabel(); b.classList.toggle('on', S.repeat !== 1); b.setAttribute('aria-label', repeatTitle()); b.title = repeatTitle(); toast(repeatTitle()); haptic(); };
  if ($('#ga')) $('#ga').onsubmit = e => { e.preventDefault(); const inp = e.target.querySelector('input'), n = +inp.value, el = $('#a' + n); if (el) { el.scrollIntoView({ block: 'start' }); inp.value = ''; inp.blur(); } };
  let lastSeen = a || 1;
  $('#pp').onclick = () => {
    if (audio.s === s && audio.i >= 0 && player.getAttribute('src')) { player.paused ? player.play().catch(() => toast(t('audioNet'))) : player.pause(); return; }
    Object.assign(audio, { s, list: ayahs, title: m.englishName }); playAt(Math.max(0, ayahs.findIndex(x => x.a === lastSeen)));
  };
  const ay = $('#ay');
  ay.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const box = b.closest('.ayah'), n = +box.dataset.a, x = ayahs.find(y => y.a === n), key = s + ':' + n;
    const act = b.dataset.act;
    if (act === 'play') {
      if (audio.s === s && audio.list && audio.list[audio.i] && audio.list[audio.i].a === n && !player.paused) return player.pause();
      Object.assign(audio, { s, list: ayahs, title: m.englishName }); playAt(ayahs.indexOf(x));
    } else if (act === 'fav') {
      const f = favs(); f.has(key) ? f.delete(key) : f.add(key); store.set('favs', [...f]);
      const on = f.has(key); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', t(on ? 'unfav' : 'fav')); haptic();
    } else if (act === 'note') {
      if (box.querySelector('.noteform')) return;
      const nb = box.querySelector('.note');
      const form = document.createElement('div'); form.className = 'noteform';
      form.innerHTML = `<textarea maxlength="1500" placeholder="${t('notePh')}" aria-label="${t('notePh')}"></textarea><div class="row">${store.get('n_' + key) ? `<button class="btn small" data-n="del">${t('del')}</button>` : ''}<button class="btn small" data-n="cancel">${t('cancel')}</button><button class="btn small primary" data-n="save">${t('save')}</button></div>`;
      form.querySelector('textarea').value = store.get('n_' + key, '');
      box.querySelector('.acts').before(form); nb.hidden = true; form.querySelector('textarea').focus();
      form.onclick = ev => {
        const k = ev.target.closest('[data-n]'); if (!k) return;
        let v = k.dataset.n === 'save' ? form.querySelector('textarea').value.trim() : k.dataset.n === 'del' ? '' : null;
        if (v !== null) { v ? store.set('n_' + key, v) : store.del('n_' + key); }
        const cur = store.get('n_' + key); nb.textContent = cur || ''; nb.hidden = !cur; form.remove();
      };
    } else {
      const text = `${x.ar}\n\n${x.tr}\n\n— ${m.englishName} ${s}:${n}`;
      if (act === 'copy') (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast(t('copied')), () => toast(t('fail')));
      else if (navigator.share && !inTg) navigator.share({ text }).catch(() => {});
      else { const u = 'https://t.me/share/url?url=' + encodeURIComponent(' ') + '&text=' + encodeURIComponent(text); inTg && tg.openTelegramLink ? tg.openTelegramLink(u) : window.open(u, '_blank'); }
    }
  });
  // Remember the reading position (debounced: CloudStorage has rate limits).
  const savePos = debounce(n => store.set('pos', { s, a: n }), 800);
  const seen = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { lastSeen = +en.target.dataset.a; savePos(lastSeen); } }), { rootMargin: '-35% 0px -55% 0px' });
  ay.querySelectorAll('.ayah').forEach(el => seen.observe(el));
  onLeave(() => seen.disconnect());
  if (a > 1) { const el = $('#a' + a); if (el) el.scrollIntoView(); }
};

// ---------- Favorites ----------
VIEWS.favs = async function viewFavs() {
  const id = navId;
  const fv = favs(), notes = store.keys('n_').map(k => k.slice(2));
  const ids = [...new Set([...fv, ...notes])].filter(k => /^\d+:\d+$/.test(k)).sort((x, y) => { const [a, b] = x.split(':').map(Number), [c, d] = y.split(':').map(Number); return a - c || b - d; });
  let meta = []; try { meta = await getSurahs(); } catch (e) {}
  if (id !== navId) return;
  view.innerHTML = `${topBar(t('favorites'))}${ids.length ? `<div class="card list">${ids.map(k => {
    const [s, a] = k.split(':').map(Number), n = store.get('n_' + k);
    return `<button class="item" data-s="${s}" data-a="${a}"><span class="ok" style="color:${fv.has(k) ? 'var(--gold)' : 'var(--hint)'}">${fv.has(k) ? ICON.star : ICON.note}</span>
      <span class="grow"><b>${esc(meta[s - 1] ? meta[s - 1].englishName : 'Surah ' + s)}</b> · ${s}:${a}${n ? `<span class="sub">${esc(n.length > 120 ? n.slice(0, 120) + '…' : n)}</span>` : ''}</span><span class="chev">›</span></button>`;
  }).join('')}</div>` : `<div class="card state"><b>${t('empty')}</b><p>${t('emptyFav')}</p></div>`}`;
  wireBack();
  view.querySelectorAll('[data-s]').forEach(b => { b.onclick = () => go('reader', { s: +b.dataset.s, a: +b.dataset.a, from: 'favs' }); });
};

// ---------- Dhikr ----------
VIEWS.dhikr = function viewDhikr() {
  const st = store.get('dhikr', { i: 0, c: {} });
  if (!DHIKR[st.i]) st.i = 0;
  const dk = new Date().toDateString();
  if (!st.day || st.day.d !== dk) st.day = { d: dk, n: 0 };
  const [ar, tl, ru, en, goal] = DHIKR[st.i];
  const c = st.c[st.i] || 0, R = 46, L = 2 * Math.PI * R;
  const ring = v => L * (1 - Math.min(v % goal === 0 && v ? 1 : (v % goal) / goal, 1));
  view.innerHTML = `<h1>${t('dhikr')}</h1>
    <div class="chips" role="tablist">${DHIKR.map((d, i) => `<button class="chip ${i === st.i ? 'on' : ''}" data-i="${i}" role="tab" aria-selected="${i === st.i}">${d[0]}</button>`).join('')}</div>
    <div class="dhikr-text"><div class="ar">${ar}</div><div class="tl">${tl}</div><div class="mean">${S.lang === 'ru' ? ru : en}</div></div>
    <button class="counter ${c >= goal ? 'done' : ''}" id="cnt" aria-live="polite"><svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="${R}"/><circle class="prog" cx="50" cy="50" r="${R}" stroke-dasharray="${L}" stroke-dashoffset="${ring(c)}"/></svg>
      <b>${c}</b><small>${t('goal')} ${goal}</small></button>
    <p class="hint" id="gd" style="text-align:center;min-height:22px">${c >= goal ? t('done') : ''}</p>
    <div class="row" style="justify-content:center"><button class="btn" id="rs">${t('reset')}</button></div>
    <div class="card" style="margin-top:16px"><label class="switch"><span>${t('tasbih')}</span><input type="checkbox" id="au" ${st.auto ? 'checked' : ''}></label>
      <div class="hint" style="margin-top:8px">${t('todayCount')}: <b id="dt">${st.day.n}</b></div></div>`;
  view.querySelector('.chips').onclick = e => { const b = e.target.closest('[data-i]'); if (b) { st.i = +b.dataset.i; store.set('dhikr', st); viewDhikr(); } };
  const save = debounce(() => store.set('dhikr', st), 500);
  $('#cnt').onclick = () => {
    const v = st.c[st.i] = (st.c[st.i] || 0) + 1; st.day.n++; save();
    $('#cnt b').textContent = v; $('#cnt .prog').style.strokeDashoffset = ring(v); $('#dt').textContent = st.day.n;
    $('#cnt').classList.toggle('done', v >= goal); haptic(v % goal === 0 ? 'heavy' : 'light');
    $('#gd').textContent = v >= goal ? t('done') : '';
    // After-prayer tasbih: SubhanAllah 33 → Alhamdulillah 33 → Allahu akbar 34, then stop.
    if (st.auto && v === goal && st.i < 2) {
      $('#gd').textContent = `${t('next2')}: ${DHIKR[st.i + 1][1]}`;
      $('#cnt').disabled = true;
      setTimeout(() => { if (!$('#cnt')) return; st.i++; st.c[st.i] = 0; store.set('dhikr', st); viewDhikr(); }, 900);
    }
  };
  $('#au').onchange = e => { st.auto = e.target.checked; if (st.auto) { st.i = 0; [0, 1, 2].forEach(i => { st.c[i] = 0; }); } store.set('dhikr', st); viewDhikr(); };
  onLeave(() => store.set('dhikr', st));
  $('#rs').onclick = () => { st.c[st.i] = 0; store.set('dhikr', st); viewDhikr(); };
};

// ---------- Qibla ----------
VIEWS.qibla = function viewQibla() {
  const b = qiblaBearing(S.loc.lat, S.loc.lon);
  view.innerHTML = `<h1>${t('qibla')}</h1><div class="card" style="text-align:center">
    <div class="hint">${ICON.pin.replace('class="ico"', 'class="ico" style="width:16px;height:16px;vertical-align:-3px"')} ${esc(S.loc.name)}</div>
    <div class="compass"><div class="dial" id="dial"><span class="mark n">N</span><span class="mark s">S</span><div class="needle" style="transform:rotate(${b}deg)"></div></div><div class="hub"></div></div>
    <div class="deg">${Math.round(b)}°</div><div class="hint">${t('qiblaDir')}, ${t('degrees')}</div>
    <p style="margin-top:16px"><button class="btn primary" id="cp">${t('compassOn')}</button></p><p class="hint" id="cm">${t('compassHint')}</p></div>`;
  let smooth = null;
  const rotate = h => {
    // Shortest-path smoothing so the dial does not spin around at 359° -> 0°.
    if (smooth == null) smooth = h; else { let d = ((h - smooth + 540) % 360) - 180; smooth += d * 0.35; }
    const el = $('#dial'); if (el) el.style.transform = `rotate(${-smooth}deg)`;
  };
  const onO = e => { const h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? 360 - e.alpha : null); if (h != null) { got = true; rotate(h); } };
  let got = false;
  const stop = () => { window.removeEventListener('deviceorientationabsolute', onO, true); window.removeEventListener('deviceorientation', onO, true); };
  onLeave(stop);
  $('#cp').onclick = async () => {
    try {
      if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') throw 0; }
      window.addEventListener('deviceorientationabsolute', onO, true); window.addEventListener('deviceorientation', onO, true);
      $('#cp').hidden = true;
      setTimeout(() => { if (!got && $('#cm')) { $('#cm').textContent = t('noSensor'); $('#cp').hidden = false; } }, 2500);
    } catch (e) { $('#cm').textContent = t('noSensor'); }
  };
};

// ---------- 99 Names ----------
VIEWS.names = function viewNames() {
  view.innerHTML = `${topBar(t('names'))}<p class="hint" style="margin:-4px 0 12px">${t('namesSub')}</p>
    <div class="field"><input type="search" id="nq" placeholder="${t('searchName')}" autocomplete="off" aria-label="${t('searchName')}"></div><div class="names" id="nl"></div>`;
  wireBack();
  const fill = f => {
    const rows = NAMES.map((x, i) => [x, i]).filter(([x, i]) => !f || `${i + 1} ${x[1]} ${x[2]} ${x[3]} ${x[0]}`.toLowerCase().includes(f));
    $('#nl').innerHTML = rows.length ? rows.map(([x, i]) => `<div class="nm"><span class="n">${i + 1}</span><div class="ar">${x[0]}</div><div class="tl">${esc(x[1])}</div><div class="mean">${esc(S.lang === 'ru' ? x[3] : x[2])}</div></div>`).join('')
      : `<div class="state hint" style="grid-column:1/-1">${t('notFound')}</div>`;
  };
  fill('');
  $('#nq').addEventListener('input', e => fill(e.target.value.trim().toLowerCase()));
};

// ---------- Calendar ----------
VIEWS.cal = async function viewCal(arg) {
  const id = navId;
  view.innerHTML = `${topBar(t('calendar'))}<div class="calnav"><button class="btn icon ghost" id="cpv" aria-label="${t('prevMonth')}">‹</button><b id="cml">&nbsp;</b><button class="btn icon ghost" id="cnx" aria-label="${t('nextMonth')}">›</button></div><div class="card" id="ct">${skeleton(10)}</div>`;
  wireBack();
  const load = async () => {
    try {
      const info = await today();
      const ym = arg && arg.y ? arg : { y: info.n.y, m: info.n.m };
      const mo = await month(ym.y, ym.m);
      if (id !== navId) return;
      const cur = ym.y === info.n.y && ym.m === info.n.m;
      let mname = `${ym.m}.${ym.y}`; try { mname = new Intl.DateTimeFormat(S.lang, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(ym.y, ym.m - 1, 1))); mname = mname[0].toUpperCase() + mname.slice(1); } catch (e) {}
      const h1 = mo.days[0].hijri, h2 = mo.days[mo.days.length - 1].hijri;
      $('#cml').innerHTML = `${esc(mname)}<span class="hint">${esc(t('months')[h1.m - 1] || '')}${h2.m !== h1.m ? ' – ' + esc(t('months')[h2.m - 1] || '') : ''} ${h2.y}</span>`;
      const short = p => t(p).slice(0, S.lang === 'ru' ? 4 : 3);
      $('#ct').style.padding = '6px';
      $('#ct').innerHTML = `<table><tr><th>${t('day')}</th>${PRAYERS.map(p => `<th>${short(p)}</th>`).join('')}</tr>${mo.days.map(d =>
        `<tr class="${cur && d.d === info.n.d ? 'today' : ''}${isFriday(ym.y, ym.m, d.d) ? ' fri' : ''}${d.hijri.m === 9 ? ' ram' : ''}"><td>${d.d} <span class="hint" style="font-size:11px">${d.hijri.d}</span></td>${d.t.map(x => `<td>${fmtHM(x)}</td>`).join('')}</tr>`).join('')}</table>`;
      const td = view.querySelector('tr.today'); if (td) td.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0);
      $('#cpv').onclick = () => VIEWS.cal(shiftMonth(ym.y, ym.m, -1));
      $('#cnx').onclick = () => VIEWS.cal(shiftMonth(ym.y, ym.m, 1));
    } catch (e) { if (id === navId) failState($('#ct'), load); }
  };
  load();
};

// ---------- More / settings ----------
VIEWS.more = function viewMore() {
  const api = (window.NS_CONFIG || {}).BOT_API_URL;
  const seg = (id, val, opts) => `<div class="seg" id="${id}">${opts.map(([v, l]) => `<button data-v="${v}" class="${v === val ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  view.innerHTML = `<h1>${t('more')}</h1>
    <div class="card list">
      <button class="item" id="nm"><span class="ok" style="color:var(--gold)">${ICON.star8}</span><span class="grow">${t('names')}</span><span class="chev">›</span></button>
      <button class="item" id="fv"><span class="ok" style="color:var(--gold)">${ICON.star}</span><span class="grow">${t('favorites')}</span><span class="chev">›</span></button>
      <button class="item" id="cl"><span class="ok" style="color:var(--gold)">${ICON.cal}</span><span class="grow">${t('calendar')}</span><span class="chev">›</span></button></div>
    <h2>${t('location')}</h2>
    <div class="card">
      <div class="row" style="margin-bottom:12px"><span>${ICON.pin}</span><b class="grow" style="flex:1">${esc(S.loc.name)}</b></div>
      <form class="row" id="cf" style="margin-bottom:8px"><input type="search" id="cq" placeholder="${t('search')}" autocomplete="off" aria-label="${t('search')}" style="flex:1"><button class="btn icon" aria-label="${t('search')}">${ICON.search}</button></form>
      <div id="cr" class="list"></div>
      <button class="btn" id="gps" style="width:100%">${t('useGps')}</button></div>
    <h2>${t('prayerSet')}</h2>
    <div class="card">
      <div class="field"><label for="mt">${t('method')}</label><select id="mt">${METHODS.map(m => `<option value="${m[0]}" ${m[0] === S.method ? 'selected' : ''}>${m[1]}</option>`).join('')}</select></div>
      <div class="field"><label>${t('madhab')}</label>${seg('sc', S.school, [[0, t('shafii')], [1, t('hanafi')]])}</div></div>
    <h2>${t('look')}</h2>
    <div class="card">
      <div class="field"><label>${t('theme')}</label>${seg('th', S.theme, [['auto', t('auto')], ['light', t('light')], ['dark', t('dark')]])}</div>
      <div class="field"><label>${t('lang')}</label>${seg('lg', S.lang, [['ru', 'Русский'], ['en', 'English']])}</div></div>
    ${api ? `<div class="card"><label class="switch"><span>${t('adhanBot')}</span><input type="checkbox" id="ad" ${S.adhan ? 'checked' : ''}></label></div>` : ''}
    <p class="foot">Base Islam · ${t('version')} ${VERSION}<br>${t('data')}</p>`;
  $('#nm').onclick = () => go('names'); $('#fv').onclick = () => go('favs'); $('#cl').onclick = () => go('cal');
  const setLoc = (name, lat, lon) => { S.loc = { name, lat: +(+lat).toFixed(4), lon: +(+lon).toFixed(4) }; S.locSet = true; saveSettings(); syncBot(); haptic(); go('home'); };
  $('#cf').onsubmit = async e => {
    e.preventDefault();
    const q = $('#cq').value.trim(); if (!q) return;
    $('#cr').innerHTML = `<div class="hint" style="padding:8px 0">${t('loading')}</div>`;
    try {
      const j = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?count=6&language=${S.lang}&name=${encodeURIComponent(q)}`);
      const r = j.results || [];
      $('#cr').innerHTML = r.length ? r.map((x, i) => `<button type="button" class="item" data-i="${i}"><span class="grow"><b>${esc(x.name)}</b><span class="sub">${esc([x.admin1, x.country].filter(Boolean).join(', '))}</span></span><span class="chev">›</span></button>`).join('') : `<div class="hint" style="padding:8px 0">${t('notFound')}</div>`;
      $('#cr').onclick = ev => { const b = ev.target.closest('[data-i]'); if (b) { const x = r[+b.dataset.i]; setLoc(x.name, x.latitude, x.longitude); } };
    } catch (err) { $('#cr').innerHTML = ''; toast(t('fail')); }
  };
  $('#gps').onclick = () => {
    if (!navigator.geolocation) return toast(t('locDenied'));
    navigator.geolocation.getCurrentPosition(p => setLoc(t('myPlace'), p.coords.latitude, p.coords.longitude), () => toast(t('locDenied')), { timeout: 10000, maximumAge: 600000 });
  };
  $('#mt').onchange = e => { S.method = +e.target.value; saveSettings(); syncBot(); };
  const onSeg = (id, fn) => { $('#' + id).onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; $('#' + id).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); fn(b.dataset.v); }; };
  onSeg('sc', v => { S.school = +v; saveSettings(); syncBot(); });
  onSeg('th', v => { S.theme = v; saveSettings(); applyTheme(); });
  onSeg('lg', v => { S.lang = v; saveSettings(); applyTheme(); renderTabs(); surahList = null; viewMore(); });
  if ($('#ad')) $('#ad').onchange = async e => { S.adhan = e.target.checked; saveSettings(); const ok = await syncBot(); toast(ok ? (S.adhan ? t('adhanSaved') : t('adhanStopped')) : t('fail')); };
};
async function syncBot() {
  const api = (window.NS_CONFIG || {}).BOT_API_URL;
  if (!api || !inTg) return false;
  try {
    const r = await fetchT(api.replace(/\/$/, '') + '/api/subscribe', 15000, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: tg.initData, enabled: !!S.adhan, lat: S.loc.lat, lon: S.loc.lon, method: S.method, school: S.school, lang: S.lang }) });
    return r.ok;
  } catch (e) { return false; }
}

// ---------- boot ----------
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});
applyTheme(); netBanner(); renderTabs();
cloudPull().then(() => { Object.assign(S, store.get('settings', {})); fixSettings(); applyTheme(); renderTabs(); go('home'); });
window.__bi = { S, go, audio };
})();
