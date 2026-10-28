// מדדי הוגנות לכל עובד, מחושבים מההיסטוריה
import { YOM, yomLetaarich } from '../zman.js';

export function huLayla(x) {
  const m = ((x.nominal ?? x.hatchala) % YOM + YOM) % YOM;
  return m >= 22 * 60 || m < 6 * 60;
}

function chafifa(a1, a2, b1, b2) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

// מנוחות מורחבות: הפסקה בין משמרות שאורכה לפחות הסף, כשהעובד לא היה בחופש באמצע.
// כולל מנוחה שעדיין נמשכת ברגע "akshav".
export function menuchotMurchavot(mishmarot, saf, bechofesh, akshav = null) {
  const m = [...mishmarot].sort((a, b) => a.hatchala - b.hatchala);
  const out = [];
  let sof = null;
  const bdok = (hatchala, siyum) => {
    if (siyum - hatchala < saf) return;
    for (let d = Math.floor(hatchala / YOM); d <= Math.floor((siyum - 1) / YOM); d++) {
      if (bechofesh?.has(yomLetaarich(d))) return;
    }
    out.push({ hatchala, siyum });
  };
  for (const x of m) {
    if (sof != null) bdok(sof, x.hatchala);
    sof = sof == null ? x.siyum : Math.max(sof, x.siyum);
  }
  if (akshav != null && sof != null && sof < akshav) bdok(sof, akshav);
  return out;
}

// mishmarotLeoved: Map oved_id → משמרות. שעות ומונים נספרים רק מהיסטוריה אמיתית; משמרות לפי מצב
// הפתיחה (virtuali) משמשות רק לזיהוי מנוחות. bechofesh: Map oved_id → Set(taarich)
export function madadeiHogenut(ovdim, mishmarotLeoved, akshav, h, bechofesh = new Map()) {
  const out = new Map();
  const saf = h.menucha_murchevet_shaot * 60;
  for (const o of ovdim) {
    const kol = (mishmarotLeoved.get(o.id) || []).filter((x) => x.hatchala < akshav && x.makor !== 'tachazit' && x.makor !== 'tyuta');
    const m = kol.filter((x) => x.makor !== 'virtuali');
    const d7 = akshav - 7 * YOM;
    const d14 = akshav - 14 * YOM;
    let dakot7 = 0, dakot14 = 0, layla14 = 0, pasKar14 = 0, hachanot14 = 0;
    for (const x of m) {
      dakot7 += chafifa(x.hatchala, x.siyum, d7, akshav);
      dakot14 += chafifa(x.hatchala, x.siyum, d14, akshav);
      if (x.hatchala >= d14) {
        if (huLayla(x)) layla14++;
        if (x.mesima === 'pas_kar') pasKar14++;
        if (x.mesima === 'hachanot') hachanot14++;
      }
    }
    // מנוחה מורחבת רלוונטית לחברי צוותים ולמאגר פס קר, לא למנהלנים
    const murch = o.tafkid === 'minhalan' ? []
      : menuchotMurchavot(kol, saf, bechofesh.get(o.id), akshav).filter((r) => r.siyum >= d14 && r.siyum <= akshav);
    out.set(o.id, {
      dakot7, dakot14, layla14, pasKar14, hachanot14,
      murchevet14: murch.length,
      murchevetAcharona: murch.length ? murch[murch.length - 1].hatchala : null,
    });
  }
  return out;
}
