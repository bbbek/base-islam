/* Base Islam: pure helpers shared by the app and the Node tests (node --test). No DOM access here. */
(function (root) {
'use strict';
const KAABA = { lat: 21.4225, lon: 39.8262 };
const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const API_KEYS = { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };
const ADHAN = [0, 2, 3, 4, 5]; // prayer indexes, sunrise is not a prayer
const TRANSLATIONS = { ru: 'ru.kuliev', en: 'en.sahih' };

function qiblaBearing(lat, lon) {
  const r = Math.PI / 180, dl = (KAABA.lon - lon) * r;
  const y = Math.sin(dl) * Math.cos(KAABA.lat * r);
  const x = Math.cos(lat * r) * Math.sin(KAABA.lat * r) - Math.sin(lat * r) * Math.cos(KAABA.lat * r) * Math.cos(dl);
  return (Math.atan2(y, x) / r + 360) % 360;
}

// Wall-clock date and seconds since midnight in a time zone (falls back to the device zone on a bad name).
function nowIn(tz, date = new Date()) {
  let f;
  try { f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch (e) { f = new Intl.DateTimeFormat('en-CA', { hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  const p = f.formatToParts(date);
  const g = type => +p.find(x => x.type === type).value;
  return { y: g('year'), m: g('month'), d: g('day'), secs: g('hour') * 3600 + g('minute') * 60 + g('second') };
}

// "05:12 (+05)" -> seconds since midnight
const hm = s => { const [h, m] = String(s).slice(0, 5).split(':').map(Number); return h * 3600 + m * 60; };
const pad = n => String(n).padStart(2, '0');
const fmtHM = secs => { const m = ((Math.round(secs / 60) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
const fmtHMS = secs => { secs = Math.max(0, Math.floor(secs)); return [Math.floor(secs / 3600), Math.floor(secs % 3600 / 60), secs % 60].map(pad).join(':'); };

// Aladhan /calendar response -> { tz, days: [{ d, hijri: {d, m, y}, t: [secs x6] }] }
function parseMonth(j) {
  if (!j || !Array.isArray(j.data) || !j.data.length) throw new Error('bad calendar');
  return { tz: j.data[0].meta.timezone, days: j.data.map(x => ({
    d: +x.date.gregorian.day,
    hijri: { d: +x.date.hijri.day, m: +x.date.hijri.month.number, y: +x.date.hijri.year },
    t: PRAYERS.map(p => hm(x.timings[API_KEYS[p]])) })) };
}

// Next adhan from `secs` (seconds since local midnight).
function nextPrayer(dayT, tomorrowT, secs) {
  for (const i of ADHAN) if (dayT[i] > secs) return { i, left: dayT[i] - secs, tomorrow: false };
  return { i: 0, left: 86400 - secs + tomorrowT[0], tomorrow: true };
}

// The API prefixes ayah 1 of every surah except 1 and 9 with the basmala; split it off so it shows as its own line.
function splitBasmala(text, surah, ayah) {
  text = String(text).replace(/^﻿/, '');
  if (ayah !== 1 || surah === 1 || surah === 9) return { text, basmala: '' };
  const w = text.split(' ');
  if (w.length > 4 && /سْمِ$/.test(w[0])) return { text: w.slice(4).join(' ').trim(), basmala: w.slice(0, 4).join(' ') };
  return { text, basmala: '' };
}
const surahUrl = (n, lang) => `https://api.alquran.cloud/v1/surah/${n}/editions/quran-uthmani,${TRANSLATIONS[lang] || 'en.sahih'},en.transliteration`;
function surahFromUrl(url, lang) {
  const m = /\/surah\/(\d+)\/editions\/quran-uthmani,([^,]+),en\.transliteration$/.exec(url);
  return m && m[2] === (TRANSLATIONS[lang] || 'en.sahih') ? +m[1] : 0;
}

// Same name for everyone on a given calendar day, cycles through all 99.
function nameOfDay(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 86400000) % 99; }

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Runs `fn` over items with at most `limit` in flight; calls onStep(done, total) after each.
async function pool(items, limit, fn, onStep) {
  let next = 0, done = 0; const errors = [];
  const worker = async () => {
    while (next < items.length) {
      const it = items[next++];
      try { await fn(it); } catch (e) { errors.push(it); }
      done++; if (onStep) onStep(done, items.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return errors;
}

const lib = { KAABA, PRAYERS, ADHAN, TRANSLATIONS, qiblaBearing, nowIn, hm, fmtHM, fmtHMS, parseMonth, nextPrayer,
  splitBasmala, surahUrl, surahFromUrl, nameOfDay, esc, pool };
if (typeof module === 'object' && module.exports) module.exports = lib; else root.BI = lib;
})(typeof self !== 'undefined' ? self : this);
