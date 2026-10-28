// הגדרות ברירת מחדל. כל ערך כאן ניתן לעריכה במסך "הגדרות" בלי לשנות קוד.

export const HAGDAROT_BRIRAT_MECHDAL = {
  yom_hatchala: '06:00',

  pas_cham: {
    mishmarot: [
      { shem: 'בוקר', hatchala: '06:00', siyum: '14:00' },
      { shem: 'צהריים', hatchala: '14:00', siyum: '22:00' },
      { shem: 'לילה', hatchala: '22:00', siyum: '06:00' },
    ],
    emdot: [
      { emda: 'pas_cham_a', shef: 1, tabach: 2 },
      { emda: 'pas_cham_b', shef: 0, tabach: 3 },
    ],
    tagiot_retzuyot: ['eged', 'mashgiach_kashrut', 'yerakot', 'tavlin'],
  },

  // הכנת שחר: צוות הבוקר של פס חם מתחיל בפועל בשעה זו
  hachanat_shachar: { pail: true, mishmeret: 0, shaa: '04:45' },

  // שף יכול לשמש גם כטבח (בעמדות טבח, בפס קר ובמנהל). עמדת השף נשארת: שף אחד בדיוק בפס חם א.
  shef_kotabach: true,

  // הכנות: באותן שעות של משמרות פס חם
  hachanot: { shef: 1, tabach: 3 },

  pas_kar: {
    anashim: 1,
    orech_shaot: 3,
    maagar_muadaf: 4,
    menucha_muadefet: 9,
    maagar_minimum: 3,
    menucha_minimum: 6,
  },

  minhal: {
    mishmarot: [
      { hatchala: '06:00', siyum: '12:00', minhalanim: 1, tabachim: 0 },
      { hatchala: '12:00', siyum: '18:00', minhalanim: 1, tabachim: 0 },
      { hatchala: '18:00', siyum: '00:00', minhalanim: 1, tabachim: 0 },
      { hatchala: '00:00', siyum: '06:00', minhalanim: 1, tabachim: 1 },
    ],
  },

  // מינימום מנוחה (שעות)
  menucha: {
    achrei_pas_cham: 8,
    achrei_hachanot: 8,
    achrei_minhal: 6,
  },

  // חריגה מותרת: המנוחה שלפני פס חם בוקר מסתיימת בהכנת שחר (נמדדת עד תחילת המשמרת)
  chariga_menucha_lifnei_boker: true,

  // סדר הוויתור במקרה של חוסר
  seder_vitur: [
    { id: 'minhal_tabach', pail: true },
    { id: 'pas_kar_3_6', pail: true },
    { id: 'cherum_8_8', pail: true },
  ],

  odef: 'yom_menucha_male',

  // הפסקה בין משמרות שנחשבת "מנוחה מורחבת" (שעות)
  menucha_murchevet_shaot: 16,
};

function mizug(basis, al) {
  if (Array.isArray(basis)) return Array.isArray(al) ? al : basis;
  if (basis && typeof basis === 'object') {
    const out = { ...basis };
    for (const k of Object.keys(al || {})) out[k] = k in basis ? mizug(basis[k], al[k]) : al[k];
    return out;
  }
  return al === undefined ? basis : al;
}

export function hagdarotMale(shmurot) {
  return mizug(structuredClone(HAGDAROT_BRIRAT_MECHDAL), shmurot || {});
}
