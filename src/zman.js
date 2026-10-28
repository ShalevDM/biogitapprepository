// זמנים: דקות מוחלטות לפי שעון קיר (ללא אזורי זמן), כדי ש"משמרת של 8 שעות" תהיה תמיד 8 שעות.

export const YOM = 1440;

export function taarichLeyom(taarich) {
  const [y, m, d] = taarich.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function yomLetaarich(yom) {
  return new Date(yom * 86400000).toISOString().slice(0, 10);
}

export function shaaLedakot(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function dakotLeshaa(dakot) {
  const m = ((dakot % YOM) + YOM) % YOM;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function muchlat(taarich, hhmm) {
  return taarichLeyom(taarich) * YOM + shaaLedakot(hhmm);
}

export function muchlatLeiso(dakot) {
  return `${yomLetaarich(Math.floor(dakot / YOM))}T${dakotLeshaa(dakot)}`;
}

export function isoLemuchlat(iso) {
  const [t, s] = iso.split('T');
  return muchlat(t, s.slice(0, 5));
}

export function hosefYamim(taarich, n) {
  return yomLetaarich(taarichLeyom(taarich) + n);
}

// משך בין שתי שעות באותה יממה (סיום לפני התחלה = עובר חצות)
export function meshech(hatchala, siyum) {
  const d = (shaaLedakot(siyum) - shaaLedakot(hatchala) + YOM) % YOM;
  return d === 0 ? YOM : d;
}

export function shaotTxt(dakot) {
  const h = Math.floor(dakot / 60);
  const m = dakot % 60;
  return m ? `${h}:${String(m).padStart(2, '0')} ש'` : `${h} ש'`;
}

const YEMEI_SHAVUA = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export function taarichTxt(taarich) {
  const yom = taarichLeyom(taarich);
  const dow = (((yom + 4) % 7) + 7) % 7; // 1970-01-01 היה יום ה'
  const [y, m, d] = taarich.split('-');
  return `יום ${YEMEI_SHAVUA[dow]}' ${Number(d)}.${Number(m)}.${y}`;
}
