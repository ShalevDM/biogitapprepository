// כללים קשיחים: מנוחה מינימלית וחפיפה
import { MESIMOT } from '../munachim.js';
import { dakotLeshaa, shaotTxt } from '../zman.js';

export function menuchaNidreshet(mesima, h, dgalim) {
  switch (mesima) {
    case 'pas_cham': return h.menucha.achrei_pas_cham * 60;
    case 'hachanot': return h.menucha.achrei_hachanot * 60;
    case 'pas_kar': return (dgalim.pas_kar_3_6 ? h.pas_kar.menucha_minimum : h.pas_kar.menucha_muadefet) * 60;
    case 'minhal': return h.menucha.achrei_minhal * 60;
    default: return 0;
  }
}

// עד מתי צריכה להימשך המנוחה שלפני משמרת (חריגת הכנת שחר: עד תחילת המשמרת)
export function sofMenucha(x, h) {
  return h.chariga_menucha_lifnei_boker && x.mesima === 'pas_cham' && x.nominal > x.hatchala ? x.nominal : x.hatchala;
}

export function tavitMishmeret(x) {
  const machar = x.makor === 'tachazit' ? ' (המשמרת הבאה לפי המחזור)' : '';
  const etmol = x.makor === 'virtuali' ? ' (לפי מצב הפתיחה)' : '';
  return `${MESIMOT[x.mesima]} ${dakotLeshaa(x.hatchala)}\u200E–\u200E${dakotLeshaa(x.siyum)}${machar}${etmol}`;
}

// בדיקת זוג משמרות של אותו אדם. מחזירה null או בעיה.
export function bdokZug(a, b, h, dgalim) {
  if (a.hatchala < b.siyum && b.hatchala < a.siyum) {
    return { sug: 'chafifa', txt: `${tavitMishmeret(a)} חופף ל${tavitMishmeret(b)}` };
  }
  const [rishona, shniya] = a.siyum <= b.hatchala ? [a, b] : [b, a];
  const pa = sofMenucha(shniya, h) - rishona.siyum;
  const nidrash = menuchaNidreshet(rishona.mesima, h, dgalim);
  if (pa < nidrash) {
    return {
      sug: 'menucha', pa, nidrash, rishona, shniya,
      txt: `מנוחה של ${shaotTxt(Math.max(pa, 0))} בלבד בין ${tavitMishmeret(rishona)} ל${tavitMishmeret(shniya)} (נדרש ${shaotTxt(nidrash)})`,
    };
  }
  return null;
}

// האם אפשר לשבץ אדם למשמרת x, לפי כל המשמרות האחרות שלו
export function bdokOved(mishmarotOved, x, h, dgalim) {
  for (const y of mishmarotOved) {
    if (y.emdaId && y.emdaId === x.emdaId) continue;
    const p = bdokZug(y, x, h, dgalim);
    if (p) {
      if (p.sug === 'chafifa') return `חופף ל${tavitMishmeret(y)}`;
      return p.txt;
    }
  }
  return null;
}

// התאמת תפקיד בסיס לעמדה
export function mataimTafkid(o, e, h) {
  const tabach = o.tafkid === 'tabach' || (o.tafkid === 'shef' && !!h.shef_kotabach);
  if (e.tafkid === 'pas_kar') return o.tafkid !== 'minhalan' && (o.bemaagar || tabach);
  if (e.tafkid === 'tabach') return tabach;
  return o.tafkid === e.tafkid;
}

// מחזור 8/8: פס חם שמתחיל או מסתיים פחות מ-16 שעות מפס חם אחר
export function hu88(mishmarotOved, x) {
  if (x.mesima !== 'pas_cham') return false;
  return mishmarotOved.some((y) => {
    if (y.mesima !== 'pas_cham' || (y.emdaId && y.emdaId === x.emdaId)) return false;
    const pa = y.siyum <= x.hatchala ? x.hatchala - y.siyum : y.hatchala - x.siyum;
    return pa >= 0 && pa < 16 * 60;
  });
}
