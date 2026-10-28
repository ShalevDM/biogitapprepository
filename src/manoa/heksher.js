// הקשר לבניית שיבוץ: עובדים, צוותים, ומשמרות קודמות/באות לכל עובד
import { hagdarotMale } from '../hagdarot.js';
import { muchlat, isoLemuchlat, hosefYamim, YOM } from '../zman.js';
import { mishmarotYom, shlavTzevet } from './mishmarot.js';
import { madadeiHogenut } from './hogenut.js';

export function shuraLemishmeret(r) {
  const hatchala = isoLemuchlat(r.hatchala);
  return {
    mesima: r.mesima, emda: r.emda,
    hatchala,
    nominal: r.hatchala_mishmeret ? isoLemuchlat(r.hatchala_mishmeret) : hatchala,
    siyum: isoLemuchlat(r.siyum),
    taarich: r.taarich, makor: 'historia',
  };
}

/**
 * input: { taarich, hagdarot, ovdim, tzevatim, historia, nochechut, bechofesh }
 *  ovdim: [{ id, shem, tafkid, tagiot, status, tzevet_id, bemaagar_pas_kar, seder }]
 *  tzevatim: [{ id, shem, ogen_pas_cham, seder }]
 *  historia: [{ oved_id, mesima, emda, hatchala, siyum, hatchala_mishmeret, taarich }]
 *  nochechut: { [oved_id]: 'nimtza' | 'bechofesh' } ליום המשובץ
 *  bechofesh: { [oved_id]: [taarich...] } ימים קודמים שבהם העובד היה בחופש
 */
export function bneHeksher(input) {
  const h = hagdarotMale(input.hagdarot);
  const taarich = input.taarich;
  const H0 = muchlat(taarich, h.yom_hatchala);
  const H1 = H0 + YOM;
  const N = h.pas_cham.mishmarot.length;

  const tzevatim = [...(input.tzevatim || [])].sort((a, b) => (a.seder ?? 0) - (b.seder ?? 0) || a.id - b.id);
  const n = tzevatim.length;
  const tzevetIds = new Set(tzevatim.map((t) => t.id));

  const ovdim = (input.ovdim || []).map((o) => {
    const status = input.nochechut?.[o.id] ?? o.status ?? 'nimtza';
    const tzevet_id = tzevetIds.has(o.tzevet_id) ? o.tzevet_id : null;
    const bemaagar = !!o.bemaagar_pas_kar && o.tafkid !== 'minhalan';
    return {
      ...o, tagiot: o.tagiot || [], status, nimtza: status === 'nimtza', tzevet_id, bemaagar,
      odef: status === 'nimtza' && o.tafkid !== 'minhalan' && !tzevet_id && !bemaagar,
    };
  }).sort((a, b) => a.id - b.id);
  const byId = new Map(ovdim.map((o) => [o.id, o]));

  const mishmarot = new Map(ovdim.map((o) => [o.id, []]));
  const shurot = (input.historia || []).filter((r) => r.taarich !== taarich && byId.has(r.oved_id));
  for (const r of shurot) {
    const x = shuraLemishmeret(r);
    mishmarot.get(r.oved_id).push(x);
  }

  const chavrei = (t) => ovdim.filter((o) => o.tzevet_id === t.id && o.nimtza && o.tafkid !== 'minhalan');
  const hosefMachzor = (yom, makor, rakIdx) => {
    for (const sh of mishmarotYom(yom, h)) {
      if (sh.mesima !== 'pas_cham' && sh.mesima !== 'hachanot') continue;
      if (rakIdx && !rakIdx.includes(sh.idx)) continue;
      for (const t of tzevatim) {
        if (shlavTzevet(t, sh.g, n) !== sh.mesima) continue;
        for (const o of chavrei(t)) {
          mishmarot.get(o.id).push({ mesima: sh.mesima, hatchala: sh.hatchala, nominal: sh.nominal, siyum: sh.siyum, makor });
        }
      }
    }
  };

  // לפני היום הראשון בהיסטוריה (מצב הפתיחה) ממשיכים לפי מחזור הצוותים. משמש לכללי המנוחה
  // כשאין עדיין היסטוריה, ולזיהוי מנוחות מורחבות של מי שעוד לא עבד מאז מצב הפתיחה.
  const rishon = shurot.reduce((m, r) => (r.taarich < m ? r.taarich : m), taarich);
  if (n && rishon > hosefYamim(taarich, -15)) hosefMachzor(hosefYamim(rishon, -1), 'virtuali');

  // המשמרות הקרובות של מחר (לפי המחזור) מוגנות בכללי המנוחה
  const yeshMachar = shurot.some((r) => r.taarich === hosefYamim(taarich, 1));
  if (!yeshMachar && n) hosefMachzor(hosefYamim(taarich, 1), 'tachazit', [0, 1]);

  const bechofesh = new Map(Object.entries(input.bechofesh || {}).map(([k, v]) => [Number(k), new Set(v)]));
  const madadim = madadeiHogenut(ovdim, mishmarot, H0, h, bechofesh);

  return { h, taarich, H0, H1, N, n, tzevatim, ovdim, byId, mishmarot, madadim, mishmarotYom: mishmarotYom(taarich, h) };
}
