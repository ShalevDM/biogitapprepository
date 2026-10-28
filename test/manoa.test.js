import { test } from 'node:test';
import assert from 'node:assert/strict';
import { netuneiDema } from '../scripts/netunei-dema.js';
import { yetzorShibutz, bneHeksher, bdika } from '../src/manoa/index.js';
import { emdotLehistoria } from '../src/manoa/historia.js';
import { hosefYamim, dakotLeshaa } from '../src/zman.js';
import { ptachDb } from '../src/db.js';
import { Sherut } from '../src/sherut.js';

const PTIHA = '2026-11-01';

function harez({ yamim = 3, chaserim = [], hagdarot = {}, shinuy } = {}) {
  const { ovdim, tzevatim } = netuneiDema(PTIHA);
  shinuy?.(ovdim, tzevatim);
  const ids = new Set(chaserim.map((s) => ovdim.find((o) => o.shem === s).id));
  const nochechut = Object.fromEntries(ovdim.map((o) => [o.id, ids.has(o.id) ? 'bechofesh' : 'nimtza']));
  const historia = [];
  const out = [];
  let taarich = PTIHA;
  for (let i = 0; i < yamim; i++) {
    const r = yetzorShibutz({ taarich, hagdarot, ovdim, tzevatim, historia, nochechut });
    out.push(r);
    historia.push(...emdotLehistoria(taarich, r.emdot));
    taarich = hosefYamim(taarich, 1);
  }
  return { ovdim, tzevatim, out, nochechut, historia };
}

const CHOSER_5 = ['עידו', 'יעל', 'בני', 'טל', 'גיל'];
const CHOSER_10 = ['רון', 'עידו', 'נדב', 'יעל', 'שקד', 'בני', 'ניר', 'טל', 'ספיר', 'גיל'];

test('מצב מלא: רגיל, הכול מאויש, אין הפרות, 7 ימים ברצף', () => {
  const { out, ovdim } = harez({ yamim: 7 });
  for (const r of out) {
    assert.equal(r.matzav, 'ragil');
    assert.deepEqual(r.vitur, []);
    assert.deepEqual(r.hafarot, []);
    assert.equal(r.emdot.filter((e) => !e.oved_id).length, 0);
    for (const key of new Set(r.emdot.filter((e) => e.mesima === 'pas_cham').map((e) => e.mishmeret))) {
      const em = r.emdot.filter((e) => e.mishmeret === key);
      assert.equal(em.length, 6, 'פס חם: 6 אנשים');
      const shefim = em.filter((e) => ovdim.find((o) => o.id === e.oved_id).tafkid === 'shef');
      assert.equal(shefim.length, 1, 'שף אחד בדיוק');
      assert.equal(shefim[0].emda, 'pas_cham_a', 'השף תמיד בפס חם א');
    }
    const hc = r.emdot.filter((e) => e.mesima === 'hachanot');
    assert.equal(hc.length, 12, 'הכנות: 4 אנשים בכל משמרת');
  }
});

test('הצוותים מתחלפים מעצמם בין בוקר, צהריים ולילה (מחזור 32 שעות)', () => {
  const { out } = harez({ yamim: 4 });
  const tzevetBoker = out.map((r) => r.emdot.find((e) => e.mesima === 'pas_cham' && e.shem_mishmeret === 'בוקר').tzevet_id);
  assert.deepEqual(tzevetBoker, [1, 2, 3, 4]);
  const r = out[0];
  const boker = r.emdot.find((e) => e.mesima === 'pas_cham' && e.shem_mishmeret === 'בוקר');
  assert.equal(dakotLeshaa(boker.hatchala), '04:45', 'הכנת שחר');
});

test('דטרמיניסטי: אותו קלט → אותו שיבוץ', () => {
  const a = harez({ yamim: 2, chaserim: CHOSER_5 }).out.map((r) => r.emdot.map((e) => `${e.id}=${e.oved_id}`).join());
  const b = harez({ yamim: 2, chaserim: CHOSER_5 }).out.map((r) => r.emdot.map((e) => `${e.id}=${e.oved_id}`).join());
  assert.deepEqual(a, b);
});

test('כל שיבוץ מוסבר', () => {
  const { out } = harez({ yamim: 1 });
  for (const e of out[0].emdot) assert.ok(e.nimuk?.txt, `אין נימוק ל-${e.id}`);
});

test('חוסר של 5: סדר הוויתור מופעל, פס חם והכנות מלאים, בלי הפרות קשיחות', () => {
  const { out } = harez({ yamim: 3, chaserim: CHOSER_5 });
  for (const r of out) {
    assert.deepEqual(r.vitur, ['minhal_tabach', 'pas_kar_3_6', 'cherum_8_8']);
    assert.equal(r.matzav, 'cherum');
    assert.equal(r.emdot.filter((e) => !e.oved_id && (e.mesima === 'pas_cham' || e.mesima === 'hachanot')).length, 0);
    assert.equal(r.hafarot.length, 0);
    assert.ok(!r.emdot.some((e) => e.tabach_minhal), 'הטבח הוצא ממשמרת מנהל');
  }
});

test('חוסר של 10: התראה ודרישת אישור ידני, אין הפרות מלבד חוסר', () => {
  const { out } = harez({ yamim: 2, chaserim: CHOSER_10 });
  for (const r of out) {
    assert.equal(r.matzav, 'cherum');
    assert.equal(r.darush_ishur, true);
    assert.ok(r.hafarot.length > 0);
    assert.ok(r.hafarot.every((h) => h.sug === 'chaser'), 'המנוע לא מפר כללים קשיחים — רק לא מצליח לאייש');
    assert.equal(r.emdot.filter((e) => !e.oved_id && e.mesima === 'pas_cham').length, 0, 'פס חם קודם להכנות');
  }
});

test('חריגת הכנת שחר כבויה: אין מנוחה מספיקה בין הכנות צהריים לפס חם בוקר', () => {
  const { out } = harez({ yamim: 2, hagdarot: { chariga_menucha_lifnei_boker: false } });
  // יום 1: צוות 1 היה בהכנות צהריים אתמול (סיום 22:00), ופס חם בוקר מתחיל ב-04:45 → 6:45 ש' בלבד
  const boker = out[0].emdot.filter((e) => e.mesima === 'pas_cham' && e.shem_mishmeret === 'בוקר');
  assert.ok(boker.every((e) => e.nimuk?.derug !== 'חבר הצוות'), 'אף חבר צוות לא שובץ לפס חם בוקר');
  assert.ok(out[0].azharot.some((a) => a.sug === 'tzevet' && a.txt.includes("6:45 ש' בלבד")));
  // יום 2: המנוע מגן על פס חם בוקר של מחר ולכן לא משבץ את הצוות להכנות צהריים
  assert.ok(out[1].azharot.some((a) => a.txt.includes('לא שובץ להכנות צהריים')));
  for (const r of out) assert.equal(r.hafarot.filter((h) => h.sug === 'menucha').length, 0);
});

test('עם החריגה (ברירת מחדל): הצוות עובר מהכנות צהריים לפס חם בוקר', () => {
  const { out } = harez({ yamim: 1 });
  const boker = out[0].emdot.filter((e) => e.mesima === 'pas_cham' && e.shem_mishmeret === 'בוקר');
  assert.ok(boker.every((e) => e.nimuk?.derug === 'חבר הצוות'));
});

test('בדיקה אחרי עריכה ידנית: חפיפה, תפקיד וסטטוס', () => {
  const { ovdim, tzevatim, out, nochechut } = harez({ yamim: 1 });
  const r = out[0];
  const emdot = structuredClone(r.emdot);
  const pcBoker = emdot.filter((e) => e.mesima === 'pas_cham' && e.shem_mishmeret === 'בוקר');
  const hcBoker = emdot.find((e) => e.mesima === 'hachanot' && e.shem_mishmeret === 'בוקר' && e.tafkid === 'tabach');
  hcBoker.oved_id = pcBoker[1].oved_id; // אותו אדם בשתי משימות חופפות
  const minhalan = ovdim.find((o) => o.tafkid === 'minhalan');
  pcBoker[2].oved_id = minhalan.id; // מנהלן בפס חם
  const hx = bneHeksher({ taarich: PTIHA, hagdarot: {}, ovdim, tzevatim, historia: [], nochechut: { ...nochechut, [pcBoker[3].oved_id]: 'bechofesh' } });
  const bd = bdika(hx, emdot, r.dgalim);
  const sugim = new Set(bd.hafarot.map((h) => h.sug));
  assert.ok(sugim.has('chafifa'));
  assert.ok(sugim.has('tafkid'));
  assert.ok(sugim.has('status'));
});

function hosefOdef(n) {
  return (ovdim) => {
    for (let i = 0; i < n; i++) {
      ovdim.push({ id: 100 + i, shem: `עודף ${i + 1}`, tafkid: 'tabach', tagiot: [], status: 'nimtza', tzevet_id: null, bemaagar_pas_kar: 0, seder: 0 });
    }
  };
}

test('עודף: האנשים הנוספים מתחלקים כמנוחה מורחבת ברוטציה', () => {
  const basis = harez({ yamim: 3 }).out;
  const { out } = harez({ yamim: 3, shinuy: hosefOdef(3) });
  for (let i = 0; i < out.length; i++) {
    const r = out[i];
    assert.equal(r.hafarot.length, 0);
    assert.equal(r.matzav, 'ragil');
    assert.ok(r.sibot.some((s) => s.startsWith('עודף')));
    assert.ok(r.menuchot.length > basis[i].menuchot.length, 'יותר מנוחות מורחבות מאשר בלי עודף');
  }
});

test('עודף גדול: מי שנשאר בלי שיבוץ מחליף ליממה, והמוחלף מקבל יום מנוחה מלא', () => {
  const { out } = harez({ yamim: 2, shinuy: hosefOdef(8) });
  for (const r of out) {
    assert.equal(r.hafarot.length, 0);
    const male = r.menuchot.filter((m) => m.sug === 'yom_menucha_male');
    assert.ok(male.length > 0, 'יש יום מנוחה מלא');
    for (const m of male) assert.ok(!r.emdot.some((e) => e.oved_id === m.oved_id), 'מי שבמנוחה מלאה לא משובץ');
  }
  const mekablim = out.map((r) => r.menuchot.filter((m) => m.sug === 'yom_menucha_male').map((m) => m.oved_id).sort().join());
  assert.notEqual(mekablim[0], mekablim[1], 'יום המנוחה המלא עובר בין אנשים');
});

test('שירות: נוכחות → טיוטה → נעילה → שבץ מחדש משעה → פרסום', () => {
  const db = ptachDb(':memory:');
  const sherut = new Sherut(db, { akshav: () => new Date('2026-10-31T12:00:00') });
  const { ovdim, tzevatim } = netuneiDema(PTIHA);
  const mapa = new Map();
  for (const o of ovdim) {
    const { id, tzevet_id, bemaagar_pas_kar, ...shar } = o;
    mapa.set(id, sherut.shmorOved(shar));
  }
  sherut.shmorMatzavPtiha({
    taarich: PTIHA, mishmeret: 0,
    tzevatim: tzevatim.map((t, i) => ({ shem: t.shem, shlav: i, chaverim: ovdim.filter((o) => o.tzevet_id === t.id).map((o) => mapa.get(o.id)) })),
    maagar: ovdim.filter((o) => o.bemaagar_pas_kar).map((o) => mapa.get(o.id)),
  });

  const s1 = sherut.yetzorTyuta(PTIHA);
  assert.equal(s1.matzav, 'ragil');
  assert.equal(s1.status, 'tyuta');

  // נעילה של משמרת פס קר בלילה
  const pk = s1.emdot.find((e) => e.mesima === 'pas_kar' && dakotLeshaa(e.hatchala) === '00:00');
  sherut.edkenShibutz(PTIHA, [{ id: pk.id, naul: true }]);

  // מישהו יצא באמצע היום
  const yotze = s1.emdot.find((e) => e.mesima === 'pas_cham' && e.shem_mishmeret === 'לילה' && e.tafkid === 'tabach').oved_id;
  const noch = Object.fromEntries(sherut.nochechut(PTIHA).ovdim.map((o) => [o.id, o.status]));
  noch[yotze] = 'bechofesh';
  sherut.shmorNochechut(PTIHA, noch);

  const s2 = sherut.shabetzMechadash(PTIHA, '15:00');
  for (const e of s1.emdot.filter((x) => dakotLeshaa(x.hatchala) < '15:00' && dakotLeshaa(x.hatchala) >= '04:45')) {
    assert.equal(s2.emdot.find((x) => x.id === e.id).oved_id, e.oved_id, 'מה שכבר בוצע נשמר');
  }
  assert.equal(s2.emdot.find((x) => x.id === pk.id).oved_id, pk.oved_id, 'מה שנעול נשמר');
  assert.ok(!s2.emdot.some((e) => e.oved_id === yotze && dakotLeshaa(e.hatchala) >= '15:00'), 'מי שיצא לא משובץ');

  // עריכה ידנית שיוצרת הפרה → פרסום דורש אישור
  const a = s2.emdot.find((e) => e.mesima === 'pas_kar' && dakotLeshaa(e.hatchala) === '18:00');
  const b = s2.emdot.find((e) => e.mesima === 'pas_kar' && dakotLeshaa(e.hatchala) === '21:00');
  const s3 = sherut.edkenShibutz(PTIHA, [{ id: b.id, oved_id: a.oved_id }]);
  assert.ok(s3.darush_ishur);
  assert.throws(() => sherut.pirsum(PTIHA, false), /אישור ידני/);
  const s4 = sherut.pirsum(PTIHA, true);
  assert.equal(s4.status, 'mefursam');
  assert.ok(sherut.historia({ mi: PTIHA, ad: PTIHA }).length > 0);

  // היום הבא ממשיך מההיסטוריה
  const s5 = sherut.yetzorTyuta(hosefYamim(PTIHA, 1));
  const tzevet2 = sherut.tzevatim().find((t) => t.shem === 'צוות 2').id;
  assert.equal(s5.emdot.find((e) => e.mesima === 'pas_cham' && e.shem_mishmeret === 'בוקר').tzevet_id, tzevet2, 'הרוטציה ממשיכה');
  assert.ok(sherut.yetzu(PTIHA).includes('*פס חם*'));
});

function hosefShef(ovdim) {
  ovdim.push({ id: 200, shem: 'שף נוסף', tafkid: 'shef', tagiot: [], status: 'nimtza', tzevet_id: null, bemaagar_pas_kar: 0, seder: 0 });
}

test('שף יכול לשמש כטבח: שף ללא צוות משלים חוסר טבח בפס חם', () => {
  const { out } = harez({ yamim: 2, chaserim: ['יוסי'], shinuy: hosefShef });
  for (const r of out) {
    assert.deepEqual(r.hafarot, []);
    const kotabach = r.emdot.filter((e) => e.oved_id === 200 && e.tafkid !== 'shef');
    assert.ok(kotabach.length > 0, 'השף שובץ לעמדת טבח');
    assert.ok(kotabach.some((e) => e.nimuk.derug.includes('שף כטבח')));
    for (const key of new Set(r.emdot.filter((e) => e.mesima === 'pas_cham').map((e) => e.mishmeret))) {
      assert.equal(r.emdot.filter((e) => e.mishmeret === key && e.tafkid === 'shef').length, 1, 'עמדת שף אחת בפס חם');
    }
  }
});

test('שף יכול לשמש כטבח — כבוי: שף לא משובץ לעמדת טבח, ושיבוץ ידני כזה הוא הפרה', () => {
  const hagdarot = { shef_kotabach: false };
  const { ovdim, tzevatim, out, nochechut } = harez({ yamim: 1, chaserim: ['יוסי'], shinuy: hosefShef, hagdarot });
  const r = out[0];
  assert.ok(!r.emdot.some((e) => e.oved_id === 200 && e.tafkid !== 'shef'));
  const emdot = structuredClone(r.emdot);
  const pk = emdot.find((e) => e.mesima === 'pas_kar' && dakotLeshaa(e.hatchala) === '06:00');
  pk.oved_id = 200;
  const hx = bneHeksher({ taarich: PTIHA, hagdarot, ovdim, tzevatim, historia: [], nochechut });
  assert.ok(bdika(hx, emdot, r.dgalim).hafarot.some((h) => h.sug === 'tafkid' && h.oved_id === 200));
});
