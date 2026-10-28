// ייצוא: טקסט מסודר להדבקה בוואטסאפ, לפי משימה ושעה
import { MESIMOT, EMDOT, MATZAVIM } from '../munachim.js';
import { dakotLeshaa, taarichTxt } from '../zman.js';

export function kvutzotMishmarot(emdot) {
  const out = new Map();
  for (const e of emdot) {
    if (!out.has(e.mishmeret)) out.set(e.mishmeret, []);
    out.get(e.mishmeret).push(e);
  }
  return [...out.values()];
}

export function yetzuWhatsapp(shibutz, ovdim, tzevatim) {
  const shem = (id) => ovdim.find((o) => o.id === id)?.shem ?? '— חסר —';
  const tzevet = (id) => tzevatim.find((t) => t.id === id)?.shem;
  const shurot = [];
  shurot.push(`*שיבוץ צוות מטבח — ${taarichTxt(shibutz.taarich)} (06:00–06:00)*`);
  shurot.push(`מצב: ${MATZAVIM[shibutz.matzav]}`);
  const kvutzot = kvutzotMishmarot(shibutz.emdot);
  for (const mesima of ['pas_cham', 'hachanot', 'pas_kar', 'minhal']) {
    const sheli = kvutzot.filter((k) => k[0].mesima === mesima);
    if (!sheli.length) continue;
    shurot.push('');
    shurot.push(`*${MESIMOT[mesima]}*`);
    for (const k of sheli) {
      const e0 = k[0];
      const zman = `${dakotLeshaa(e0.hatchala)}\u200E–\u200E${dakotLeshaa(e0.siyum)}`;
      const t = e0.tzevet_id ? ` (${tzevet(e0.tzevet_id)})` : '';
      if (mesima === 'pas_cham') {
        shurot.push(`${e0.shem_mishmeret} ${zman}${t}`);
        for (const emda of [...new Set(k.map((e) => e.emda))]) {
          const em = k.filter((e) => e.emda === emda);
          shurot.push(`  ${EMDOT[emda]}: ${em.map((e) => shem(e.oved_id) + (e.tafkid === 'shef' ? ' (שף)' : '')).join(', ')}`);
        }
      } else if (mesima === 'hachanot') {
        shurot.push(`${e0.shem_mishmeret} ${zman}${t}: ${k.map((e) => shem(e.oved_id) + (e.tafkid === 'shef' ? ' (שף)' : '')).join(', ')}`);
      } else {
        shurot.push(`${zman}: ${k.map((e) => shem(e.oved_id)).join(', ')}`);
      }
    }
  }
  if (shibutz.menuchot?.length) {
    shurot.push('');
    shurot.push('*מנוחה מורחבת*');
    shurot.push(shibutz.menuchot.map((m) => shem(m.oved_id) + (m.sug === 'yom_menucha_male' ? ' (יום מנוחה מלא)' : '')).join(', '));
  }
  return shurot.join('\n');
}
