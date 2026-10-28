// מנוע השיבוץ: יצירת טיוטה ליממה, סדר הוויתור, מצב (רגיל / חוסר / חירום) ובדיקה
import { MESIMOT, TAFKIDIM, VITURIM, TAGIOT } from '../munachim.js';
import { bneHeksher } from './heksher.js';
import { Bone } from './bone.js';
import { bdika } from './bdika.js';

const DGALIM_REIKIM = { minhal_tabach: false, pas_kar_3_6: false, cherum_8_8: false };

function dgalimMe(pailim) {
  const d = { ...DGALIM_REIKIM };
  for (const s of pailim) d[s] = true;
  return d;
}

// האם צעד ויתור יכול לעזור לעמדות שלא אוישו
function ozer(tzaad, chaserot) {
  const m = new Set(chaserot.map((e) => e.mesima));
  if (tzaad === 'minhal_tabach') return chaserot.length > 0;
  if (tzaad === 'pas_kar_3_6') return m.has('pas_kar') || m.has('pas_cham') || m.has('hachanot');
  if (tzaad === 'cherum_8_8') return m.has('pas_cham') || m.has('hachanot') || m.has('pas_kar');
  return false;
}

function sikumChaserot(chaserot) {
  const c = {};
  for (const e of chaserot) {
    const k = `${MESIMOT[e.mesima]}${e.tafkid === 'pas_kar' ? '' : ` (${TAFKIDIM[e.tafkid]})`}`;
    c[k] = (c[k] || 0) + 1;
  }
  return Object.entries(c).map(([k, v]) => `${v} ב${k}`).join(', ');
}

/**
 * input: ראו bneHeksher, ובנוסף kavuim: עמדות לשמירה [{ id, oved_id, naul, butza, nimuk }]
 */
export function yetzorShibutz(input) {
  const hx = bneHeksher(input);
  const kavuim = input.kavuim || [];
  const tzeadim = hx.h.seder_vitur.filter((s) => s.pail).map((s) => s.id);
  const pailim = [];
  const sibotVitur = [];
  let r = new Bone(hx, dgalimMe(pailim), kavuim).bne();
  for (const tzaad of tzeadim) {
    const chaserot = r.chaserot.filter((e) => e.tafkid !== 'minhalan');
    if (!chaserot.length) break;
    if (!ozer(tzaad, chaserot)) continue;
    pailim.push(tzaad);
    sibotVitur.push(`${VITURIM[tzaad]} — כי לא אוישו: ${sikumChaserot(chaserot)}`);
    r = new Bone(hx, dgalimMe(pailim), kavuim).bne();
  }
  const dgalim = dgalimMe(pailim);
  const bd = bdika(hx, r.emdot, dgalim);
  const nidrash = nidrashMulKayam(hx);
  const m = matzav(pailim, r, bd, nidrash, sibotVitur, hx);
  return {
    taarich: hx.taarich,
    H0: hx.H0,
    H1: hx.H1,
    emdot: r.emdot,
    menuchot: r.menuchot,
    vitur: pailim,
    dgalim,
    matzav: m.matzav,
    sibot: m.sibot,
    hafarot: bd.hafarot,
    azharot: [...r.beayot.map((b) => ({ chumra: 'azhara', sug: 'tzevet', txt: b.txt, emdot: [], oved_id: b.oved_id })), ...bd.azharot],
    nidrash,
    darush_ishur: bd.hafarot.length > 0,
  };
}

function matzav(pailim, r, bd, nidrash, sibotVitur, hx) {
  const sibot = [];
  const chaserKriti = r.chaserot.filter((e) => e.mesima === 'pas_cham' || e.mesima === 'hachanot');
  let mz = 'ragil';
  if (pailim.length) mz = 'choser';
  if (pailim.includes('cherum_8_8') || chaserKriti.length) mz = 'cherum';
  sibot.push(...sibotVitur);
  if (chaserKriti.length) {
    sibot.push(`אי אפשר לאייש במלואם את פס חם (6) ואת הכנות (4): חסרים ${sikumChaserot(chaserKriti)}. השיבוץ לא יתפרסם בלי אישור ידני.`);
  }
  const chaserotAcherot = r.chaserot.filter((e) => e.mesima !== 'pas_cham' && e.mesima !== 'hachanot');
  if (chaserotAcherot.length) sibot.push(`עמדות שלא אוישו גם אחרי הוויתורים: ${sikumChaserot(chaserotAcherot)}.`);
  const paarim = nidrash.shurot.filter((s) => s.paar < 0).map((s) => `${-s.paar} ${s.tavit}`);
  if (paarim.length) sibot.push(`נדרש מול קיים: חסרים ${paarim.join(', ')}.`);
  if (nidrash.odef.length) {
    sibot.push(`עודף: ${nidrash.odef.length} אנשים ללא צוות (${nidrash.odef.join(', ')}) — ${hx.h.odef === 'tzevet_chamishi' ? 'אפשר להקים צוות חמישי במסך מצב פתיחה' : 'מחולקים כמנוחה מורחבת ברוטציה (יום מנוחה מלא)'}.`);
  }
  if (!sibot.length) sibot.push('כל הצוותים מלאים, מאגר פס קר מספיק ל-3/9, ואין צורך בוויתורים.');
  if (bd.hafarot.length && !chaserKriti.length) sibot.push(`יש ${bd.hafarot.length} הפרות של כללים קשיחים — הפרסום דורש אישור ידני.`);
  return { matzav: mz, sibot };
}

// מסך "נדרש מול קיים"
export function nidrashMulKayam(hx) {
  const h = hx.h;
  const o = hx.ovdim.filter((x) => x.nimtza);
  const tzevatimNidrashim = 4;
  const pcTabach = h.pas_cham.emdot.reduce((s, e) => s + Number(e.tabach || 0), 0);
  const pcShef = h.pas_cham.emdot.reduce((s, e) => s + Number(e.shef || 0), 0);
  const tabachBatzevet = pcTabach;
  const minhalanimBechol = Math.max(0, ...h.minhal.mishmarot.map((m) => Number(m.minhalanim) || 0));
  const minhalanimNidrash = h.minhal.mishmarot.reduce((s, m) => s + (Number(m.minhalanim) || 0), 0);
  const tabachMinhal = h.minhal.mishmarot.reduce((s, m) => s + (Number(m.tabachim) || 0), 0);

  const shurot = [
    { mesima: 'pas_cham', tafkid: 'shef', tavit: 'שפים', bechol_rega: `${pcShef} בפס חם + ${h.hachanot.shef} בהכנות`, nidrash: tzevatimNidrashim * pcShef, kayam: o.filter((x) => x.tafkid === 'shef' && x.tzevet_id).length },
    { mesima: 'pas_cham', tafkid: 'tabach', tavit: 'טבחים בצוותים', bechol_rega: `${pcTabach} בפס חם + ${h.hachanot.tabach} בהכנות`, nidrash: tzevatimNidrashim * tabachBatzevet, kayam: o.filter((x) => x.tafkid === 'tabach' && x.tzevet_id).length },
    { mesima: 'pas_kar', tafkid: 'pas_kar', tavit: 'במאגר פס קר', bechol_rega: `${h.pas_kar.anashim}`, nidrash: h.pas_kar.maagar_muadaf, minimum: h.pas_kar.maagar_minimum, kayam: o.filter((x) => x.bemaagar).length },
    { mesima: 'minhal', tafkid: 'minhalan', tavit: 'מנהלנים', bechol_rega: `${minhalanimBechol}`, nidrash: minhalanimNidrash, kayam: o.filter((x) => x.tafkid === 'minhalan').length },
    { mesima: 'minhal', tafkid: 'tabach', tavit: 'טבחים למנהל', bechol_rega: `${tabachMinhal} (בחלק מהמשמרות)`, nidrash: tabachMinhal, kayam: null, hearot: 'מאויש מטבחים שסיימו מנוחה' },
  ];
  for (const s of shurot) s.paar = s.kayam == null ? 0 : s.kayam - s.nidrash;

  const tzevatim = hx.tzevatim.map((t) => {
    const kol = hx.ovdim.filter((x) => x.tzevet_id === t.id);
    const nimtzaim = kol.filter((x) => x.nimtza);
    const tagiot = new Set(nimtzaim.flatMap((x) => x.tagiot));
    return {
      id: t.id,
      shem: t.shem,
      shef: nimtzaim.filter((x) => x.tafkid === 'shef').length,
      tabachim: nimtzaim.filter((x) => x.tafkid === 'tabach').length,
      tabachim_nidrash: tabachBatzevet,
      bechofesh: kol.filter((x) => !x.nimtza).map((x) => x.shem),
      tagiot_chaserot: h.pas_cham.tagiot_retzuyot.filter((x) => !tagiot.has(x)).map((x) => TAGIOT[x]),
    };
  });
  return {
    shurot,
    tzevatim,
    odef: o.filter((x) => x.odef).map((x) => x.shem),
    bechofesh: hx.ovdim.filter((x) => !x.nimtza).map((x) => x.shem),
  };
}

export { bneHeksher, bdika };
export { DGALIM_REIKIM };
