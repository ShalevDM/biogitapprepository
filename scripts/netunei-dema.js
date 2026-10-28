// נתוני דמה: 30 עובדים — 4 שפים, 4 מנהלנים, והשאר טבחים עם תגיות מגוונות
import { taarichLeyom } from '../src/zman.js';

const SHEFIM = ['דנה', 'אורי', 'מיכל', 'רועי'];
const MINHALANIM = ['שירה', 'עמית', 'נועה', 'גיל'];
const TABACHIM = [
  'יוסי', 'משה', 'אבי', 'רון', 'עידו',
  'תמר', 'ליאור', 'אסף', 'נדב', 'יעל',
  'אלון', 'הילה', 'עומר', 'שקד', 'בני',
  'מאיה', 'דור', 'רז', 'ניר', 'טל',
  'אביב', 'ספיר',
];

// תגיות לכל טבח (לפי הסדר). כל צוות מכסה את כל ארבע התגיות כשהוא מלא.
const TAGIOT_TABACHIM = [
  ['eged'], ['mashgiach_kashrut'], ['yerakot', 'tavlin'], [], ['tavlin'],
  ['eged', 'yerakot'], ['mashgiach_kashrut'], ['tavlin'], [], ['yerakot'],
  ['mashgiach_kashrut', 'eged'], ['tavlin'], [], ['yerakot'], ['eged'],
  ['tavlin', 'mashgiach_kashrut'], ['eged'], ['yerakot'], [], ['tavlin'],
  ['eged', 'mashgiach_kashrut'], ['yerakot', 'tavlin'],
];
const TAGIOT_SHEFIM = [['mashgiach_kashrut'], [], ['eged'], ['yerakot']];

/**
 * taarichPtiha: יום שבמשמרת הבוקר שלו צוות 1 בפס חם, צוות 2 במנוחה אחרי פס חם,
 * צוות 3 בהכנות וצוות 4 במנוחה אחרי הכנות.
 */
export function netuneiDema(taarichPtiha, N = 3) {
  const gRef = taarichLeyom(taarichPtiha) * N;
  const tzevatim = [0, 1, 2, 3].map((i) => ({ id: i + 1, shem: `צוות ${i + 1}`, seder: i, ogen_pas_cham: gRef - i }));
  const ovdim = [];
  let id = 1;
  SHEFIM.forEach((shem, i) => ovdim.push({ id: id++, shem, tafkid: 'shef', tagiot: TAGIOT_SHEFIM[i], status: 'nimtza', tzevet_id: i + 1, bemaagar_pas_kar: 0, seder: 0 }));
  TABACHIM.forEach((shem, i) => {
    const tzevet = i < 20 ? Math.floor(i / 5) + 1 : null;
    ovdim.push({
      id: id++, shem, tafkid: 'tabach', tagiot: TAGIOT_TABACHIM[i], status: 'nimtza',
      tzevet_id: tzevet, bemaagar_pas_kar: tzevet ? 0 : 1, seder: (i % 5) + 1,
    });
  });
  MINHALANIM.forEach((shem) => ovdim.push({ id: id++, shem, tafkid: 'minhalan', tagiot: [], status: 'nimtza', tzevet_id: null, bemaagar_pas_kar: 0, seder: 0 }));
  for (const o of ovdim) { o.hearot = ''; o.taarich_chazara = null; }
  return { ovdim, tzevatim };
}
