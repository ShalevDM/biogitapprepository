// מונחים: כל מזהה בקוד הוא תעתיק של מונח מהאפיון, וכאן מוגדר התווית שלו בממשק.

export const TAFKIDIM = {
  shef: 'שף',
  tabach: 'טבח',
  minhalan: 'מנהלן',
};

export const TAGIOT = {
  eged: 'אגד',
  mashgiach_kashrut: 'משגיח כשרות',
  yerakot: 'ירקות',
  tavlin: 'תבלין',
};

export const STATUSIM = {
  nimtza: 'נמצא',
  bechofesh: 'בחופש',
};

export const MESIMOT = {
  pas_cham: 'פס חם',
  hachanot: 'הכנות',
  pas_kar: 'פס קר',
  minhal: 'מנהל',
};

export const EMDOT = {
  pas_cham_a: 'פס חם א',
  pas_cham_b: 'פס חם ב',
  hachanot: 'הכנות',
  pas_kar: 'פס קר',
  minhal: 'מנהל',
};

export const MATZAVIM = {
  ragil: 'רגיל',
  choser: 'חוסר',
  cherum: 'חירום',
};

// סדר הוויתור במקרה של חוסר
export const VITURIM = {
  minhal_tabach: 'מוציאים את הטבח ממשמרת מנהל 00\u200E–\u200E06 (מנהלנים בלבד)',
  pas_kar_3_6: 'פס קר עובר ל-3/6',
  cherum_8_8: 'מצב חירום לפס חם: מחזור של 8/8',
};

export const ODEF = {
  yom_menucha_male: 'יום מנוחה מלא שעובר בין אנשים',
  tzevet_chamishi: 'צוות חמישי',
};

export const SHLAVEI_MACHZOR = {
  pas_cham: 'פס חם',
  menucha_achrei_pas_cham: 'מנוחה (אחרי פס חם)',
  hachanot: 'הכנות',
  menucha_achrei_hachanot: 'מנוחה (אחרי הכנות)',
  menucha: 'מנוחה',
};
