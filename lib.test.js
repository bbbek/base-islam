// Tests for lib.js and names.js. Run: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const BI = require('./lib.js');

test('qibla bearing for known cities', () => {
  assert.ok(Math.abs(BI.qiblaBearing(55.7558, 37.6173) - 176.4) < 1.5); // Moscow
  assert.ok(Math.abs(BI.qiblaBearing(41.2995, 69.2401) - 240.3) < 1.5); // Tashkent
  assert.ok(Math.abs(BI.qiblaBearing(40.7128, -74.006) - 58.5) < 1.5); // New York
});

test('time formatting', () => {
  assert.strictEqual(BI.hm('05:07 (+05)'), 5 * 3600 + 7 * 60);
  assert.strictEqual(BI.fmtHM(BI.hm('23:59')), '23:59');
  assert.strictEqual(BI.fmtHM(86400), '00:00');
  assert.strictEqual(BI.fmtHMS(3725), '01:02:05');
  assert.strictEqual(BI.fmtHMS(-5), '00:00:00');
});

test('nowIn uses the given zone and survives a bad zone name', () => {
  const d = new Date(Date.UTC(2026, 0, 1, 23, 30, 0));
  assert.deepStrictEqual(BI.nowIn('Asia/Tashkent', d), { y: 2026, m: 1, d: 2, secs: 4 * 3600 + 30 * 60 });
  assert.strictEqual(BI.nowIn('UTC', d).secs, 23 * 3600 + 30 * 60);
  assert.ok(BI.nowIn('Not/AZone', d).y >= 2026);
});

test('next prayer skips sunrise and rolls over to tomorrow', () => {
  const day = ['05:00', '06:30', '12:00', '15:30', '18:00', '19:30'].map(BI.hm);
  const tom = ['05:01', '06:31', '12:00', '15:30', '18:00', '19:30'].map(BI.hm);
  assert.strictEqual(BI.nextPrayer(day, tom, BI.hm('04:00')).i, 0);
  assert.strictEqual(BI.nextPrayer(day, tom, BI.hm('05:30')).i, 2); // after Fajr: Dhuhr, not sunrise
  assert.deepStrictEqual(BI.nextPrayer(day, tom, BI.hm('12:00')), { i: 3, left: 3.5 * 3600, tomorrow: false });
  const late = BI.nextPrayer(day, tom, BI.hm('22:00'));
  assert.strictEqual(late.i, 0); assert.ok(late.tomorrow); assert.strictEqual(late.left, 2 * 3600 + BI.hm('05:01'));
});

test('parseMonth reads the Aladhan calendar shape', () => {
  const x = { meta: { timezone: 'Europe/Moscow' }, date: { gregorian: { day: '01' }, hijri: { day: '10', month: { number: 4 }, year: '1448' } },
    timings: { Fajr: '05:10 (MSK)', Sunrise: '07:00 (MSK)', Dhuhr: '12:30 (MSK)', Asr: '15:00 (MSK)', Maghrib: '17:40 (MSK)', Isha: '19:20 (MSK)' } };
  const m = BI.parseMonth({ data: [x] });
  assert.strictEqual(m.tz, 'Europe/Moscow');
  assert.deepStrictEqual(m.days[0].hijri, { d: 10, m: 4, y: 1448 });
  assert.strictEqual(m.days[0].t.length, 6);
  assert.strictEqual(BI.fmtHM(m.days[0].t[2]), '12:30');
  assert.throws(() => BI.parseMonth({ data: [] }));
  assert.throws(() => BI.parseMonth(null));
});

test('basmala is split from ayah 1 except in surahs 1 and 9', () => {
  const b = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
  assert.deepStrictEqual(BI.splitBasmala(b + ' الٓمٓ', 2, 1), { text: 'الٓمٓ', basmala: b });
  assert.strictEqual(BI.splitBasmala('﻿' + b, 1, 1).text, b); // Al-Fatiha: basmala is ayah 1 itself, BOM stripped
  assert.strictEqual(BI.splitBasmala('بَرَآءَةٌ مِّنَ ٱللَّهِ وَرَسُولِهِۦٓ إِلَى ٱلَّذِينَ', 9, 1).basmala, '');
  assert.strictEqual(BI.splitBasmala('بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ وَٱلتِّينِ', 95, 1).text, 'وَٱلتِّينِ');
  assert.strictEqual(BI.splitBasmala(b + ' الٓمٓ', 2, 2).basmala, '');
  assert.strictEqual(BI.splitBasmala('ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ', 2, 1).basmala, ''); // no basmala: keep text whole
});

test('surah URL round-trip respects the language', () => {
  const u = BI.surahUrl(36, 'ru');
  assert.ok(u.includes('ru.kuliev'));
  assert.strictEqual(BI.surahFromUrl(u, 'ru'), 36);
  assert.strictEqual(BI.surahFromUrl(u, 'en'), 0);
  assert.strictEqual(BI.surahFromUrl('https://api.alquran.cloud/v1/surah', 'ru'), 0);
});

test('name of the day cycles through all 99', () => {
  const seen = new Set();
  for (let i = 0; i < 99; i++) seen.add(BI.nameOfDay(2026, 1, 1 + i));
  assert.strictEqual(seen.size, 99);
  assert.strictEqual(BI.nameOfDay(2026, 10, 22), BI.nameOfDay(2026, 10, 22));
});

test('escaping', () => assert.strictEqual(BI.esc(`<a href="x">'&`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;'));

test('pool limits concurrency and reports failures', async () => {
  let live = 0, peak = 0; const steps = [];
  const failed = await BI.pool([1, 2, 3, 4, 5, 6, 7], 3, async n => {
    live++; peak = Math.max(peak, live); await new Promise(r => setTimeout(r, 5)); live--;
    if (n === 4) throw new Error('x');
  }, d => steps.push(d));
  assert.strictEqual(peak, 3);
  assert.deepStrictEqual(failed, [4]);
  assert.deepStrictEqual(steps, [1, 2, 3, 4, 5, 6, 7]);
});

test('names.js has 99 complete entries', () => {
  const window = {};
  new Function('window', fs.readFileSync(__dirname + '/names.js', 'utf8'))(window);
  assert.strictEqual(window.BI_NAMES.length, 99);
  for (const n of window.BI_NAMES) { assert.strictEqual(n.length, 4); n.forEach(f => assert.ok(f && f.trim())); assert.match(n[0], /[؀-ۿ]/); }
  assert.strictEqual(new Set(window.BI_NAMES.map(n => n[3])).size >= 95, true);
});

test('fasting phase: suhoor before Fajr, iftar countdown until Maghrib', () => {
  const day = ['05:00', '06:30', '12:00', '15:30', '18:00', '19:30'].map(BI.hm);
  assert.deepStrictEqual(BI.fastingPhase(day, BI.hm('04:00')), { phase: 'suhoor', left: 3600 });
  assert.deepStrictEqual(BI.fastingPhase(day, BI.hm('17:00')), { phase: 'iftar', left: 3600 });
  assert.strictEqual(BI.fastingPhase(day, BI.hm('18:00')).phase, 'done');
});

test('friday detection and month shifting', () => {
  assert.strictEqual(BI.isFriday(2026, 10, 30), true);
  assert.strictEqual(BI.isFriday(2026, 10, 29), false);
  assert.deepStrictEqual(BI.shiftMonth(2026, 12, 1), { y: 2027, m: 1 });
  assert.deepStrictEqual(BI.shiftMonth(2026, 1, -1), { y: 2025, m: 12 });
  assert.deepStrictEqual(BI.shiftMonth(2026, 5, 0), { y: 2026, m: 5 });
});

test('ayah repeat cycles 1 → 3 → 5 → loop and decides when to move on', () => {
  assert.strictEqual(BI.nextRepeat(1), 3); assert.strictEqual(BI.nextRepeat(5), 0); assert.strictEqual(BI.nextRepeat(0), 1);
  assert.strictEqual(BI.afterAyah(1, 1), 'next');
  assert.strictEqual(BI.afterAyah(3, 1), 'again'); assert.strictEqual(BI.afterAyah(3, 3), 'next');
  assert.strictEqual(BI.afterAyah(0, 99), 'again');
});
