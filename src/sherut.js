// שכבת השירות: חיבור בין מסד הנתונים למנוע השיבוץ
import { iska } from './db.js';
import { hagdarotMale, HAGDAROT_BRIRAT_MECHDAL } from './hagdarot.js';
import { yetzorShibutz, bneHeksher, bdika, nidrashMulKayam } from './manoa/index.js';
import { emdotLehistoria } from './manoa/historia.js';
import { yetzuWhatsapp } from './manoa/yetzu.js';
import { madadeiHogenut } from './manoa/hogenut.js';
import { shuraLemishmeret } from './manoa/heksher.js';
import { shlaveiMachzor } from './manoa/mishmarot.js';
import { muchlat, hosefYamim, taarichLeyom, isoLemuchlat, shaaLedakot, YOM } from './zman.js';
import * as munachim from './munachim.js';

const TAFKIDIM_MUTARIM = new Set(['shef', 'tabach', 'minhalan']);
const TAGIOT_MUTAROT = new Set(Object.keys(munachim.TAGIOT));

export class Sherut {
  constructor(db, { akshav = () => new Date() } = {}) {
    this.db = db;
    this.akshav = akshav;
  }

  // ---------- עובדים, צוותים, הגדרות ----------
  ovdim({ kulam = false } = {}) {
    return this.db.prepare(`SELECT * FROM ovdim ${kulam ? '' : 'WHERE pail = 1'} ORDER BY id`).all()
      .map((o) => ({ ...o, tagiot: JSON.parse(o.tagiot) }));
  }

  tzevatim() {
    return this.db.prepare('SELECT * FROM tzevatim ORDER BY seder, id').all();
  }

  hagdarot() {
    const r = this.db.prepare('SELECT json FROM hagdarot WHERE id = 1').get();
    return hagdarotMale(r ? JSON.parse(r.json) : {});
  }

  shmorHagdarot(h) {
    const male = hagdarotMale(h);
    this.db.prepare('INSERT INTO hagdarot (id, json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json')
      .run(JSON.stringify(male));
    return male;
  }

  matzavPtiha() {
    const r = this.db.prepare('SELECT * FROM matzav_ptiha WHERE id = 1').get();
    if (!r) return null;
    const h = this.hagdarot();
    const N = h.pas_cham.mishmarot.length;
    const gRef = taarichLeyom(r.taarich) * N + r.mishmeret;
    const tz = this.tzevatim();
    const shlavim = shlaveiMachzor(tz.length);
    return {
      taarich: r.taarich,
      mishmeret: r.mishmeret,
      nishmar: r.nishmar,
      tzevatim: tz.map((t) => ({ ...t, shlav: t.ogen_pas_cham == null ? null : (((gRef - t.ogen_pas_cham) % tz.length) + tz.length) % tz.length, shem_shlav: null }))
        .map((t) => ({ ...t, shem_shlav: t.shlav == null ? null : munachim.SHLAVEI_MACHZOR[shlavim[t.shlav]] })),
    };
  }

  klali() {
    return {
      ovdim: this.ovdim(),
      tzevatim: this.tzevatim(),
      hagdarot: this.hagdarot(),
      hagdarot_brirat_mechdal: HAGDAROT_BRIRAT_MECHDAL,
      matzav_ptiha: this.matzavPtiha(),
      munachim,
      hayom: this.hayom(),
    };
  }

  hayom() {
    const d = this.akshav();
    const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const h = this.hagdarot();
    // לפני תחילת היממה (06:00) עדיין שייכים ליממה הקודמת
    const dakot = d.getHours() * 60 + d.getMinutes();
    return dakot < shaaLedakot(h.yom_hatchala) ? hosefYamim(t, -1) : t;
  }

  akshavMuchlat() {
    const d = this.akshav();
    const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return muchlat(t, `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
  }

  shmorOved(o) {
    const shem = String(o.shem || '').trim();
    if (!shem) throw new ShgiatKelet('חובה למלא שם/כינוי');
    if (!TAFKIDIM_MUTARIM.has(o.tafkid)) throw new ShgiatKelet('תפקיד בסיס לא תקין');
    const tagiot = (o.tagiot || []).filter((t) => TAGIOT_MUTAROT.has(t));
    const status = o.status === 'bechofesh' ? 'bechofesh' : 'nimtza';
    const tzevet_id = o.tafkid === 'minhalan' ? null : (o.tzevet_id || null);
    const bemaagar = o.tafkid === 'minhalan' || tzevet_id ? 0 : (o.bemaagar_pas_kar ? 1 : 0);
    const vals = [shem, o.tafkid, JSON.stringify(tagiot), status, o.taarich_chazara || null, o.hearot || '', tzevet_id, bemaagar, Number(o.seder) || 0];
    if (o.id) {
      this.db.prepare(`UPDATE ovdim SET shem=?, tafkid=?, tagiot=?, status=?, taarich_chazara=?, hearot=?, tzevet_id=?, bemaagar_pas_kar=?, seder=? WHERE id=?`)
        .run(...vals, o.id);
      return o.id;
    }
    return Number(this.db.prepare(`INSERT INTO ovdim (shem, tafkid, tagiot, status, taarich_chazara, hearot, tzevet_id, bemaagar_pas_kar, seder) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(...vals).lastInsertRowid);
  }

  // עובד עם היסטוריה לא נמחק אלא מועבר לארכיון, כדי שההיסטוריה וההוגנות יישארו נכונות
  mechakOved(id) {
    const yesh = this.db.prepare('SELECT 1 FROM historia WHERE oved_id = ? LIMIT 1').get(id);
    if (yesh) this.db.prepare('UPDATE ovdim SET pail = 0, tzevet_id = NULL, bemaagar_pas_kar = 0 WHERE id = ?').run(id);
    else this.db.prepare('DELETE FROM ovdim WHERE id = ?').run(id);
  }

  /**
   * מצב פתיחה: { taarich, mishmeret, tzevatim: [{ id?, shem, shlav, chaverim: [oved_id...] }], maagar: [oved_id...] }
   * shlav = מיקום הצוות במחזור במשמרת הייחוס (0 = פס חם, 1 = מנוחה אחרי פס חם, 2 = הכנות, 3 = מנוחה אחרי הכנות...)
   */
  shmorMatzavPtiha(m) {
    const h = this.hagdarot();
    const N = h.pas_cham.mishmarot.length;
    if (!m.taarich || m.mishmeret == null) throw new ShgiatKelet('חובה לבחור תאריך ומשמרת ייחוס');
    const gRef = taarichLeyom(m.taarich) * N + Number(m.mishmeret);
    const n = m.tzevatim.length;
    const shlavim = new Set(m.tzevatim.map((t) => Number(t.shlav)));
    if (shlavim.size !== n) throw new ShgiatKelet('לכל צוות צריך מיקום שונה במחזור');
    const kulam = m.tzevatim.flatMap((t) => t.chaverim);
    if (new Set(kulam).size !== kulam.length) throw new ShgiatKelet('עובד משובץ ליותר מצוות אחד');
    iska(this.db, () => {
      const keyamim = new Set(this.tzevatim().map((t) => t.id));
      const shmurim = new Set();
      m.tzevatim.forEach((t, i) => {
        const ogen = gRef - Number(t.shlav);
        let id = t.id && keyamim.has(t.id) ? t.id : null;
        if (id) this.db.prepare('UPDATE tzevatim SET shem=?, seder=?, ogen_pas_cham=? WHERE id=?').run(t.shem || `צוות ${i + 1}`, i, ogen, id);
        else id = Number(this.db.prepare('INSERT INTO tzevatim (shem, seder, ogen_pas_cham) VALUES (?,?,?)').run(t.shem || `צוות ${i + 1}`, i, ogen).lastInsertRowid);
        shmurim.add(id);
        t._id = id;
      });
      for (const id of keyamim) if (!shmurim.has(id)) this.db.prepare('DELETE FROM tzevatim WHERE id = ?').run(id);
      this.db.prepare('UPDATE ovdim SET tzevet_id = NULL, bemaagar_pas_kar = 0, seder = 0').run();
      for (const t of m.tzevatim) {
        t.chaverim.forEach((oid, i) => this.db.prepare("UPDATE ovdim SET tzevet_id = ?, seder = ? WHERE id = ? AND tafkid != 'minhalan'").run(t._id, i + 1, oid));
      }
      for (const oid of m.maagar || []) this.db.prepare("UPDATE ovdim SET bemaagar_pas_kar = 1 WHERE id = ? AND tzevet_id IS NULL AND tafkid != 'minhalan'").run(oid);
      this.db.prepare(`INSERT INTO matzav_ptiha (id, taarich, mishmeret, nishmar) VALUES (1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET taarich = excluded.taarich, mishmeret = excluded.mishmeret, nishmar = excluded.nishmar`)
        .run(m.taarich, Number(m.mishmeret), new Date().toISOString());
    });
    return this.matzavPtiha();
  }

  // ---------- דוח נוכחות ----------
  nochechut(taarich) {
    const shurot = this.db.prepare('SELECT oved_id, status FROM doch_nochechut WHERE taarich = ?').all(taarich);
    const dochot = new Map(shurot.map((r) => [r.oved_id, r.status]));
    return {
      taarich,
      kayam_doch: shurot.length > 0,
      ovdim: this.ovdim().map((o) => {
        let status = dochot.get(o.id);
        let hatzaa = null;
        if (!status) {
          status = o.status;
          if (o.status === 'bechofesh' && o.taarich_chazara && o.taarich_chazara <= taarich) {
            status = 'nimtza';
            hatzaa = `תאריך חזרה צפוי: ${o.taarich_chazara}`;
          }
        }
        return { id: o.id, shem: o.shem, tafkid: o.tafkid, tagiot: o.tagiot, tzevet_id: o.tzevet_id, bemaagar_pas_kar: o.bemaagar_pas_kar, status, hatzaa };
      }),
    };
  }

  shmorNochechut(taarich, statusim) {
    iska(this.db, () => {
      this.db.prepare('DELETE FROM doch_nochechut WHERE taarich = ?').run(taarich);
      const ins = this.db.prepare('INSERT INTO doch_nochechut (taarich, oved_id, status) VALUES (?, ?, ?)');
      const upd = this.db.prepare('UPDATE ovdim SET status = ? WHERE id = ?');
      const achron = this.db.prepare('SELECT MAX(taarich) AS t FROM doch_nochechut').get()?.t;
      for (const [id, st] of Object.entries(statusim)) {
        const status = st === 'bechofesh' ? 'bechofesh' : 'nimtza';
        ins.run(taarich, Number(id), status);
        // סטטוס העובד משקף את דוח הנוכחות העדכני ביותר
        if (!achron || taarich >= achron) upd.run(status, Number(id));
      }
    });
    return this.nochechut(taarich);
  }

  // התאמת רשימת שמות מודבקת לעובדים
  hatamatShemot(txt) {
    const ovdim = this.ovdim();
    const nirmel = (s) => s.replace(/[‎‏"'`׳״.,:;\-–()\d]/g, ' ').replace(/\s+/g, ' ').trim();
    const shurot = String(txt || '').split(/[\n,;]+/).map(nirmel).filter(Boolean);
    const nimtzeu = new Set();
    const lo = [];
    for (const s of shurot) {
      const o = ovdim.find((x) => nirmel(x.shem) === s) || ovdim.find((x) => s.includes(nirmel(x.shem)) || nirmel(x.shem).includes(s));
      if (o) nimtzeu.add(o.id); else lo.push(s);
    }
    return { ovdim: [...nimtzeu], lo_zuhu: lo };
  }

  // ---------- מנוע ----------
  kelet(taarich, kavuim = []) {
    const h = this.hagdarot();
    const H0 = muchlat(taarich, h.yom_hatchala);
    const mi = hosefYamim(taarich, -16);
    const ad = hosefYamim(taarich, 2);
    const historia = this.db.prepare('SELECT * FROM historia WHERE taarich BETWEEN ? AND ?').all(mi, ad);
    const noch = this.nochechut(taarich);
    const nochechut = Object.fromEntries(noch.ovdim.map((o) => [o.id, o.status]));
    const bechofesh = {};
    for (const r of this.db.prepare("SELECT taarich, oved_id FROM doch_nochechut WHERE status = 'bechofesh' AND taarich BETWEEN ? AND ?").all(mi, taarich)) {
      (bechofesh[r.oved_id] ||= []).push(r.taarich);
    }
    return { taarich, hagdarot: h, ovdim: this.ovdim(), tzevatim: this.tzevatim(), historia, nochechut, bechofesh, kavuim, H0 };
  }

  nidrash(taarich) {
    return nidrashMulKayam(bneHeksher(this.kelet(taarich)));
  }

  shibutz(taarich) {
    const r = this.db.prepare('SELECT * FROM shibutzim WHERE taarich = ?').get(taarich);
    if (!r) return null;
    return { ...JSON.parse(r.json), status: r.status, udkan: r.udkan };
  }

  shmorShibutz(taarich, s, status = 'tyuta') {
    const { status: _s, udkan: _u, ...guf } = s;
    this.db.prepare(`INSERT INTO shibutzim (taarich, json, status, udkan) VALUES (?, ?, ?, ?)
      ON CONFLICT(taarich) DO UPDATE SET json = excluded.json, status = excluded.status, udkan = excluded.udkan`)
      .run(taarich, JSON.stringify(guf), status, new Date().toISOString());
    return this.shibutz(taarich);
  }

  yetzorTyuta(taarich) {
    const kodem = this.shibutz(taarich);
    // שיבוצים נעולים נשמרים גם ביצירה מחדש
    const kavuim = (kodem?.emdot || []).filter((e) => e.naul).map((e) => ({ id: e.id, oved_id: e.oved_id, naul: true, nimuk: e.nimuk }));
    const r = yetzorShibutz(this.kelet(taarich, kavuim));
    r.yom_nochechi = this.bdikatYomNochechi(taarich);
    return this.shmorShibutz(taarich, r);
  }

  // אחרי עדכון נוכחות: האם בשיבוץ של היממה הקודמת (הנוכחית) יש אנשים שכבר לא נמצאים
  bdikatYomNochechi(taarich) {
    const kodem = hosefYamim(taarich, -1);
    const s = this.shibutz(kodem);
    if (!s) return null;
    const noch = new Map(this.nochechut(taarich).ovdim.map((o) => [o.id, o.status]));
    const akshav = this.akshavMuchlat();
    const beayot = s.emdot.filter((e) => e.oved_id && e.hatchala >= akshav && noch.get(e.oved_id) === 'bechofesh');
    if (!beayot.length) return null;
    const ovdim = this.ovdim();
    return {
      taarich: kodem,
      txt: `ביתרת היממה ${kodem} משובצים ${beayot.length} שיבוצים של אנשים שסומנו "בחופש" (${[...new Set(beayot.map((e) => ovdim.find((o) => o.id === e.oved_id)?.shem))].join(', ')}). מומלץ "שבץ מחדש משעה".`,
    };
  }

  // עריכה ידנית: [{ id, oved_id, naul }] ואחריה בדיקה מחדש
  edkenShibutz(taarich, shinuyim) {
    const s = this.shibutz(taarich);
    if (!s) throw new ShgiatKelet('אין שיבוץ ליום זה');
    const lefiId = new Map(s.emdot.map((e) => [e.id, e]));
    for (const sh of shinuyim) {
      const e = lefiId.get(sh.id);
      if (!e) continue;
      if ('oved_id' in sh && sh.oved_id !== e.oved_id) {
        e.oved_id = sh.oved_id ? Number(sh.oved_id) : null;
        e.nimuk = { sug: 'yadani', txt: 'שיבוץ ידני', derug: 'ידני' };
        e.yadani = true;
      }
      if ('naul' in sh) e.naul = !!sh.naul;
    }
    this.bdokMechadash(taarich, s);
    return this.shmorShibutz(taarich, s, 'tyuta');
  }

  bdokMechadash(taarich, s) {
    const hx = bneHeksher(this.kelet(taarich));
    const bd = bdika(hx, s.emdot, s.dgalim);
    s.hafarot = bd.hafarot;
    s.azharot = bd.azharot;
    s.darush_ishur = bd.hafarot.length > 0;
    const chaserKriti = s.emdot.some((e) => !e.oved_id && (e.mesima === 'pas_cham' || e.mesima === 'hachanot'));
    if (chaserKriti) s.matzav = 'cherum';
    // מנוחות מורחבות: מי שלא עובד בזמן שהצוות שלו בהכנות
    s.menuchot = (s.menuchot || []).filter((m) => !s.emdot.some((e) => e.oved_id === m.oved_id
      && (m.sug === 'yom_menucha_male' || (e.hatchala < m.siyum && m.hatchala < e.siyum))));
    return s;
  }

  // שבץ מחדש משעה X: שומר את מה שנעול ואת מה שכבר בוצע (התחיל לפני X)
  shabetzMechadash(taarich, shaa) {
    const s = this.shibutz(taarich);
    if (!s) throw new ShgiatKelet('אין שיבוץ ליום זה');
    const h = this.hagdarot();
    const H0 = muchlat(taarich, h.yom_hatchala);
    const X = H0 + ((shaaLedakot(shaa) - shaaLedakot(h.yom_hatchala) + YOM) % YOM);
    const kavuim = s.emdot.filter((e) => e.oved_id && (e.naul || e.hatchala < X)).map((e) => ({
      id: e.id, oved_id: e.oved_id, naul: e.naul, butza: e.hatchala < X, nimuk: e.nimuk,
    }));
    const r = yetzorShibutz(this.kelet(taarich, kavuim));
    r.shubatz_mechadash_mishaa = shaa;
    r.yom_nochechi = null;
    return this.shmorShibutz(taarich, r, 'tyuta');
  }

  pirsum(taarich, ishur = false) {
    const s = this.shibutz(taarich);
    if (!s) throw new ShgiatKelet('אין שיבוץ ליום זה');
    this.bdokMechadash(taarich, s);
    if (s.darush_ishur && !ishur) {
      throw new ShgiatKelet('יש הפרות או חוסר בפס חם / הכנות — הפרסום דורש אישור ידני', { hafarot: s.hafarot });
    }
    iska(this.db, () => {
      this.db.prepare('DELETE FROM historia WHERE taarich = ?').run(taarich);
      const ins = this.db.prepare('INSERT INTO historia (oved_id, mesima, emda, hatchala, siyum, hatchala_mishmeret, taarich, mishmeret) VALUES (?,?,?,?,?,?,?,?)');
      for (const r of emdotLehistoria(taarich, s.emdot)) {
        ins.run(r.oved_id, r.mesima, r.emda, r.hatchala, r.siyum, r.hatchala_mishmeret, r.taarich, r.mishmeret);
      }
      s.pursam = new Date().toISOString();
      s.pursam_beishur = !!(s.darush_ishur && ishur);
      this.shmorShibutz(taarich, s, 'mefursam');
    });
    return this.shibutz(taarich);
  }

  // ---------- היסטוריה, הוגנות, ייצוא ----------
  historia({ mi, ad, oved_id } = {}) {
    const tnaim = [];
    const p = [];
    if (mi) { tnaim.push('taarich >= ?'); p.push(mi); }
    if (ad) { tnaim.push('taarich <= ?'); p.push(ad); }
    if (oved_id) { tnaim.push('oved_id = ?'); p.push(Number(oved_id)); }
    return this.db.prepare(`SELECT * FROM historia ${tnaim.length ? 'WHERE ' + tnaim.join(' AND ') : ''} ORDER BY hatchala, mesima, emda LIMIT 5000`).all(...p);
  }

  yemeiShibutz() {
    return this.db.prepare('SELECT taarich, status, udkan FROM shibutzim ORDER BY taarich DESC LIMIT 60').all();
  }

  hogenut() {
    const h = this.hagdarot();
    const akshav = this.akshavMuchlat();
    const ovdim = this.ovdim();
    const m = new Map(ovdim.map((o) => [o.id, []]));
    const mi = hosefYamim(this.hayom(), -16);
    for (const r of this.db.prepare('SELECT * FROM historia WHERE taarich >= ?').all(mi)) {
      m.get(r.oved_id)?.push(shuraLemishmeret(r));
    }
    const bechofesh = new Map();
    for (const r of this.db.prepare("SELECT taarich, oved_id FROM doch_nochechut WHERE status = 'bechofesh' AND taarich >= ?").all(mi)) {
      if (!bechofesh.has(r.oved_id)) bechofesh.set(r.oved_id, new Set());
      bechofesh.get(r.oved_id).add(r.taarich);
    }
    const mad = madadeiHogenut(ovdim, m, akshav, h, bechofesh);
    return ovdim.map((o) => ({ id: o.id, shem: o.shem, tafkid: o.tafkid, tzevet_id: o.tzevet_id, bemaagar_pas_kar: o.bemaagar_pas_kar, ...mad.get(o.id) }));
  }

  yetzu(taarich) {
    const s = this.shibutz(taarich);
    if (!s) throw new ShgiatKelet('אין שיבוץ ליום זה');
    return yetzuWhatsapp(s, this.ovdim({ kulam: true }), this.tzevatim());
  }
}

export class ShgiatKelet extends Error {
  constructor(msg, pratim) {
    super(msg);
    this.pratim = pratim;
  }
}

export { isoLemuchlat };
