// בדיקת שיבוץ: הפרות (כללים קשיחים) ואזהרות (כללים רכים). רצה אחרי יצירה ואחרי כל עריכה ידנית.
import { TAGIOT, MESIMOT, EMDOT, TAFKIDIM } from '../munachim.js';
import { dakotLeshaa, shaotTxt } from '../zman.js';
import { bdokZug, hu88, menuchaNidreshet, sofMenucha, mataimTafkid } from './kshichim.js';

function tavitEmda(e) {
  const sh = e.shem_mishmeret ? ` ${e.shem_mishmeret}` : ` ${dakotLeshaa(e.hatchala)}\u200E–\u200E${dakotLeshaa(e.siyum)}`;
  return `${MESIMOT[e.mesima]}${sh}`;
}


export function bdika(hx, emdot, dgalim) {
  const h = hx.h;
  const hafarot = [];
  const azharot = [];
  const haf = (sug, txt, ids = [], oved_id = null) => hafarot.push({ chumra: 'hafara', sug, txt, emdot: ids, oved_id });
  const azh = (sug, txt, ids = [], oved_id = null) => azharot.push({ chumra: 'azhara', sug, txt, emdot: ids, oved_id });

  // איוש
  for (const e of emdot) {
    if (e.oved_id) continue;
    const t = `${tavitEmda(e)} · ${EMDOT[e.emda]}: חסר ${TAFKIDIM[e.tafkid] || 'אדם'}`;
    if (e.mesima === 'pas_cham' || e.mesima === 'hachanot') haf('chaser', `${t} — ${MESIMOT[e.mesima]} לא יורד לעולם מתחת להרכב המלא`, [e.id]);
    else azh('chaser', t, [e.id]);
  }

  // תפקיד וסטטוס
  for (const e of emdot.filter((x) => x.oved_id)) {
    const o = hx.byId.get(e.oved_id);
    if (!o) { haf('oved', `${tavitEmda(e)}: עובד לא קיים`, [e.id]); continue; }
    if (!o.nimtza && !e.butza) haf('status', `${o.shem} מסומן "בחופש" אבל משובץ ל${tavitEmda(e)}`, [e.id], o.id);
    if (!mataimTafkid(o, e, h)) {
      const lama = o.tafkid === 'minhalan' ? 'מנהלן משובץ רק למשימת "מנהל"'
        : e.tafkid === 'pas_kar' ? 'פס קר מאויש ממאגר פס קר או מטבחים'
          : `העמדה דורשת ${TAFKIDIM[e.tafkid]}`;
      haf('tafkid', `${o.shem} (${TAFKIDIM[o.tafkid]}) ב${tavitEmda(e)} · ${EMDOT[e.emda]}: ${lama}`, [e.id], o.id);
    }
  }

  // מנוחה וחפיפה (כל זוג משמרות של אותו אדם שאחת מהן בשיבוץ הזה)
  const lefiOved = new Map();
  for (const e of emdot.filter((x) => x.oved_id)) {
    if (!lefiOved.has(e.oved_id)) lefiOved.set(e.oved_id, []);
    lefiOved.get(e.oved_id).push({ mesima: e.mesima, hatchala: e.hatchala, nominal: e.nominal, siyum: e.siyum, makor: 'tyuta', emdaId: e.id, butza: e.butza });
  }
  const pasKarMuadaf = { ...dgalim, pas_kar_3_6: false };
  for (const [id, sheli] of lefiOved) {
    const o = hx.byId.get(id);
    if (!o) continue;
    const acherot = hx.mishmarot.get(id) || [];
    const kol = [...acherot, ...sheli];
    for (let i = 0; i < sheli.length; i++) {
      const x = sheli[i];
      const neged = [...acherot, ...sheli.slice(i + 1)];
      for (const y of neged) {
        if (x.butza && (y.butza || y.makor !== 'tyuta')) continue;
        const p = bdokZug(x, y, h, dgalim);
        const ids = [x.emdaId, y.emdaId].filter(Boolean);
        if (p) {
          if (p.sug === 'chafifa') haf('chafifa', `${o.shem}: ${p.txt} — אדם לא משובץ לשתי משימות חופפות`, ids, id);
          else haf('menucha', `${o.shem}: ${p.txt}`, ids, id);
          continue;
        }
        if (dgalim.pas_kar_3_6) {
          const q = bdokZug(x, y, h, pasKarMuadaf);
          if (q && q.sug === 'menucha') azh('pas_kar_3_6', `${o.shem}: מנוחה של ${shaotTxt(q.pa)} אחרי פס קר (מצב מינימום 3/6; מועדף ${shaotTxt(q.nidrash)})`, ids, id);
        }
      }
      if (x.mesima === 'pas_cham' && hu88(kol.filter((y) => y.siyum <= x.hatchala), x)) {
        azh('cherum_8_8', `${o.shem}: מחזור 8/8 בפס חם (פס חם → מנוחה 8 → פס חם)${dgalim.cherum_8_8 ? ' — מצב חירום' : ''}`, [x.emdaId], id);
      }
    }
  }

  // כללים רכים
  const mishmarotPc = [...new Set(emdot.filter((e) => e.mesima === 'pas_cham').map((e) => e.mishmeret))];
  for (const key of mishmarotPc) {
    const em = emdot.filter((e) => e.mishmeret === key);
    const yesh = new Set(em.filter((e) => e.oved_id).flatMap((e) => hx.byId.get(e.oved_id)?.tagiot || []));
    const chaserot = h.pas_cham.tagiot_retzuyot.filter((t) => !yesh.has(t));
    if (chaserot.length) {
      azh('tagiot', `${tavitEmda(em[0])}: אין ${chaserot.map((t) => TAGIOT[t]).join(', ')} במשמרת (פס חם א + ב)`, em.map((e) => e.id));
    }
  }

  const tzevet = (id) => hx.tzevatim.find((t) => t.id === id);
  for (const e of emdot.filter((x) => x.oved_id && x.tzevet_id)) {
    const o = hx.byId.get(e.oved_id);
    if (!o || o.tzevet_id === e.tzevet_id) continue;
    const makor = o.tzevet_id ? tzevet(o.tzevet_id)?.shem : o.bemaagar ? 'מאגר פס קר' : 'ללא צוות';
    azh('tzevet', `${tzevet(e.tzevet_id)?.shem} · ${tavitEmda(e)}: ${o.shem} (${makor}) מחליף בצוות`, [e.id], o.id);
  }

  for (const e of emdot.filter((x) => x.oved_id && x.mesima === 'pas_kar')) {
    const o = hx.byId.get(e.oved_id);
    if (o && !o.bemaagar && !o.odef) {
      azh('pas_kar_menucha', `${o.shem} שובץ לפס קר ${dakotLeshaa(e.hatchala)}\u200E–\u200E${dakotLeshaa(e.siyum)} במקום מנוחה ארוכה (המאגר לא מספיק)`, [e.id], o.id);
    }
  }

  return { hafarot, azharot };
}

export { menuchaNidreshet, sofMenucha };
