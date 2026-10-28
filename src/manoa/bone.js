// בניית שיבוץ ליממה: פס חם → הכנות → פס קר → מנהל → אופטימיזציה של הכללים הרכים וההוגנות
import { TAGIOT, MESIMOT, EMDOT, TAFKIDIM } from '../munachim.js';
import { shaotTxt, dakotLeshaa } from '../zman.js';
import { tzorEmdot, shlavTzevet } from './mishmarot.js';
import { bdokOved, hu88 } from './kshichim.js';
import { huLayla } from './hogenut.js';

const cmp = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
};

export class Bone {
  constructor(hx, dgalim, kavuim = []) {
    this.hx = hx;
    this.h = hx.h;
    this.dgalim = dgalim;
    this.mishmarot = new Map([...hx.mishmarot].map(([k, v]) => [k, v.slice()]));
    this.madadim = new Map([...hx.madadim].map(([k, v]) => [k, { ...v }]));
    this.beayot = [];
    this.yomMenuchaMale = [];
    this.hachlafotTagiot = [];

    const kavuaLefiId = new Map(kavuim.map((k) => [k.id, k]));
    this.emdot = tzorEmdot(hx.mishmarotYom, this.h).filter((e) => {
      // ויתור: מוציאים את הטבח ממשמרת מנהל (אלא אם השיבוץ נעול)
      if (e.tabach_minhal && dgalim.minhal_tabach) {
        const k = kavuaLefiId.get(e.id);
        if (!k?.oved_id) { e.vitur = true; this.vitur_minhal = (this.vitur_minhal || 0) + 1; return false; }
      }
      return true;
    });
    for (const e of this.emdot) {
      if (e.mesima === 'pas_cham' || e.mesima === 'hachanot') {
        e.tzevet_id = this.tzevetBeshlav(e.g, e.mesima)?.id ?? null;
      }
    }
    for (const e of this.emdot) {
      const k = kavuaLefiId.get(e.id);
      if (!k) continue;
      e.naul = !!k.naul;
      e.butza = !!k.butza;
      if (k.oved_id && hx.byId.has(k.oved_id)) {
        this.shabetz(e, k.oved_id, k.nimuk || { txt: k.butza ? 'כבר בוצע — נשמר' : 'שיבוץ נעול — נשמר', derug: k.butza ? 'בוצע' : 'נעול' });
      }
    }
  }

  // ---------- עזרים ----------
  tzevetBeshlav(g, shlav) {
    return this.hx.tzevatim.find((t) => shlavTzevet(t, g, this.hx.n) === shlav) || null;
  }
  tzevet(id) { return this.hx.tzevatim.find((t) => t.id === id); }
  oved(id) { return this.hx.byId.get(id); }
  emdotMishmeret(key) { return this.emdot.filter((e) => e.mishmeret === key); }
  mishmarotOved(id) { return this.mishmarot.get(id); }
  mishmeretMeEmda(e) {
    return { mesima: e.mesima, hatchala: e.hatchala, nominal: e.nominal, siyum: e.siyum, makor: 'tyuta', emdaId: e.id };
  }

  shabetz(e, ovedId, nimuk) {
    e.oved_id = ovedId;
    e.nimuk = nimuk;
    this.mishmarot.get(ovedId).push(this.mishmeretMeEmda(e));
    const m = this.madadim.get(ovedId);
    m.dakot7 += e.siyum - e.hatchala;
    if (e.mesima === 'pas_kar') m.pasKar14++;
    if (e.mesima === 'hachanot') m.hachanot14++;
    if (huLayla(e)) m.layla14++;
  }

  batel(e) {
    const id = e.oved_id;
    if (id == null) return;
    const arr = this.mishmarot.get(id);
    arr.splice(arr.findIndex((x) => x.emdaId === e.id), 1);
    const m = this.madadim.get(id);
    m.dakot7 -= e.siyum - e.hatchala;
    if (e.mesima === 'pas_kar') m.pasKar14--;
    if (e.mesima === 'hachanot') m.hachanot14--;
    if (huLayla(e)) m.layla14--;
    e.oved_id = null;
    e.nimuk = null;
  }

  bdok(ovedId, e) {
    return bdokOved(this.mishmarot.get(ovedId), this.mishmeretMeEmda(e), this.h, this.dgalim);
  }

  mataimTafkid(o, e) {
    if (e.tafkid === 'pas_kar') return o.tafkid !== 'minhalan' && (o.bemaagar || o.tafkid === 'tabach');
    return o.tafkid === e.tafkid;
  }

  sofKodem(ovedId, e) {
    let s = null;
    for (const x of this.mishmarot.get(ovedId)) if (x.siyum <= e.hatchala && (s == null || x.siyum > s)) s = x.siyum;
    return s;
  }

  // מנוחה מלאה (9 ש') סביב משמרת פס קר
  menuchaMalaPasKar(ovedId, e) {
    const saf = this.h.pas_kar.menucha_muadefet * 60;
    return this.mishmarot.get(ovedId).every((x) => {
      if (x.siyum <= e.hatchala) return x.mesima !== 'pas_kar' || e.hatchala - x.siyum >= saf;
      if (x.hatchala >= e.siyum) return x.hatchala - e.siyum >= saf;
      return true;
    });
  }

  pirutMadadim(id) {
    const m = this.madadim.get(id);
    return `${shaotTxt(m.dakot7)} ב-7 ימים · ${m.pasKar14} פס קר · ${m.layla14} לילות · ${m.murchevet14} מנוחות מורחבות (14 יום)`;
  }

  // דירוג מועמדים לעמדה: כללים קשיחים → שכבת עדיפות → מפתח הוגנות → מספר עובד
  bchar(e, shichva, mafteach) {
    const ok = [];
    const nifsalim = [];
    for (const o of this.hx.ovdim) {
      if (!this.mataimTafkid(o, e)) continue;
      if (!o.nimtza) { nifsalim.push({ o, siba: 'בחופש' }); continue; }
      if (this.yomMenuchaMale.some((y) => y.oved_id === o.id)) { nifsalim.push({ o, siba: 'ביום מנוחה מלא' }); continue; }
      const p = this.bdok(o.id, e);
      if (p) { nifsalim.push({ o, siba: p }); continue; }
      const t = shichva(o);
      if (t.dchiya) { nifsalim.push({ o, siba: t.dchiya }); continue; }
      ok.push({ o, t, k: mafteach(o) });
    }
    ok.sort((a, b) => a.t.t - b.t.t || cmp(a.k, b.k) || a.o.id - b.o.id);
    return { ok, nifsalim };
  }

  nimukMeBchira(siba, res, sug, idx = 0) {
    const nivchar = res.ok[idx];
    return {
      sug,
      txt: siba,
      derug: nivchar ? nivchar.t.l : null,
      madadim: nivchar ? this.pirutMadadim(nivchar.o.id) : null,
      chalufot: res.ok.filter((_, i) => i !== idx).slice(0, 5).map((x) => ({ shem: x.o.shem, derug: x.t.l, pirut: this.pirutMadadim(x.o.id) })),
      nifsalim: res.nifsalim.filter((x) => x.siba !== 'בחופש').slice(0, 8).map((x) => ({ shem: x.o.shem, siba: x.siba })),
      bechofesh: res.nifsalim.filter((x) => x.siba === 'בחופש').length,
    };
  }

  tavitEmda(e) {
    const sh = e.shem_mishmeret ? ` ${e.shem_mishmeret}` : ` ${dakotLeshaa(e.hatchala)}\u200E–\u200E${dakotLeshaa(e.siyum)}`;
    return `${MESIMOT[e.mesima]}${sh} · ${EMDOT[e.emda]} (${TAFKIDIM[e.tafkid] || 'אדם אחד'})`;
  }

  // ---------- 1. פס חם: צוות שתורו לפי המחזור ----------
  sheledTzevet(mesima) {
    for (const sh of this.hx.mishmarotYom.filter((s) => s.mesima === mesima)) {
      const T = this.tzevetBeshlav(sh.g, mesima);
      if (!T) continue;
      const emdot = this.emdotMishmeret(sh.key);
      const kvarBaMishmeret = new Set(emdot.map((e) => e.oved_id).filter((x) => x != null));
      const chaverim = this.hx.ovdim
        .filter((o) => o.tzevet_id === T.id && o.nimtza && !kvarBaMishmeret.has(o.id))
        .sort((a, b) => (a.seder ?? 0) - (b.seder ?? 0) || a.id - b.id);
      const shemShlav = mesima === 'pas_cham' ? 'פס חם' : 'הכנות';

      for (const tafkid of ['shef', 'tabach']) {
        const pnuyot = emdot.filter((e) => e.tafkid === tafkid && !e.oved_id);
        let mi = chaverim.filter((o) => o.tafkid === tafkid);
        let menuchaTxt = '';
        if (mesima === 'hachanot' && tafkid === 'tabach' && mi.length > pnuyot.length) {
          // מנוחה מורחבת ניתנת למי שקיבל הכי מעט לאחרונה; בשוויון — למי שעבד הכי הרבה בהכנות לאחרונה
          // (כלומר היה פנוי הכי מעט פעמים). השאר עובדים בהכנות.
          const lemenucha = [...mi].sort((a, b) => {
            const ma = this.madadim.get(a.id), mb = this.madadim.get(b.id);
            return ma.murchevet14 - mb.murchevet14
              || (ma.murchevetAcharona ?? -Infinity) - (mb.murchevetAcharona ?? -Infinity)
              || mb.hachanot14 - ma.hachanot14 || a.id - b.id;
          });
          mi = [...lemenucha].reverse();
          const nachim = lemenucha.slice(0, mi.length - pnuyot.length);
          menuchaTxt = ` ${nachim.map((o) => o.shem).join(' ו')} קיבלו מנוחה מורחבת כי קיבלו פחות מנוחות מורחבות לאחרונה.`;
        }
        for (const o of mi) {
          if (!pnuyot.length) break;
          const p = this.bdok(o.id, pnuyot[0]);
          if (p) {
            this.beayot.push({ oved_id: o.id, txt: `${o.shem} (${T.shem}) לא שובץ ל${shemShlav} ${sh.shem}: ${p}` });
            continue;
          }
          const e = pnuyot.shift();
          this.shabetz(e, o.id, {
            sug: 'tzevet',
            txt: `חבר ${T.shem}: תור הצוות ב${shemShlav} במשמרת ${sh.shem} לפי המחזור (פס חם → מנוחה → הכנות → מנוחה).${menuchaTxt}`,
            derug: 'חבר הצוות',
            madadim: this.pirutMadadim(o.id),
          });
        }
      }
    }
  }

  // ---------- 2. השלמת חוסרים בפס חם ובהכנות ----------
  hashlamot(mesima) {
    const sederTafkid = { shef: 0, tabach: 1 };
    for (const sh of this.hx.mishmarotYom.filter((s) => s.mesima === mesima)) {
      const pnuyot = this.emdotMishmeret(sh.key).filter((e) => !e.oved_id)
        .sort((a, b) => sederTafkid[a.tafkid] - sederTafkid[b.tafkid]);
      for (const e of pnuyot) {
        const T = e.tzevet_id ? this.tzevet(e.tzevet_id) : null;
        const res = this.bchar(e, (o) => this.shichvatHashlama(o, e), (o) => {
          const m = this.madadim.get(o.id);
          return [m.dakot7, huLayla(e) ? m.layla14 : 0];
        });
        const siba = T ? `השלמת חוסר ב${T.shem}` : 'אין צוות שתורו במשמרת זו';
        if (res.ok.length) {
          const b = res.ok[0];
          this.shabetz(e, b.o.id, this.nimukMeBchira(`${siba}: ${b.t.l}; נבחר מבין המתאימים לפי הכי מעט שעות עבודה ב-7 הימים האחרונים.`, res, 'hashlama'));
        } else {
          e.nimuk = this.nimukMeBchira(`${siba}: אין אדם שעומד בכללים הקשיחים.`, res, 'chaser');
        }
      }
    }
  }

  shichvatHashlama(o, e) {
    const T = o.tzevet_id ? this.tzevet(o.tzevet_id) : null;
    let shichva;
    if (e.tzevet_id && o.tzevet_id === e.tzevet_id) shichva = { t: 0, l: 'חבר הצוות' };
    else if (o.odef) shichva = { t: 1, l: 'ללא צוות (עודף)' };
    // בחירום פס חם מאויש במחזור 8/8, ומאגר פס קר נשמר לפס קר
    else if (o.bemaagar) shichva = this.dgalim.cherum_8_8 ? { t: 5, l: 'מאגר פס קר' } : { t: 2, l: 'מאגר פס קר' };
    else shichva = { t: 3, l: T ? `מ${T.shem} (בזמן מנוחה)` : 'מחליף' };
    if (e.mesima === 'pas_cham' && hu88(this.mishmarot.get(o.id), this.mishmeretMeEmda(e))) {
      return this.dgalim.cherum_8_8
        ? { t: Math.max(4, shichva.t) + 0.5, l: `${shichva.l} · מחזור 8/8 (חירום)` }
        : { dchiya: 'מחייב מחזור 8/8 — רק במצב חירום' };
    }
    return shichva;
  }

  // ---------- 3. פס קר ----------
  // חיפוש מוגבל ודטרמיניסטי על כל משמרות היממה: קודם מקסימום משמרות מאוישות, אחר כך מינימום פגיעה
  // במנוחה הארוכה (שכבות העדיפות), ובשוויון — הסדר של כללי ההוגנות.
  pasKar() {
    const emdot = this.emdot.filter((x) => x.mesima === 'pas_kar' && !x.oved_id);
    const mechir = [0, 1, 4, 5];
    const mafteach = (e) => (o) => {
      const m = this.madadim.get(o.id);
      return [m.pasKar14, huLayla(e) ? m.layla14 : 0, this.sofKodem(o.id, e) ?? -Infinity, -m.murchevet14];
    };
    let best = null;
    let tzmatim = 0;
    const path = [];
    const dfs = (i, chaser, sach) => {
      if (best && (chaser > best.chaser || (chaser === best.chaser && sach >= best.sach))) return;
      if (i === emdot.length) { best = { chaser, sach, path: path.slice() }; return; }
      if (++tzmatim > 60000) return;
      const e = emdot[i];
      const res = this.bchar(e, (o) => this.shichvatPasKar(o, e), mafteach(e));
      res.ok.slice(0, 6).forEach((c, idx) => {
        this.shabetz(e, c.o.id, null);
        path.push({ e, idx, res });
        dfs(i + 1, chaser, sach + mechir[c.t.t]);
        path.pop();
        this.batel(e);
      });
      path.push({ e, idx: -1, res });
      dfs(i + 1, chaser + 1, sach);
      path.pop();
    };
    dfs(0, 0, 0);
    for (const { e, idx, res } of best.path) {
      if (idx < 0) {
        e.nimuk = this.nimukMeBchira('אין אדם שעומד בכללי המנוחה של פס קר.', { ok: [], nifsalim: res.nifsalim }, 'chaser');
        continue;
      }
      const b = res.ok[idx];
      const siba = idx === 0
        ? `${b.t.l}; שיבוץ לפס קר הולך למי שעשה הכי מעט משמרות פס קר, ואז למי שנח הכי הרבה זמן.`
        : `${b.t.l}; נבחר במקום ${res.ok[0].o.shem} (המדורג ראשון) כדי שכל משמרות פס קר ביממה יאוישו עם הכי מעט פגיעה במנוחה הארוכה.`;
      this.shabetz(e, b.o.id, this.nimukMeBchira(siba, res, 'pas_kar', idx));
    }
  }

  shichvatPasKar(o, e) {
    const maagar = o.bemaagar || o.odef;
    const tavit = o.bemaagar ? 'מאגר פס קר' : 'ללא צוות (עודף)';
    const mala = this.menuchaMalaPasKar(o.id, e);
    if (!this.dgalim.pas_kar_3_6) {
      return maagar ? { t: 0, l: `${tavit} (3/9)` } : { t: 1, l: 'סיים מנוחה של 8 שעות — נדרש לשמירה על 3/9 כי המאגר קטן מדי' };
    }
    if (maagar) return mala ? { t: 0, l: `${tavit} (3/9)` } : { t: 1, l: `${tavit} (3/6)` };
    return mala ? { t: 2, l: 'סיים מנוחה של 8 שעות (חוסר)' } : { t: 3, l: 'סיים מנוחה של 8 שעות (חוסר, 3/6)' };
  }

  // ---------- 4. מנהל ----------
  minhal() {
    // משמרות לילה קודם, כדי שהלילות יתחלקו לפי מי שעשה הכי מעט לילות (ולא ייפלו על מי שנשאר אחרון)
    const emdot = this.emdot.filter((x) => x.mesima === 'minhal' && !x.oved_id)
      .sort((a, b) => Number(huLayla(b)) - Number(huLayla(a)) || a.hatchala - b.hatchala);
    for (const e of emdot) {
      const tabach = e.tafkid === 'tabach';
      const res = this.bchar(e, (o) => {
        if (!tabach) return { t: 0, l: 'מנהלן' };
        return o.odef || o.bemaagar ? { t: 0, l: o.odef ? 'ללא צוות (עודף)' : 'מאגר פס קר' } : { t: 1, l: 'טבח שסיים מנוחה' };
      }, (o) => {
        const m = this.madadim.get(o.id);
        return huLayla(e) ? [m.layla14, m.dakot7, this.sofKodem(o.id, e) ?? -Infinity] : [m.dakot7, this.sofKodem(o.id, e) ?? -Infinity];
      });
      if (res.ok.length) {
        const b = res.ok[0];
        this.shabetz(e, b.o.id, this.nimukMeBchira(`${b.t.l}; ${huLayla(e) ? 'משמרת לילה: נבחר מי שעשה הכי מעט משמרות לילה, ואז הכי מעט שעות עבודה ב-7 הימים האחרונים.' : 'נבחר לפי הכי מעט שעות עבודה ב-7 הימים האחרונים, ואז הכי הרבה זמן מאז המשמרת הקודמת.'}`, res, 'minhal'));
      } else {
        e.nimuk = this.nimukMeBchira(tabach ? 'אין טבח פנוי למשמרת מנהל.' : 'אין מנהלן פנוי שעומד בכללי המנוחה.', res, 'chaser');
      }
    }
  }

  // ---------- 5. אופטימיזציה ----------
  emdotHachlafa(id) {
    return this.emdot.filter((e) => e.oved_id === id);
  }

  // החלפת כל השיבוצים של היממה בין שני אנשים. מחזיר פונקציית ביטול אם הצליח, אחרת null (והמצב חוזר לקדמותו)
  nasehHachlafa(a, b, nimukA, nimukB) {
    const ea = this.emdotHachlafa(a), eb = this.emdotHachlafa(b);
    if ([...ea, ...eb].some((e) => e.naul || e.butza)) return null;
    const oa = this.oved(a), ob = this.oved(b);
    if (!oa.nimtza || !ob.nimtza) return null;
    if (this.yomMenuchaMale.some((y) => y.oved_id === a || y.oved_id === b)) return null;
    if (!ea.every((e) => this.mataimTafkid(ob, e)) || !eb.every((e) => this.mataimTafkid(oa, e))) return null;
    const kodem = [...ea.map((e) => [e, a, e.nimuk]), ...eb.map((e) => [e, b, e.nimuk])];
    for (const e of [...ea, ...eb]) this.batel(e);
    const chadash = [];
    const shachzer = () => {
      for (const e of chadash) this.batel(e);
      for (const [e, mi, nimuk] of kodem) this.shabetz(e, mi, nimuk);
    };
    for (const [e, mi] of [...ea.map((e) => [e, b]), ...eb.map((e) => [e, a])]) {
      if (this.bdok(mi, e) || (!this.dgalim.cherum_8_8 && hu88(this.mishmarot.get(mi), this.mishmeretMeEmda(e)))) {
        shachzer();
        return null;
      }
      this.shabetz(e, mi, mi === b ? nimukB(e) : nimukA(e));
      chadash.push(e);
    }
    return shachzer;
  }

  // עודף: מי שנשאר בלי שיבוץ מחליף ליממה אדם מצוות, שמקבל "יום מנוחה מלא" (ברוטציה לפי מי שקיבל הכי מעט)
  odef() {
    if (this.h.odef !== 'yom_menucha_male') return;
    const ptuchim = this.hx.ovdim.filter((o) => o.odef && !this.emdot.some((e) => e.oved_id === o.id));
    for (const x of ptuchim) {
      const mo = this.hx.ovdim
        .filter((o) => o.tzevet_id && o.nimtza && o.tafkid === x.tafkid && this.emdotHachlafa(o.id).length
          && !this.yomMenuchaMale.some((y) => y.oved_id === o.id))
        .sort((a, b) => {
          const ma = this.madadim.get(a.id), mb = this.madadim.get(b.id);
          return ma.murchevet14 - mb.murchevet14
            || (ma.murchevetAcharona ?? -Infinity) - (mb.murchevetAcharona ?? -Infinity) || a.id - b.id;
        });
      for (const o of mo) {
        const ok = this.nasehHachlafa(x.id, o.id, () => ({
          sug: 'odef',
          txt: `עודף: ${x.shem} (ללא צוות) מחליף ליממה את ${o.shem} מ${this.tzevet(o.tzevet_id).shem}, ו${o.shem} מקבל יום מנוחה מלא. יום המנוחה עובר בין אנשים — ${o.shem} קיבל הכי מעט מנוחות מורחבות לאחרונה.`,
          derug: 'ללא צוות (עודף)',
          madadim: this.pirutMadadim(x.id),
        }), () => null);
        if (ok) {
          this.yomMenuchaMale.push({ oved_id: o.id, machlif_id: x.id });
          break;
        }
      }
    }
  }

  kisuiTagiot(key) {
    const yesh = new Set();
    for (const e of this.emdotMishmeret(key)) if (e.oved_id) for (const t of this.oved(e.oved_id).tagiot) yesh.add(t);
    return this.h.pas_cham.tagiot_retzuyot.filter((t) => yesh.has(t)).length;
  }

  // כיסוי התגיות הרצויות בפס חם: החלפת יממה בין שני טבחים כשזה משפר את הכיסוי ולא מפר כלל קשיח
  optimizatziaTagiot() {
    const pc = this.hx.mishmarotYom.filter((s) => s.mesima === 'pas_cham');
    const sachKisui = () => pc.reduce((s, sh) => s + this.kisuiTagiot(sh.key), 0);
    for (let sivuv = 0; sivuv < 20; sivuv++) {
      let shipur = false;
      for (const sh of pc) {
        const emdot = this.emdotMishmeret(sh.key);
        const yesh = new Set(emdot.filter((e) => e.oved_id).flatMap((e) => this.oved(e.oved_id).tagiot));
        const chaserot = this.h.pas_cham.tagiot_retzuyot.filter((t) => !yesh.has(t));
        for (const tag of chaserot) {
          const lifnei = sachKisui();
          const baMishmeret = new Set(emdot.map((e) => e.oved_id));
          const mo = this.hx.ovdim.filter((o) => o.nimtza && o.tafkid === 'tabach' && o.tagiot.includes(tag) && !baMishmeret.has(o.id));
          const yotzim = emdot.filter((e) => e.oved_id && e.tafkid === 'tabach' && !e.naul && !e.butza).map((e) => e.oved_id);
          let nimtza = false;
          for (const ox0 of mo) {
            const x = ox0.id;
            for (const y of yotzim) {
              const ox = this.oved(x), oy = this.oved(y);
              const txt = `החלפה לשיפור כיסוי התגית "${TAGIOT[tag]}" בפס חם ${sh.shem}: ${ox.shem} ו${oy.shem} החליפו את השיבוצים שלהם ליממה.`;
              const batel = this.nasehHachlafa(x, y,
                () => ({ sug: 'tagiot', txt, derug: 'החלפה בגלל כישור חסר', madadim: this.pirutMadadim(x) }),
                () => ({ sug: 'tagiot', txt, derug: 'החלפה בגלל כישור חסר', madadim: this.pirutMadadim(y) }));
              if (!batel) continue;
              if (sachKisui() > lifnei) {
                this.hachlafotTagiot.push({ a: x, b: y, tag, mishmeret: sh.key });
                nimtza = true;
                break;
              }
              batel();
            }
            if (nimtza) break;
          }
          if (nimtza) { shipur = true; break; }
        }
      }
      if (!shipur) break;
    }
  }

  // ---------- תוצאה ----------
  menuchotMurchavot() {
    const out = this.yomMenuchaMale.map((y) => ({ oved_id: y.oved_id, sug: 'yom_menucha_male', txt: 'יום מנוחה מלא' }));
    for (const sh of this.hx.mishmarotYom.filter((s) => s.mesima === 'hachanot')) {
      const T = this.tzevetBeshlav(sh.g, 'hachanot');
      if (!T) continue;
      for (const o of this.hx.ovdim.filter((o) => o.tzevet_id === T.id && o.nimtza && o.tafkid !== 'minhalan')) {
        if (out.some((x) => x.oved_id === o.id)) continue;
        const oved = this.mishmarot.get(o.id).some((x) => x.makor === 'tyuta' && x.hatchala < sh.siyum && sh.hatchala < x.siyum);
        if (!oved) out.push({ oved_id: o.id, sug: 'menucha_murchevet', txt: `מנוחה מורחבת בזמן ש${T.shem} בהכנות ${sh.shem}`, mishmeret: sh.key, hatchala: sh.hatchala, siyum: sh.siyum });
      }
    }
    return out;
  }

  bne() {
    this.sheledTzevet('pas_cham');
    this.hashlamot('pas_cham');
    this.sheledTzevet('hachanot');
    this.hashlamot('hachanot');
    this.pasKar();
    this.minhal();
    this.odef();
    this.optimizatziaTagiot();
    return {
      emdot: this.emdot,
      menuchot: this.menuchotMurchavot(),
      beayot: this.beayot,
      vitur_minhal: this.vitur_minhal || 0,
      chaserot: this.emdot.filter((e) => !e.oved_id),
    };
  }
}
