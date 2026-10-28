// משמרות ועמדות של יממה אחת (06:00–06:00)
import { muchlat, taarichLeyom, shaaLedakot, meshech, YOM } from '../zman.js';

export function mishmarotYom(taarich, h) {
  const H0 = muchlat(taarich, h.yom_hatchala);
  const yom = taarichLeyom(taarich);
  const rel = (hhmm) => (shaaLedakot(hhmm) - shaaLedakot(h.yom_hatchala) + YOM) % YOM;
  const N = h.pas_cham.mishmarot.length;
  const out = [];

  h.pas_cham.mishmarot.forEach((m, i) => {
    const nominal = H0 + rel(m.hatchala);
    const siyum = nominal + meshech(m.hatchala, m.siyum);
    const shachar = h.hachanat_shachar.pail && Number(h.hachanat_shachar.mishmeret) === i;
    const hakdama = shachar ? (shaaLedakot(m.hatchala) - shaaLedakot(h.hachanat_shachar.shaa) + YOM) % YOM : 0;
    const g = yom * N + i;
    out.push({ key: `pas_cham:${nominal}`, mesima: 'pas_cham', idx: i, shem: m.shem, g, nominal, hatchala: nominal - hakdama, siyum });
    out.push({ key: `hachanot:${nominal}`, mesima: 'hachanot', idx: i, shem: m.shem, g, nominal, hatchala: nominal, siyum });
  });

  const orech = Math.round(h.pas_kar.orech_shaot * 60);
  for (let t = 0; t + orech <= YOM; t += orech) {
    const hatchala = H0 + t;
    out.push({ key: `pas_kar:${hatchala}`, mesima: 'pas_kar', idx: t / orech, g: null, nominal: hatchala, hatchala, siyum: hatchala + orech });
  }

  h.minhal.mishmarot.forEach((m, i) => {
    const hatchala = H0 + rel(m.hatchala);
    out.push({
      key: `minhal:${hatchala}`, mesima: 'minhal', idx: i, g: null, nominal: hatchala, hatchala,
      siyum: hatchala + meshech(m.hatchala, m.siyum),
      minhalanim: Number(m.minhalanim) || 0, tabachim: Number(m.tabachim) || 0,
    });
  });

  const sederMesima = { pas_cham: 0, hachanot: 1, pas_kar: 2, minhal: 3 };
  out.sort((a, b) => a.nominal - b.nominal || sederMesima[a.mesima] - sederMesima[b.mesima]);
  return out;
}

// עמדות (מקומות לשיבוץ) של כל משמרת
export function tzorEmdot(mishmarot, h) {
  const emdot = [];
  const push = (sh, emda, tafkid, k, extra = {}) => emdot.push({
    id: `${sh.key}:${emda}:${tafkid}:${k}`,
    mishmeret: sh.key, mesima: sh.mesima, emda, tafkid, shem_mishmeret: sh.shem || null,
    g: sh.g, hatchala: sh.hatchala, nominal: sh.nominal, siyum: sh.siyum,
    tzevet_id: null, oved_id: null, naul: false, butza: false, nimuk: null, ...extra,
  });
  for (const sh of mishmarot) {
    if (sh.mesima === 'pas_cham') {
      for (const em of h.pas_cham.emdot) {
        for (let k = 0; k < (Number(em.shef) || 0); k++) push(sh, em.emda, 'shef', k);
        for (let k = 0; k < (Number(em.tabach) || 0); k++) push(sh, em.emda, 'tabach', k);
      }
    } else if (sh.mesima === 'hachanot') {
      for (let k = 0; k < h.hachanot.shef; k++) push(sh, 'hachanot', 'shef', k);
      for (let k = 0; k < h.hachanot.tabach; k++) push(sh, 'hachanot', 'tabach', k);
    } else if (sh.mesima === 'pas_kar') {
      for (let k = 0; k < h.pas_kar.anashim; k++) push(sh, 'pas_kar', 'pas_kar', k);
    } else if (sh.mesima === 'minhal') {
      for (let k = 0; k < sh.minhalanim; k++) push(sh, 'minhal', 'minhalan', k);
      for (let k = 0; k < sh.tabachim; k++) push(sh, 'minhal', 'tabach', k, { tabach_minhal: true });
    }
  }
  return emdot;
}

// מחזור צוות: פס חם → מנוחה → הכנות → מנוחה (→ מנוחה נוספת לכל צוות מעבר לארבעה)
export function shlaveiMachzor(n) {
  const basis = ['pas_cham', 'menucha_achrei_pas_cham', 'hachanot', 'menucha_achrei_hachanot'];
  if (n <= 4) return basis.slice(0, Math.max(n, 0));
  return [...basis, ...Array(n - 4).fill('menucha')];
}

export function shlavTzevet(tzevet, g, n) {
  if (!n || tzevet.ogen_pas_cham == null) return null;
  return shlaveiMachzor(n)[(((g - tzevet.ogen_pas_cham) % n) + n) % n];
}
