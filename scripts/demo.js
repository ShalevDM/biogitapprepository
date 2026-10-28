// הרצת שלושה תרחישים על נתוני הדמה: מצב מלא, חוסר של 5 אנשים, חוסר של 10 אנשים.
// כל תרחיש רץ 7 ימים ברצף (כל יום מתפרסם להיסטוריה וממשיך ממנו), ונכתב דוח ל-docs/totzaot-demo.md
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { netuneiDema } from './netunei-dema.js';
import { yetzorShibutz } from '../src/manoa/index.js';
import { emdotLehistoria } from '../src/manoa/historia.js';
import { yetzuWhatsapp } from '../src/manoa/yetzu.js';
import { madadeiHogenut } from '../src/manoa/hogenut.js';
import { shuraLemishmeret } from '../src/manoa/heksher.js';
import { hagdarotMale } from '../src/hagdarot.js';
import { hosefYamim, muchlat, shaotTxt, taarichTxt } from '../src/zman.js';
import { MATZAVIM, MESIMOT, TAFKIDIM } from '../src/munachim.js';

const TAARICH_PTIHA = '2026-11-01';
const YAMIM = 7;

const TARCHISHIM = [
  { shem: 'מצב מלא', chaserim: [] },
  // טבח אחד מכל צוות + מנהלן
  { shem: 'חוסר של 5 אנשים', chaserim: ['עידו', 'יעל', 'בני', 'טל', 'גיל'] },
  // שני טבחים מכל צוות + אחד ממאגר פס קר + מנהלן
  { shem: 'חוסר של 10 אנשים', chaserim: ['רון', 'עידו', 'נדב', 'יעל', 'שקד', 'בני', 'ניר', 'טל', 'ספיר', 'גיל'] },
];

function harezTarchish(t) {
  const { ovdim, tzevatim } = netuneiDema(TAARICH_PTIHA);
  const chaserim = new Set(t.chaserim.map((shem) => ovdim.find((o) => o.shem === shem).id));
  const nochechut = Object.fromEntries(ovdim.map((o) => [o.id, chaserim.has(o.id) ? 'bechofesh' : 'nimtza']));
  const historia = [];
  const yamim = [];
  let taarich = TAARICH_PTIHA;
  for (let i = 0; i < YAMIM; i++) {
    const r = yetzorShibutz({ taarich, hagdarot: {}, ovdim, tzevatim, historia, nochechut });
    yamim.push(r);
    historia.push(...emdotLehistoria(taarich, r.emdot));
    taarich = hosefYamim(taarich, 1);
  }
  return { ...t, ovdim, tzevatim, chaserim, historia, yamim, sof: taarich };
}

function sikumYom(r) {
  const chaserot = r.emdot.filter((e) => !e.oved_id);
  const lefi = (m) => chaserot.filter((e) => e.mesima === m).length;
  const kshichim = r.hafarot.filter((h) => h.sug !== 'chaser').length;
  return { chaserPc: lefi('pas_cham'), chaserHc: lefi('hachanot'), chaserPk: lefi('pas_kar'), chaserMn: lefi('minhal'), kshichim, azharot: r.azharot.length, menuchot: r.menuchot.length };
}

function madadimSof(res) {
  const h = hagdarotMale({});
  const m = new Map(res.ovdim.map((o) => [o.id, []]));
  for (const r of res.historia) m.get(r.oved_id).push(shuraLemishmeret(r));
  return madadeiHogenut(res.ovdim, m, muchlat(res.sof, h.yom_hatchala), h);
}

const shurot = [];
const p = (s = '') => shurot.push(s);

p('# תוצאות הרצת הדמה');
p();
p(`נתוני דמה: 30 עובדים — 4 שפים, 4 מנהלנים ו-22 טבחים עם תגיות מגוונות. 4 צוותים (שף + 5 טבחים), 2 טבחים במאגר פס קר.`);
p(`מצב פתיחה: ב-${TAARICH_PTIHA} בוקר — צוות 1 בפס חם, צוות 2 במנוחה אחרי פס חם, צוות 3 בהכנות, צוות 4 במנוחה אחרי הכנות.`);
p(`כל תרחיש רץ ${YAMIM} ימים ברצף: כל יום מתפרסם להיסטוריה, והיום הבא ממשיך ממנה (מנוחה, רוטציה והוגנות).`);
p();
p('הדוח נוצר על ידי `npm run demo`.');

for (const t of TARCHISHIM) {
  const res = harezTarchish(t);
  const shem = (id) => res.ovdim.find((o) => o.id === id)?.shem;
  p();
  p(`## ${t.shem}`);
  p();
  p(t.chaserim.length ? `בחופש: ${t.chaserim.join(', ')}.` : 'כולם נמצאים.');
  p();
  const y0 = res.yamim[0];
  p(`### נדרש מול קיים`);
  p();
  p('| משימה | תפקיד | נדרש | קיים | פער |');
  p('|---|---|---|---|---|');
  for (const s of y0.nidrash.shurot) if (s.kayam != null) p(`| ${MESIMOT[s.mesima]} | ${s.tavit} | ${s.nidrash} | ${s.kayam} | ${s.paar} |`);
  p();
  p('### סיכום לפי יום');
  p();
  p('| יום | מצב | ויתורים | חסר פס חם | חסר הכנות | חסר פס קר | חסר מנהל | הפרות קשיחות (חוץ מחוסר) | אזהרות | מנוחות מורחבות |');
  p('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of res.yamim) {
    const s = sikumYom(r);
    p(`| ${taarichTxt(r.taarich)} | ${MATZAVIM[r.matzav]} | ${r.vitur.length ? r.vitur.length : '—'} | ${s.chaserPc} | ${s.chaserHc} | ${s.chaserPk}/8 | ${s.chaserMn} | ${s.kshichim} | ${s.azharot} | ${s.menuchot} |`);
  }
  p();
  p(`### מצב ולמה (יום ראשון)`);
  p();
  p(`**${MATZAVIM[y0.matzav]}**`);
  for (const s of y0.sibot) p(`- ${s.replace(/‎/g, '')}`);
  if (y0.hafarot.length) {
    p();
    p(`**התראה — ${y0.hafarot.length} הפרות, הפרסום דורש אישור ידני:**`);
    for (const h of y0.hafarot.slice(0, 8)) p(`- ${h.txt.replace(/‎/g, '')}`);
  }
  const sugei = {};
  for (const a of y0.azharot) sugei[a.sug] = (sugei[a.sug] || 0) + 1;
  p();
  p(`אזהרות ביום הראשון לפי סוג: ${Object.entries(sugei).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'אין'}`);
  p();
  p('### השיבוץ של היום הראשון (כפי שהוא מיוצא לוואטסאפ)');
  p();
  p('```');
  p(yetzuWhatsapp(y0, res.ovdim, res.tzevatim).replace(/‎/g, ''));
  p('```');
  p();
  p(`### הוגנות אחרי ${YAMIM} ימים`);
  p();
  const mad = madadimSof(res);
  p('| תפקיד | עובדים | שעות עבודה 7 ימים (מינ׳–מקס׳) | פס קר (מינ׳–מקס׳) | לילות (מינ׳–מקס׳) | מנוחות מורחבות (מינ׳–מקס׳) |');
  p('|---|---|---|---|---|---|');
  for (const tafkid of ['shef', 'tabach', 'minhalan']) {
    const o = res.ovdim.filter((x) => x.tafkid === tafkid && !res.chaserim.has(x.id)).map((x) => mad.get(x.id));
    if (!o.length) continue;
    const tv = (k, f = (x) => x) => `${f(Math.min(...o.map((x) => x[k])))}–${f(Math.max(...o.map((x) => x[k])))}`;
    p(`| ${TAFKIDIM[tafkid]} | ${o.length} | ${tv('dakot7', (x) => shaotTxt(x))} | ${tv('pasKar14')} | ${tv('layla14')} | ${tv('murchevet14')} |`);
  }
  const pk = res.ovdim.filter((x) => x.tafkid === 'tabach' && !res.chaserim.has(x.id))
    .map((x) => `${x.shem} ${mad.get(x.id).pasKar14}`).join(' · ');
  p();
  p(`משמרות פס קר לכל טבח: ${pk}`);
  console.log(`${t.shem}: ${res.yamim.map((r) => MATZAVIM[r.matzav]).join(', ')}`);
  void shem;
}

const docs = fileURLToPath(new URL('../docs/', import.meta.url));
mkdirSync(docs, { recursive: true });
writeFileSync(`${docs}totzaot-demo.md`, shurot.join('\n') + '\n');
console.log(`הדוח נכתב אל docs/totzaot-demo.md`);
