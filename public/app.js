// ממשק: שיבוץ צוות מטבח
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const main = $('#main');
const dialog = $('#dialog');

let K = null; // נתונים כלליים: עובדים, צוותים, הגדרות, מונחים

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const e = new Error(data?.shgia || 'שגיאה');
    e.pratim = data?.pratim;
    throw e;
  }
  return data;
}

async function tkaneKlali() { K = await api('GET', '/api/klali'); }
const M = () => K.munachim;

function hodaa(txt, shgia = false) {
  const el = $('#hodaa');
  el.textContent = txt;
  el.className = 'hodaa' + (shgia ? ' shgia' : '');
  el.hidden = false;
  clearTimeout(hodaa.t);
  hodaa.t = setTimeout(() => { el.hidden = true; }, shgia ? 6000 : 2600);
}

function zehirut(fn) {
  return async (...a) => {
    try { await fn(...a); } catch (e) { hodaa(e.message, true); console.error(e); }
  };
}

// ---------- זמן ----------
const YOM = 1440;
const shaa = (m) => {
  const x = ((m % YOM) + YOM) % YOM;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};
const shaot = (dakot) => {
  const h = Math.floor(dakot / 60), m = Math.round(dakot % 60);
  return m ? `${h}:${String(m).padStart(2, '0')}` : `${h}`;
};
function hosefYamim(t, n) {
  const [y, m, d] = t.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const machar = () => hosefYamim(K.hayom, 1);
function taarichTxt(t) {
  const [y, m, d] = t.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `יום ${'אבגדהוש'[dow]}' ${d}.${m}.${y}`;
}
const taarichMeDakot = (dakot) => new Date(Math.floor(dakot / YOM) * 86400000).toISOString().slice(0, 10);

// ---------- עזרים ----------
const oved = (id) => K.ovdim.find((o) => o.id === id);
const tzevet = (id) => K.tzevatim.find((t) => t.id === id);
const TAGIT_KTZARA = { eged: 'א', mashgiach_kashrut: 'כ', yerakot: 'י', tavlin: 'ת' };
const tagiotHtml = (o) => (o?.tagiot || []).map((t) => `<span class="tag">${esc(M().TAGIOT[t])}</span>`).join('');
const tafkidHtml = (o) => `<span class="tag tafkid-${o.tafkid}">${esc(M().TAFKIDIM[o.tafkid])}</span>`;
const shiyuch = (o) => o.tzevet_id ? tzevet(o.tzevet_id)?.shem : o.bemaagar_pas_kar ? 'מאגר פס קר' : o.tafkid === 'minhalan' ? 'מנהלנים' : 'ללא צוות';

function kvutzotOvdim(ovdim) {
  const out = [];
  for (const t of K.tzevatim) out.push({ shem: t.shem, ovdim: ovdim.filter((o) => o.tzevet_id === t.id) });
  out.push({ shem: 'מאגר פס קר', ovdim: ovdim.filter((o) => !o.tzevet_id && o.bemaagar_pas_kar) });
  out.push({ shem: 'מנהלנים', ovdim: ovdim.filter((o) => o.tafkid === 'minhalan') });
  out.push({ shem: 'ללא צוות', ovdim: ovdim.filter((o) => !o.tzevet_id && !o.bemaagar_pas_kar && o.tafkid !== 'minhalan') });
  for (const k of out) k.ovdim.sort((a, b) => (a.tafkid === 'shef' ? -1 : 0) - (b.tafkid === 'shef' ? -1 : 0) || (a.seder || 0) - (b.seder || 0) || a.id - b.id);
  return out.filter((k) => k.ovdim.length);
}

function tavitEmda(e) {
  const sh = e.shem_mishmeret ? ` ${e.shem_mishmeret}` : '';
  return `${M().MESIMOT[e.mesima]}${sh} ${shaa(e.hatchala)}\u200E–\u200E${shaa(e.siyum)} · ${M().EMDOT[e.emda]}`;
}
const tavitTafkidEmda = (e) => (e.tafkid === 'pas_kar' ? 'אדם' : M().TAFKIDIM[e.tafkid]);

// ---------- ניתוב ----------
const MASACHIM = {
  nochechut: masachNochechut,
  luach: masachLuach,
  ovdim: masachOvdim,
  historia: masachHistoria,
  hogenut: masachHogenut,
  ptiha: masachPtiha,
  hagdarot: masachHagdarot,
  hadpasa: masachHadpasa,
};

async function render() {
  const [shem, param] = ((location.hash.slice(1) || 'nochechut').split('?')[0]).split('/');
  for (const a of $$('#nav a')) a.classList.toggle('pail', a.getAttribute('href') === '#' + shem);
  const fn = MASACHIM[shem] || masachNochechut;
  try {
    await fn(param);
  } catch (e) {
    main.innerHTML = `<div class="kartis">שגיאה: ${esc(e.message)}</div>`;
    console.error(e);
  }
}

window.addEventListener('hashchange', render);

// =====================================================================
// דוח נוכחות
// =====================================================================
async function masachNochechut(param) {
  const taarich = param || machar();
  const n = await api('GET', `/api/nochechut/${taarich}`);
  const status = new Map(n.ovdim.map((o) => [o.id, o.status]));
  if (!K.matzav_ptiha) {
    main.innerHTML = `<div class="kartis"><h1>דוח נוכחות</h1><p>עוד לא הוזן מצב פתיחה. יש להזין קודם את השיבוץ הקבוע הקיים.</p><a class="kaftor" href="#ptiha">למצב פתיחה</a></div>`;
    return;
  }

  const tziyer = () => {
    const ovdimN = n.ovdim.map((o) => ({ ...oved(o.id), ...o, status: status.get(o.id) }));
    const nimtzaim = ovdimN.filter((o) => o.status === 'nimtza').length;
    main.innerHTML = `
      <h1>דוח נוכחות</h1>
      <div class="kartis">
        <div class="shura">
          <label>יום השיבוץ (06:00–06:00): <input type="date" id="taarich" value="${taarich}"></label>
          <span class="chalash">${taarichTxt(taarich)} · ${n.kayam_doch ? 'דוח נשמר' : 'טרם נשמר דוח ליום זה'}</span>
          <span class="revach"></span>
          <strong>${nimtzaim} נמצאים</strong> · ${ovdimN.length - nimtzaim} בחופש
        </div>
      </div>
      <div class="kartis">
        <div class="shura">
          <button id="kulam-nimtza">סמן את כולם "נמצא"</button>
          <span class="chalash">סימון = נמצא · בלי סימון = בחופש</span>
        </div>
        <div class="chips-nochechut" style="margin-top:10px">
          ${kvutzotOvdim(ovdimN).map((k) => `
            <div class="kvutza"><h3>${esc(k.shem)}</h3>
              ${k.ovdim.map((o) => `
                <label><input type="checkbox" data-id="${o.id}" ${o.status === 'nimtza' ? 'checked' : ''}>
                  ${esc(o.shem)} ${tafkidHtml(o)} ${tagiotHtml(o)}
                  ${o.hatzaa ? `<span class="tag murchevet">${esc(o.hatzaa)}</span>` : ''}
                </label>`).join('')}
            </div>`).join('')}
        </div>
      </div>
      <div class="kartis">
        <h2 style="margin-top:0">הדבקת רשימת שמות</h2>
        <textarea id="hadbaka" placeholder="שם בכל שורה, או מופרדים בפסיקים"></textarea>
        <div class="shura">
          <label><input type="radio" name="sug" value="nimtza" checked> השמות ברשימה נמצאים (כל השאר בחופש)</label>
          <label><input type="radio" name="sug" value="bechofesh"> השמות ברשימה בחופש (כל השאר נמצאים)</label>
          <button id="hachel">החל רשימה</button>
          <span id="lo-zuhu" class="chalash"></span>
        </div>
      </div>
      <div class="kartis shura">
        <button class="ikari" id="shmor-veyetzor">שמור דוח וצור טיוטת שיבוץ</button>
        <button id="shmor">שמור דוח</button>
      </div>
      <div class="kartis"><h2 style="margin-top:0">נדרש מול קיים</h2><div id="nidrash">טוען…</div></div>`;

    $('#taarich').onchange = (ev) => { location.hash = `nochechut/${ev.target.value}`; };
    for (const cb of $$('input[data-id]')) cb.onchange = () => status.set(Number(cb.dataset.id), cb.checked ? 'nimtza' : 'bechofesh');
    $('#kulam-nimtza').onclick = () => { for (const o of n.ovdim) status.set(o.id, 'nimtza'); tziyer(); };
    $('#hachel').onclick = zehirut(async () => {
      const r = await api('POST', '/api/hatamat-shemot', { txt: $('#hadbaka').value });
      const sug = $('input[name=sug]:checked').value;
      const acher = sug === 'nimtza' ? 'bechofesh' : 'nimtza';
      for (const o of n.ovdim) status.set(o.id, r.ovdim.includes(o.id) ? sug : acher);
      const txt = $('#hadbaka').value;
      tziyer();
      $('#hadbaka').value = txt;
      $('#lo-zuhu').textContent = `זוהו ${r.ovdim.length} עובדים` + (r.lo_zuhu.length ? ` · לא זוהו: ${r.lo_zuhu.join(', ')}` : '');
    });
    const shmor = async () => {
      await api('PUT', `/api/nochechut/${taarich}`, { statusim: Object.fromEntries(status) });
      await tkaneKlali();
    };
    $('#shmor').onclick = zehirut(async () => { await shmor(); hodaa('דוח הנוכחות נשמר'); await masachNochechut(taarich); });
    $('#shmor-veyetzor').onclick = zehirut(async () => {
      await shmor();
      await api('POST', `/api/shibutz/${taarich}/yetzira`);
      location.hash = `luach/${taarich}`;
    });
    tzayerNidrash(taarich);
  };
  tziyer();
}

async function tzayerNidrash(taarich) {
  const d = await api('GET', `/api/nidrash/${taarich}`);
  const el = $('#nidrash');
  if (!el) return;
  el.innerHTML = `
    <table>
      <tr><th>משימה</th><th>תפקיד</th><th>נדרש בכל רגע</th><th>נדרש (אנשים)</th><th>קיים</th><th>פער</th></tr>
      ${d.shurot.map((s) => `<tr>
        <td>${esc(M().MESIMOT[s.mesima])}</td><td>${esc(s.tavit)}</td><td>${esc(s.bechol_rega)}</td>
        <td>${s.nidrash}${s.minimum != null ? ` (מינימום ${s.minimum})` : ''}</td>
        <td>${s.kayam == null ? `<span class="chalash">${esc(s.hearot || '')}</span>` : s.kayam}</td>
        <td class="${s.paar < 0 ? 'paar-shlili' : s.paar > 0 ? 'paar-chiyuvi' : ''}"><bdi dir="ltr">${s.kayam == null ? '' : s.paar > 0 ? '+' + s.paar : s.paar}</bdi></td></tr>`).join('')}
    </table>
    <h2>צוותים</h2>
    <table>
      <tr><th>צוות</th><th>שף</th><th>טבחים</th><th>בחופש</th><th>תגיות חסרות בצוות</th></tr>
      ${d.tzevatim.map((t) => `<tr class="${t.shef < 1 || t.tabachim < t.tabachim_nidrash ? 'chaser' : ''}">
        <td>${esc(t.shem)}</td><td>${t.shef}/1</td><td>${t.tabachim}/${t.tabachim_nidrash}</td>
        <td>${esc(t.bechofesh.join(', '))}</td><td>${esc(t.tagiot_chaserot.join(', '))}</td></tr>`).join('')}
    </table>
    ${d.odef.length ? `<p>עודף (ללא צוות): ${esc(d.odef.join(', '))}</p>` : ''}`;
}

// =====================================================================
// לוח שיבוץ
// =====================================================================
const tzugaShmura = () => { try { return localStorage.getItem('tzuga') || 'tzir'; } catch { return 'tzir'; } };

async function masachLuach(param) {
  const taarich = param || machar();
  const s = await api('GET', `/api/shibutz/${taarich}`);
  if (!s) {
    main.innerHTML = `
      <h1>לוח שיבוץ</h1>
      <div class="kartis shura">
        <label>יום: <input type="date" id="taarich" value="${taarich}"></label>
        <span>${taarichTxt(taarich)} — אין עדיין שיבוץ ליום זה.</span>
        <a class="kaftor" href="#nochechut/${taarich}">לדוח הנוכחות</a>
        <button class="ikari" id="yetzor">צור טיוטת שיבוץ</button>
      </div>`;
    $('#taarich').onchange = (ev) => { location.hash = `luach/${ev.target.value}`; };
    $('#yetzor').onclick = zehirut(async () => { await api('POST', `/api/shibutz/${taarich}/yetzira`); await masachLuach(taarich); });
    return;
  }
  tzayerLuach(s);
}

function tzayerLuach(s) {
  const taarich = s.taarich;
  const tzuga = tzugaShmura();
  const hafaraIds = new Set(s.hafarot.flatMap((x) => x.emdot));
  const azharaIds = new Set(s.azharot.flatMap((x) => x.emdot));
  const chaserKriti = s.emdot.filter((e) => !e.oved_id && (e.mesima === 'pas_cham' || e.mesima === 'hachanot'));
  const akshav = new Date();
  const shaaAkshav = `${String(akshav.getHours()).padStart(2, '0')}:00`;

  main.innerHTML = `
    <h1>לוח שיבוץ</h1>
    <div class="kartis lo-lehadpasa">
      <div class="shura">
        <button id="kodem" title="יום קודם">→</button>
        <input type="date" id="taarich" value="${taarich}">
        <button id="haba" title="יום הבא">←</button>
        <strong>${taarichTxt(taarich)}</strong>
        <span class="tag ${s.status === 'mefursam' ? 'murchevet' : ''}">${s.status === 'mefursam' ? 'מפורסם' : 'טיוטה'}</span>
        <span class="revach"></span>
        <button id="tzuga-tzir" ${tzuga === 'tzir' ? 'class="ikari"' : ''}>ציר זמן</button>
        <button id="tzuga-oved" ${tzuga === 'oved' ? 'class="ikari"' : ''}>לפי עובד</button>
      </div>
      <div class="shura">
        <button id="yetzor-mechadash">צור טיוטה מחדש</button>
        <span>שבץ מחדש משעה <input type="time" id="mishaa" value="${shaaAkshav}" step="3600"></span>
        <button id="mechadash">שבץ מחדש משעה X</button>
        <span class="revach"></span>
        <button id="whatsapp">ייצוא לוואטסאפ</button>
        <a class="kaftor" href="#hadpasa/${taarich}">תצוגת הדפסה</a>
        ${s.darush_ishur ? '<label><input type="checkbox" id="ishur"> אישור ידני לפרסום למרות ההפרות</label>' : ''}
        <button class="ikari" id="pirsum">${s.status === 'mefursam' ? 'פרסם שוב' : 'פרסם'}</button>
      </div>
    </div>

    ${s.yom_nochechi ? `<div class="matzav choser lo-lehadpasa">${esc(s.yom_nochechi.txt)} <a href="#luach/${s.yom_nochechi.taarich}">ללוח של ${s.yom_nochechi.taarich}</a></div>` : ''}

    ${chaserKriti.length || s.darush_ishur ? `
      <div class="hatraa">
        <div class="koteret">⚠ ${chaserKriti.length ? 'אי אפשר לאייש את פס חם / הכנות במלואם' : 'יש הפרות של כללים קשיחים'} — השיבוץ לא יתפרסם בלי אישור ידני</div>
        <ul>${s.hafarot.slice(0, 12).map((h) => `<li>${esc(h.txt)}</li>`).join('')}${s.hafarot.length > 12 ? `<li>ועוד ${s.hafarot.length - 12}…</li>` : ''}</ul>
      </div>` : ''}

    <div class="matzav ${s.matzav}">
      <div class="koteret">מצב: ${esc(M().MATZAVIM[s.matzav])}${s.shubatz_mechadash_mishaa ? ` · שובץ מחדש משעה ${esc(s.shubatz_mechadash_mishaa)}` : ''}</div>
      <ul>${s.sibot.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>

    <div id="tzuga"></div>

    <div class="paneli lo-lehadpasa">
      <div class="kartis">
        <h2 style="margin-top:0">הפרות (${s.hafarot.length})</h2>
        ${s.hafarot.length ? `<ul class="reshima hafarot">${s.hafarot.map((x, i) => `<li data-hafara="${i}">${esc(x.txt)}</li>`).join('')}</ul>` : '<span class="chalash">אין הפרות של כללים קשיחים.</span>'}
        <h2>אזהרות (${s.azharot.length})</h2>
        ${s.azharot.length ? `<ul class="reshima azharot">${s.azharot.map((x, i) => `<li data-azhara="${i}">${esc(x.txt)}</li>`).join('')}</ul>` : '<span class="chalash">כל הכללים הרכים התקיימו.</span>'}
      </div>
      <div class="kartis">
        <h2 style="margin-top:0">מנוחה מורחבת</h2>
        <div>${s.menuchot.length ? s.menuchot.map((m) => `<span class="tag murchevet">${esc(oved(m.oved_id)?.shem)}${m.sug === 'yom_menucha_male' ? ' — יום מנוחה מלא' : ''}</span>`).join(' ') : '<span class="chalash">אין היום.</span>'}</div>
        <h2>עובדים ללא שיבוץ ביממה <span class="chalash">(גררו אל עמדה כדי לשבץ; גררו עמדה לכאן כדי לפנות אותה)</span></h2>
        <div class="maagar-ovdim" id="maagar-ovdim">
          ${K.ovdim.filter((o) => !s.emdot.some((e) => e.oved_id === o.id)).map((o) => `
            <div class="chip" draggable="true" data-oved="${o.id}" title="${esc(shiyuch(o))}">${esc(o.shem)} <span class="tg">${esc(M().TAFKIDIM[o.tafkid])}${o.status === 'bechofesh' ? ' · בחופש' : ''}</span></div>`).join('')}
        </div>
      </div>
    </div>`;

  const tz = $('#tzuga');
  if (tzuga === 'tzir') tz.innerHTML = tzirZman(s, hafaraIds, azharaIds);
  else tz.innerHTML = tzirOvdim(s);

  $('#taarich').onchange = (ev) => { location.hash = `luach/${ev.target.value}`; };
  $('#kodem').onclick = () => { location.hash = `luach/${hosefYamim(taarich, -1)}`; };
  $('#haba').onclick = () => { location.hash = `luach/${hosefYamim(taarich, 1)}`; };
  $('#tzuga-tzir').onclick = () => { try { localStorage.setItem('tzuga', 'tzir'); } catch {} tzayerLuach(s); };
  $('#tzuga-oved').onclick = () => { try { localStorage.setItem('tzuga', 'oved'); } catch {} tzayerLuach(s); };
  $('#yetzor-mechadash').onclick = zehirut(async () => {
    if (s.status === 'mefursam' && !confirm('השיבוץ כבר פורסם. ליצור טיוטה חדשה? (שיבוצים נעולים יישמרו)')) return;
    tzayerLuach(await api('POST', `/api/shibutz/${taarich}/yetzira`));
    hodaa('נוצרה טיוטה חדשה');
  });
  $('#mechadash').onclick = zehirut(async () => {
    const x = $('#mishaa').value;
    if (!x) return;
    tzayerLuach(await api('POST', `/api/shibutz/${taarich}/mechadash`, { shaa: x }));
    hodaa(`שובץ מחדש משעה ${x}: נשמרו השיבוצים הנעולים ומה שכבר בוצע`);
  });
  $('#pirsum').onclick = zehirut(async () => {
    const ishur = !!$('#ishur')?.checked;
    if (s.darush_ishur && !ishur) { hodaa('יש לסמן אישור ידני כדי לפרסם שיבוץ עם הפרות או חוסר', true); return; }
    tzayerLuach(await api('POST', `/api/shibutz/${taarich}/pirsum`, { ishur }));
    hodaa('השיבוץ פורסם ונשמר להיסטוריה');
  });
  $('#whatsapp').onclick = zehirut(async () => {
    const { txt } = await api('GET', `/api/shibutz/${taarich}/yetzu`);
    dialog.innerHTML = `<div class="dialog-guf"><h2 style="margin-top:0">טקסט לוואטסאפ</h2><textarea id="wa" style="min-height:420px">${esc(txt)}</textarea></div>
      <div class="dialog-tachtit"><button class="ikari" id="haatek">העתק</button><button id="sgor">סגור</button></div>`;
    dialog.showModal();
    $('#sgor', dialog).onclick = () => dialog.close();
    $('#haatek', dialog).onclick = async () => {
      try { await navigator.clipboard.writeText(txt); hodaa('הועתק'); } catch { $('#wa', dialog).select(); document.execCommand('copy'); hodaa('הועתק'); }
    };
  });

  const madgesh = (ids) => {
    for (const c of $$('.chip.madgash')) c.classList.remove('madgash');
    let rishon = null;
    for (const id of ids) for (const c of $$(`[data-emda="${CSS.escape(id)}"]`)) { c.classList.add('madgash'); rishon ||= c; }
    rishon?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  };
  for (const li of $$('[data-hafara]')) li.onclick = () => madgesh(s.hafarot[li.dataset.hafara].emdot);
  for (const li of $$('[data-azhara]')) li.onclick = () => madgesh(s.azharot[li.dataset.azhara].emdot);

  // גרירה, החלפה ופינוי
  const shalach = zehirut(async (shinuyim) => {
    tzayerLuach(await api('PUT', `/api/shibutz/${taarich}`, { shinuyim }));
  });
  main.ondragstart = (ev) => {
    const c = ev.target.closest('.chip');
    if (!c) return;
    ev.dataTransfer.setData('text/plain', JSON.stringify(c.dataset.emda ? { emda: c.dataset.emda } : { oved: Number(c.dataset.oved) }));
  };
  main.ondragover = (ev) => {
    const c = ev.target.closest('[data-emda], #maagar-ovdim');
    if (!c) return;
    ev.preventDefault();
    for (const x of $$('.over')) x.classList.remove('over');
    c.classList.add('over');
  };
  main.ondragleave = (ev) => ev.target.closest?.('.over')?.classList.remove('over');
  main.ondrop = (ev) => {
    for (const x of $$('.over')) x.classList.remove('over');
    let src;
    try { src = JSON.parse(ev.dataTransfer.getData('text/plain')); } catch { return; }
    const yaad = ev.target.closest('[data-emda]');
    const emda = (id) => s.emdot.find((e) => e.id === id);
    if (!yaad) {
      if (ev.target.closest('#maagar-ovdim') && src.emda) { ev.preventDefault(); shalach([{ id: src.emda, oved_id: null }]); }
      return;
    }
    ev.preventDefault();
    const b = emda(yaad.dataset.emda);
    if (src.emda) {
      const a = emda(src.emda);
      if (!a || a.id === b.id) return;
      shalach([{ id: b.id, oved_id: a.oved_id }, { id: a.id, oved_id: b.oved_id }]);
    } else if (src.oved) {
      shalach([{ id: b.id, oved_id: src.oved }]);
    }
  };
  main.onclick = (ev) => {
    const c = ev.target.closest('[data-emda]');
    if (c && !ev.target.closest('dialog')) ptachEmda(s, c.dataset.emda);
  };
}

function chip(e, hafaraIds, azharaIds) {
  const o = e.oved_id ? oved(e.oved_id) : null;
  const cls = ['chip', e.tafkid === 'shef' ? 'shef' : '', !o ? 'chaser' : '', hafaraIds.has(e.id) ? 'hafara' : azharaIds.has(e.id) ? 'azhara' : '',
    e.naul ? 'naul' : '', e.butza ? 'butza' : '', e.yadani ? 'yadani' : ''].filter(Boolean).join(' ');
  const tg = o ? (o.tagiot || []).map((t) => TAGIT_KTZARA[t]).join('') : '';
  const title = o ? `${o.shem} · ${M().TAFKIDIM[o.tafkid]} · ${shiyuch(o)}${o.tagiot.length ? ' · ' + o.tagiot.map((t) => M().TAGIOT[t]).join(', ') : ''}` : 'עמדה לא מאוישת';
  return `<div class="${cls}" data-emda="${esc(e.id)}" draggable="${e.butza ? 'false' : 'true'}" title="${esc(title)}">
    ${o ? esc(o.shem) : `חסר ${esc(tavitTafkidEmda(e))}`}${e.tafkid === 'shef' && o ? ' <span class="tg">שף</span>' : ''}${tg ? ` <span class="tg">${esc(tg)}</span>` : ''}</div>`;
}

function tzirZman(s, hafaraIds, azharaIds) {
  const H0 = s.H0;
  const shurot = [['pas_cham_a', 'פס חם א'], ['pas_cham_b', 'פס חם ב'], ['hachanot', 'הכנות'], ['pas_kar', 'פס קר'], ['minhal', 'מנהל']];
  let html = `<div class="tzir-otef"><div class="tzir"><div class="shaa"></div>`;
  for (let i = 0; i < 24; i++) html += `<div class="shaa">${shaa(H0 + i * 60)}</div>`;
  shurot.forEach(([emda, tavit], ri) => {
    const row = ri + 2;
    html += `<div class="tavit-shura" style="grid-row:${row};grid-column:1">${tavit}</div>`;
    html += `<div class="reka" style="grid-row:${row};grid-column:2 / span 24"></div>`;
    const kvutzot = new Map();
    for (const e of s.emdot.filter((x) => x.emda === emda)) {
      if (!kvutzot.has(e.mishmeret)) kvutzot.set(e.mishmeret, []);
      kvutzot.get(e.mishmeret).push(e);
    }
    for (const em of kvutzot.values()) {
      const e0 = em[0];
      const start = Math.max(e0.hatchala, H0);
      const col = 2 + Math.floor((start - H0) / 60);
      const span = Math.max(1, Math.ceil((Math.min(e0.siyum, H0 + YOM) - start) / 60));
      const t = e0.tzevet_id ? tzevet(e0.tzevet_id)?.shem : '';
      html += `<div class="block ${e0.mesima}" style="grid-row:${row};grid-column:${col} / span ${span}">
        <div class="zman"><span>${shaa(e0.hatchala)}\u200E–\u200E${shaa(e0.siyum)}${e0.hatchala < H0 ? ' (הכנת שחר)' : ''}</span><span>${esc(t || '')}</span></div>
        ${em.map((e) => chip(e, hafaraIds, azharaIds)).join('')}
      </div>`;
    }
  });
  html += `</div></div>`;
  return html;
}

function tzirOvdim(s) {
  const H0 = s.H0;
  const menucha = new Map(s.menuchot.map((m) => [m.oved_id, m]));
  let html = `<div class="tzir-otef"><div class="oved-tzir"><div class="tavit-shura"></div>`;
  for (let i = 0; i < 24; i++) html += `<div class="shaa" style="font-size:12px;color:#5d6677;text-align:center;padding:4px">${shaa(H0 + i * 60)}</div>`;
  html += `<div class="sach">שעות</div>`;
  let row = 2;
  for (const k of kvutzotOvdim(K.ovdim)) {
    html += `<div class="kotar" style="grid-row:${row}">${esc(k.shem)}</div>`;
    row++;
    for (const o of k.ovdim) {
      const sheli = s.emdot.filter((e) => e.oved_id === o.id);
      const sach = sheli.reduce((a, e) => a + e.siyum - e.hatchala, 0);
      const m = menucha.get(o.id);
      html += `<div class="tavit-shura" style="grid-row:${row};grid-column:1">${esc(o.shem)} ${o.status === 'bechofesh' ? '<span class="tag bechofesh">בחופש</span>' : ''}${m ? `<span class="tag murchevet">${m.sug === 'yom_menucha_male' ? 'יום מנוחה מלא' : 'מנוחה מורחבת'}</span>` : ''}</div>`;
      html += `<div style="grid-row:${row};grid-column:2 / span 24"></div>`;
      for (const e of sheli) {
        const start = Math.max(e.hatchala, H0);
        const col = 2 + Math.floor((start - H0) / 60);
        const span = Math.max(1, Math.ceil((Math.min(e.siyum, H0 + YOM) - start) / 60));
        html += `<div class="bar ${e.mesima}" data-emda="${esc(e.id)}" style="grid-row:${row};grid-column:${col} / span ${span}" title="${esc(tavitEmda(e))}">${esc(M().EMDOT[e.emda])} ${shaa(e.hatchala)}${e.naul ? ' 🔒' : ''}</div>`;
      }
      html += `<div class="sach" style="grid-row:${row};grid-column:26">${sach ? shaot(sach) : ''}</div>`;
      row++;
    }
  }
  html += `</div></div>`;
  return html;
}

function ptachEmda(s, id) {
  const e = s.emdot.find((x) => x.id === id);
  if (!e) return;
  const o = e.oved_id ? oved(e.oved_id) : null;
  const n = e.nimuk || {};
  const mataim = K.ovdim.filter((x) => {
    const tabach = x.tafkid === 'tabach' || (x.tafkid === 'shef' && K.hagdarot.shef_kotabach);
    if (e.tafkid === 'pas_kar') return x.tafkid !== 'minhalan' && (x.bemaagar_pas_kar || tabach);
    if (e.tafkid === 'tabach') return tabach;
    return x.tafkid === e.tafkid;
  }).sort((a, b) => a.shem.localeCompare(b.shem, 'he'));
  const mesubatzim = new Set(s.emdot.filter((x) => x.oved_id && x.hatchala < e.siyum && e.hatchala < x.siyum && x.id !== e.id).map((x) => x.oved_id));
  const baayot = [...s.hafarot, ...s.azharot].filter((x) => x.emdot.includes(e.id));
  dialog.innerHTML = `
    <div class="dialog-guf">
      <h2 style="margin-top:0">${esc(tavitEmda(e))} (${esc(tavitTafkidEmda(e))})</h2>
      ${e.tzevet_id ? `<div class="chalash">צוות שתורו לפי המחזור: ${esc(tzevet(e.tzevet_id)?.shem)}</div>` : ''}
      <p><strong>${o ? esc(o.shem) : 'לא מאויש'}</strong> ${o ? tafkidHtml(o) + tagiotHtml(o) + ` <span class="tag">${esc(shiyuch(o))}</span>` : ''}
        ${e.butza ? '<span class="tag">כבר בוצע</span>' : ''}</p>
      <div class="nimuk">
        <strong>למה ${o ? 'האדם הזה נבחר' : 'העמדה לא אוישה'}:</strong>
        <div>${esc(n.txt || '—')}</div>
        ${n.derug ? `<div class="chalash">דירוג: ${esc(n.derug)}</div>` : ''}
        ${n.madadim ? `<div class="chalash">מדדים: ${esc(n.madadim)}</div>` : ''}
      </div>
      ${baayot.length ? `<h3>הפרות ואזהרות בעמדה</h3><ul>${baayot.map((b) => `<li style="color:${b.chumra === 'hafara' ? 'var(--hafara)' : 'var(--azhara)'}">${esc(b.txt)}</li>`).join('')}</ul>` : ''}
      ${n.chalufot?.length ? `<h3>חלופות שנבדקו (מתאימות, דורגו נמוך יותר)</h3>
        <table><tr><th>שם</th><th>דירוג</th><th>מדדים</th></tr>${n.chalufot.map((c) => `<tr><td>${esc(c.shem)}</td><td>${esc(c.derug)}</td><td class="chalash">${esc(c.pirut)}</td></tr>`).join('')}</table>` : ''}
      ${n.nifsalim?.length ? `<h3>נפסלו לפי הכללים הקשיחים</h3><ul>${n.nifsalim.map((c) => `<li><strong>${esc(c.shem)}</strong>: ${esc(c.siba)}</li>`).join('')}</ul>` : ''}
      ${n.bechofesh ? `<div class="chalash">${n.bechofesh} מתאימים נוספים בחופש.</div>` : ''}
      <h3>עריכה ידנית</h3>
      <div class="shura">
        <label>החלף ל: <select id="machlif" ${e.butza ? 'disabled' : ''}>
          <option value="">— לא מאויש —</option>
          ${mataim.map((x) => `<option value="${x.id}" ${x.id === e.oved_id ? 'selected' : ''}>${esc(x.shem)}${x.tafkid === 'shef' && e.tafkid !== 'shef' ? ' (שף)' : ''} · ${esc(shiyuch(x))}${x.status === 'bechofesh' ? ' · בחופש' : ''}${mesubatzim.has(x.id) ? ' · משובץ במקביל' : ''}</option>`).join('')}
        </select></label>
        <label><input type="checkbox" id="naul" ${e.naul ? 'checked' : ''}> נעילה (נשמר ביצירה מחדש ובשיבוץ מחדש)</label>
      </div>
    </div>
    <div class="dialog-tachtit"><button class="ikari" id="shmor">שמור ובדוק מחדש</button><button id="sgor">סגור</button></div>`;
  dialog.showModal();
  $('#sgor', dialog).onclick = () => dialog.close();
  $('#shmor', dialog).onclick = zehirut(async () => {
    const v = $('#machlif', dialog).value;
    const shinui = { id: e.id, naul: $('#naul', dialog).checked };
    if (!e.butza) shinui.oved_id = v ? Number(v) : null;
    dialog.close();
    tzayerLuach(await api('PUT', `/api/shibutz/${s.taarich}`, { shinuyim: [shinui] }));
  });
}

// =====================================================================
// תצוגת הדפסה
// =====================================================================
async function masachHadpasa(param) {
  const taarich = param || machar();
  const s = await api('GET', `/api/shibutz/${taarich}`);
  if (!s) { main.innerHTML = '<div class="kartis">אין שיבוץ ליום זה.</div>'; return; }
  const shem = (id) => oved(id)?.shem ?? '— חסר —';
  const kvutzot = new Map();
  for (const e of s.emdot) {
    if (!kvutzot.has(e.mishmeret)) kvutzot.set(e.mishmeret, []);
    kvutzot.get(e.mishmeret).push(e);
  }
  const k = [...kvutzot.values()];
  const tavla = (mesima, amudot) => {
    const sheli = k.filter((x) => x[0].mesima === mesima);
    return `<h2>${M().MESIMOT[mesima]}</h2><table><tr><th>שעות</th>${amudot.map(([, t]) => `<th>${t}</th>`).join('')}</tr>
      ${sheli.map((em) => `<tr><td>${em[0].shem_mishmeret ? esc(em[0].shem_mishmeret) + ' ' : ''}${shaa(em[0].hatchala)}\u200E–\u200E${shaa(em[0].siyum)}${em[0].tzevet_id ? ` (${esc(tzevet(em[0].tzevet_id)?.shem)})` : ''}</td>
        ${amudot.map(([f]) => `<td>${em.filter(f).map((e) => esc(shem(e.oved_id)) + (e.tafkid === 'shef' ? ' (שף)' : '')).join(', ')}</td>`).join('')}</tr>`).join('')}</table>`;
  };
  main.innerHTML = `
    <div class="hadpasa">
      <div class="shura lo-lehadpasa" style="margin-bottom:10px"><a class="kaftor" href="#luach/${taarich}">חזרה ללוח</a><button class="ikari" onclick="window.print()">הדפס</button></div>
      <h1>שיבוץ צוות מטבח — ${taarichTxt(taarich)} (06:00–06:00) · מצב: ${esc(M().MATZAVIM[s.matzav])}${s.status === 'tyuta' ? ' · טיוטה' : ''}</h1>
      ${tavla('pas_cham', [[(e) => e.emda === 'pas_cham_a', 'פס חם א'], [(e) => e.emda === 'pas_cham_b', 'פס חם ב']])}
      ${tavla('hachanot', [[(e) => e.tafkid === 'shef', 'שף'], [(e) => e.tafkid === 'tabach', 'טבחים']])}
      ${tavla('pas_kar', [[() => true, 'פס קר']])}
      ${tavla('minhal', [[(e) => e.tafkid === 'minhalan', 'מנהלנים'], [(e) => e.tafkid === 'tabach', 'טבח']])}
      ${s.menuchot.length ? `<p><strong>מנוחה מורחבת:</strong> ${s.menuchot.map((m) => esc(shem(m.oved_id)) + (m.sug === 'yom_menucha_male' ? ' (יום מנוחה מלא)' : '')).join(', ')}</p>` : ''}
    </div>`;
}

// =====================================================================
// עובדים
// =====================================================================
async function masachOvdim() {
  await tkaneKlali();
  main.innerHTML = `
    <h1>עובדים</h1>
    <div class="kartis shura"><button class="ikari" id="chadash">הוספת עובד</button><span class="chalash">${K.ovdim.length} עובדים</span></div>
    <div class="kartis" style="overflow-x:auto">
      <table>
        <tr><th>שם/כינוי</th><th>תפקיד בסיס</th><th>תגיות</th><th>סטטוס</th><th>תאריך חזרה צפוי</th><th>צוות / מאגר</th><th>הערות</th><th></th></tr>
        ${K.ovdim.map((o) => `<tr>
          <td><strong>${esc(o.shem)}</strong></td><td>${tafkidHtml(o)}</td><td>${tagiotHtml(o)}</td>
          <td>${o.status === 'nimtza' ? 'נמצא' : '<span class="tag bechofesh">בחופש</span>'}</td>
          <td>${esc(o.taarich_chazara || '')}</td><td>${esc(shiyuch(o))}</td><td>${esc(o.hearot)}</td>
          <td><button data-arich="${o.id}">עריכה</button> <button class="sakana" data-mechak="${o.id}">מחיקה</button></td></tr>`).join('')}
      </table>
    </div>`;
  $('#chadash').onclick = () => tofesOved({ shem: '', tafkid: 'tabach', tagiot: [], status: 'nimtza', hearot: '' });
  for (const b of $$('[data-arich]')) b.onclick = () => tofesOved(oved(Number(b.dataset.arich)));
  for (const b of $$('[data-mechak]')) b.onclick = zehirut(async () => {
    const o = oved(Number(b.dataset.mechak));
    if (!confirm(`למחוק את ${o.shem}? עובד עם היסטוריה יועבר לארכיון כדי לשמור על ההיסטוריה.`)) return;
    await api('DELETE', `/api/ovdim/${o.id}`);
    await masachOvdim();
  });
}

function tofesOved(o) {
  dialog.innerHTML = `
    <div class="dialog-guf">
      <h2 style="margin-top:0">${o.id ? 'עריכת עובד' : 'הוספת עובד'}</h2>
      <div class="sade"><label for="f-shem">שם/כינוי</label><input id="f-shem" value="${esc(o.shem)}"></div>
      <div class="sade"><label for="f-tafkid">תפקיד בסיס</label><select id="f-tafkid">${Object.entries(M().TAFKIDIM).map(([k, v]) => `<option value="${k}" ${o.tafkid === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="sade"><span>תגיות</span><span>${Object.entries(M().TAGIOT).map(([k, v]) => `<label><input type="checkbox" data-tagit="${k}" ${o.tagiot.includes(k) ? 'checked' : ''}> ${v}</label>`).join(' ')}</span></div>
      <div class="sade"><label for="f-status">סטטוס</label><select id="f-status">${Object.entries(M().STATUSIM).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="sade"><label for="f-chazara">תאריך חזרה צפוי</label><input type="date" id="f-chazara" value="${esc(o.taarich_chazara || '')}"></div>
      <div class="sade"><label for="f-tzevet">צוות</label><select id="f-tzevet"><option value="">— ללא צוות —</option>${K.tzevatim.map((t) => `<option value="${t.id}" ${o.tzevet_id === t.id ? 'selected' : ''}>${esc(t.shem)}</option>`).join('')}</select></div>
      <div class="sade"><label><input type="checkbox" id="f-maagar" ${o.bemaagar_pas_kar ? 'checked' : ''}> במאגר פס קר (רק למי שלא בצוות)</label></div>
      <div class="sade"><label for="f-hearot">הערות</label><input id="f-hearot" value="${esc(o.hearot || '')}" style="flex:1"></div>
      <p class="chalash">מנהלן משובץ רק למשימת "מנהל". שינוי מבנה הצוותים ומיקומם במחזור — במסך מצב פתיחה.</p>
    </div>
    <div class="dialog-tachtit"><button class="ikari" id="shmor">שמירה</button><button id="sgor">ביטול</button></div>`;
  dialog.showModal();
  $('#sgor', dialog).onclick = () => dialog.close();
  $('#shmor', dialog).onclick = zehirut(async () => {
    await api('POST', '/api/ovdim', {
      id: o.id,
      shem: $('#f-shem', dialog).value,
      tafkid: $('#f-tafkid', dialog).value,
      tagiot: $$('[data-tagit]', dialog).filter((c) => c.checked).map((c) => c.dataset.tagit),
      status: $('#f-status', dialog).value,
      taarich_chazara: $('#f-chazara', dialog).value || null,
      tzevet_id: Number($('#f-tzevet', dialog).value) || null,
      bemaagar_pas_kar: $('#f-maagar', dialog).checked ? 1 : 0,
      hearot: $('#f-hearot', dialog).value,
      seder: o.seder || 9,
    });
    dialog.close();
    hodaa('נשמר');
    await masachOvdim();
  });
}

// =====================================================================
// היסטוריה
// =====================================================================
async function masachHistoria() {
  await tkaneKlali();
  const yamim = await api('GET', '/api/shibutzim');
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const mi = q.get('mi') || '', ad = q.get('ad') || '', ovedId = q.get('oved_id') || '';
  const shurot = await api('GET', `/api/historia?${new URLSearchParams(Object.entries({ mi, ad, oved_id: ovedId }).filter(([, v]) => v))}`);
  const isoShaa = (iso) => iso.slice(11, 16);
  main.innerHTML = `
    <h1>היסטוריה</h1>
    <div class="kartis">
      <h2 style="margin-top:0">ימי שיבוץ</h2>
      <div class="shura">${yamim.map((y) => `<a class="kaftor" href="#luach/${y.taarich}">${y.taarich} <span class="tag ${y.status === 'mefursam' ? 'murchevet' : ''}">${y.status === 'mefursam' ? 'מפורסם' : 'טיוטה'}</span></a>`).join('') || '<span class="chalash">אין עדיין.</span>'}</div>
    </div>
    <div class="kartis">
      <div class="shura">
        <label>מתאריך <input type="date" id="mi" value="${mi}"></label>
        <label>עד תאריך <input type="date" id="ad" value="${ad}"></label>
        <label>עובד <select id="oved"><option value="">כולם</option>${K.ovdim.map((o) => `<option value="${o.id}" ${String(o.id) === ovedId ? 'selected' : ''}>${esc(o.shem)}</option>`).join('')}</select></label>
        <button id="sanen">סנן</button>
        <span class="chalash">${shurot.length} משמרות שבוצעו (מפורסמות)</span>
      </div>
    </div>
    <div class="kartis" style="overflow-x:auto">
      <table>
        <tr><th>תאריך</th><th>עובד</th><th>משימה</th><th>עמדה</th><th>התחלה</th><th>סיום</th></tr>
        ${shurot.map((r) => `<tr><td>${r.taarich}</td><td>${esc(oved(r.oved_id)?.shem ?? '#' + r.oved_id)}</td><td>${esc(M().MESIMOT[r.mesima])}${r.mishmeret ? ' ' + esc(r.mishmeret) : ''}</td>
          <td>${esc(M().EMDOT[r.emda])}</td><td>${r.hatchala.slice(0, 10) !== r.taarich ? r.hatchala.slice(5, 10) + ' ' : ''}${isoShaa(r.hatchala)}</td><td>${isoShaa(r.siyum)}</td></tr>`).join('')}
      </table>
    </div>`;
  $('#sanen').onclick = () => {
    const p = new URLSearchParams(Object.entries({ mi: $('#mi').value, ad: $('#ad').value, oved_id: $('#oved').value }).filter(([, v]) => v));
    location.hash = `historia?${p}`;
  };
}

// =====================================================================
// הוגנות
// =====================================================================
async function masachHogenut() {
  await tkaneKlali();
  const rows = await api('GET', '/api/hogenut');
  let miyun = { k: 'dakot14', kivun: -1 };
  const amudot = [
    ['shem', 'עובד'], ['tafkid', 'תפקיד'], ['shiyuch', 'צוות / מאגר'], ['dakot7', 'שעות עבודה 7 ימים'], ['dakot14', 'שעות עבודה 14 ימים'],
    ['layla14', 'משמרות לילה (14 יום)'], ['pasKar14', 'משמרות פס קר (14 יום)'], ['murchevet14', 'מנוחות מורחבות (14 יום)'], ['murchevetAcharona', 'מנוחה מורחבת אחרונה'],
  ];
  for (const r of rows) r.shiyuch = shiyuch(r);
  const tziyer = () => {
    const sorted = [...rows].sort((a, b) => {
      const x = a[miyun.k] ?? -Infinity, y = b[miyun.k] ?? -Infinity;
      return (typeof x === 'string' ? x.localeCompare(y, 'he') : x - y) * miyun.kivun;
    });
    main.innerHTML = `
      <h1>הוגנות</h1>
      <div class="kartis chalash">מנוחה מורחבת ניתנת למי שקיבל הכי מעט לאחרונה · שיבוץ לפס קר הולך למי שעשה הכי מעט · לא נדרש שוויון מוחלט, ושבתות לא מקבלות יחס מיוחד. מחושב מהשיבוצים שפורסמו עד עכשיו.</div>
      <div class="kartis" style="overflow-x:auto">
        <table>
          <tr>${amudot.map(([k, t]) => `<th data-k="${k}" style="cursor:pointer">${t}${miyun.k === k ? (miyun.kivun > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr>
          ${sorted.map((r) => `<tr><td><strong>${esc(r.shem)}</strong></td><td>${esc(M().TAFKIDIM[r.tafkid])}</td><td>${esc(r.shiyuch)}</td>
            <td>${shaot(r.dakot7)}</td><td>${shaot(r.dakot14)}</td><td>${r.layla14}</td><td>${r.pasKar14}</td><td>${r.murchevet14}</td>
            <td>${r.murchevetAcharona != null ? `${taarichMeDakot(r.murchevetAcharona)} ${shaa(r.murchevetAcharona)}` : '—'}</td></tr>`).join('')}
        </table>
      </div>`;
    for (const th of $$('th[data-k]')) th.onclick = () => { miyun = { k: th.dataset.k, kivun: miyun.k === th.dataset.k ? -miyun.kivun : -1 }; tziyer(); };
  };
  tziyer();
}

// =====================================================================
// מצב פתיחה
// =====================================================================
function shlaveiMachzor(n) {
  const basis = ['pas_cham', 'menucha_achrei_pas_cham', 'hachanot', 'menucha_achrei_hachanot'];
  return n <= 4 ? basis.slice(0, n) : [...basis, ...Array(n - 4).fill('menucha')];
}

async function masachPtiha() {
  await tkaneKlali();
  const mp = K.matzav_ptiha;
  const st = {
    taarich: mp?.taarich || machar(),
    mishmeret: mp?.mishmeret ?? 0,
    tzevatim: K.tzevatim.map((t) => ({
      id: t.id, shem: t.shem,
      shlav: mp?.tzevatim.find((x) => x.id === t.id)?.shlav ?? 0,
      chaverim: K.ovdim.filter((o) => o.tzevet_id === t.id).sort((a, b) => (a.tafkid === 'shef' ? -1 : 0) - (b.tafkid === 'shef' ? -1 : 0) || a.seder - b.seder).map((o) => o.id),
    })),
    maagar: K.ovdim.filter((o) => !o.tzevet_id && o.bemaagar_pas_kar).map((o) => o.id),
  };
  if (!st.tzevatim.length) {
    st.tzevatim = [0, 1, 2, 3].map((i) => ({ shem: `צוות ${i + 1}`, shlav: i, chaverim: [] }));
  }
  const tabachimBatzevet = K.hagdarot.pas_cham.emdot.reduce((s, e) => s + Number(e.tabach || 0), 0);

  const tziyer = () => {
    const n = st.tzevatim.length;
    const shlavim = shlaveiMachzor(n);
    const tafus = new Set(st.tzevatim.flatMap((t) => t.chaverim));
    const optziot = (tafkid, nochechi) => `<option value="">—</option>` + K.ovdim
      .filter((o) => (o.tafkid === tafkid || (tafkid === 'tabach' && o.tafkid === 'shef' && K.hagdarot.shef_kotabach)) && (!tafus.has(o.id) || o.id === nochechi))
      .map((o) => `<option value="${o.id}" ${o.id === nochechi ? 'selected' : ''}>${esc(o.shem)}${o.tafkid !== tafkid ? ' (שף)' : ''}${o.tagiot.length ? ' · ' + o.tagiot.map((t) => M().TAGIOT[t]).join(', ') : ''}</option>`).join('');
    main.innerHTML = `
      <h1>מצב פתיחה</h1>
      <div class="kartis chalash">מזינים פעם אחת את השיבוץ הקבוע הקיים: מי בכל צוות, איפה כל צוות נמצא כרגע במחזור, מי במאגר פס קר. המערכת ממשיכה מהמצב הזה ולא מתחילה מאפס. מחזור הצוות: פס חם (8 ש') → מנוחה (8 ש') → הכנות (8 ש') → מנוחה (8 ש').</div>
      <div class="kartis shura">
        <label>תאריך ייחוס <input type="date" id="taarich" value="${st.taarich}"></label>
        <label>משמרת ייחוס <select id="mishmeret">${K.hagdarot.pas_cham.mishmarot.map((m, i) => `<option value="${i}" ${Number(st.mishmeret) === i ? 'selected' : ''}>${esc(m.shem)} ${m.hatchala}\u200E–\u200E${m.siyum}</option>`).join('')}</select></label>
        <span class="chalash">"איפה הצוות נמצא" — במשמרת הזו.</span>
      </div>
      <div class="tzvatim-grid">
        ${st.tzevatim.map((t, ti) => `
          <div class="tzevet-kartis">
            <div class="shura"><input data-shem="${ti}" value="${esc(t.shem)}" style="flex:1"><button class="sakana" data-hasar="${ti}" title="הסרת צוות">✕</button></div>
            <label>מיקום במחזור: <select data-shlav="${ti}">${shlavim.map((s, i) => `<option value="${i}" ${Number(t.shlav) === i ? 'selected' : ''}>${esc(M().SHLAVEI_MACHZOR[s])}</option>`).join('')}</select></label>
            ${(() => {
              const shefId = t.chaverim.find((id) => oved(id)?.tafkid === 'shef');
              const tab = t.chaverim.filter((id) => id !== shefId);
              return `<div style="margin-top:6px">שף: <select data-chaver="${ti}:0" data-tafkid="shef">${optziot('shef', shefId)}</select></div>`;
            })()}
            ${(() => {
              const shefId = t.chaverim.find((id) => oved(id)?.tafkid === 'shef');
              const tab = t.chaverim.filter((id) => id !== shefId);
              const slots = Math.max(tabachimBatzevet, tab.length + 0);
              return Array.from({ length: slots }, (_, i) => `<div>טבח ${i + 1}: <select data-chaver="${ti}:${i + 1}" data-tafkid="tabach">${optziot('tabach', tab[i])}</select></div>`).join('');
            })()}
            <button data-hosef-tabach="${ti}" style="margin-top:6px">+ טבח</button>
          </div>`).join('')}
      </div>
      <div class="kartis shura" style="margin-top:12px"><button id="hosef-tzevet">+ צוות</button><span class="chalash">במצב מלא יש 4 צוותים. צוות חמישי מוסיף מנוחה למחזור (מתאים לעודף).</span></div>
      <div class="kartis">
        <h2 style="margin-top:0">מאגר פס קר</h2>
        <div class="chips-nochechut">${K.ovdim.filter((o) => o.tafkid !== 'minhalan' && !tafus.has(o.id)).map((o) => `<label><input type="checkbox" data-maagar="${o.id}" ${st.maagar.includes(o.id) ? 'checked' : ''}> ${esc(o.shem)} ${tafkidHtml(o)} ${tagiotHtml(o)}</label>`).join('') || '<span class="chalash">כל הטבחים בצוותים.</span>'}</div>
        <h2>מנהלנים</h2>
        <div>${K.ovdim.filter((o) => o.tafkid === 'minhalan').map((o) => `<span class="tag tafkid-minhalan">${esc(o.shem)}</span>`).join(' ') || '<span class="chalash">אין מנהלנים — הוסיפו במסך עובדים.</span>'}</div>
      </div>
      <div class="kartis shura"><button class="ikari" id="shmor">שמור מצב פתיחה</button>
        ${mp ? `<span class="chalash">נשמר לאחרונה: ${esc(mp.nishmar.slice(0, 16).replace('T', ' '))}</span>` : ''}</div>`;

    $('#taarich').onchange = (ev) => { st.taarich = ev.target.value; };
    $('#mishmeret').onchange = (ev) => { st.mishmeret = Number(ev.target.value); };
    for (const el of $$('[data-shem]')) el.oninput = () => { st.tzevatim[el.dataset.shem].shem = el.value; };
    for (const el of $$('[data-shlav]')) el.onchange = () => { st.tzevatim[el.dataset.shlav].shlav = Number(el.value); };
    for (const el of $$('[data-chaver]')) el.onchange = () => {
      const [ti] = el.dataset.chaver.split(':').map(Number);
      const t = st.tzevatim[ti];
      const ids = $$(`[data-chaver^="${ti}:"]`).map((x) => Number(x.value)).filter(Boolean);
      t.chaverim = ids;
      st.maagar = st.maagar.filter((id) => !ids.includes(id));
      tziyer();
    };
    for (const el of $$('[data-hosef-tabach]')) el.onclick = () => {
      const t = st.tzevatim[el.dataset.hosefTabach];
      const panui = K.ovdim.find((o) => o.tafkid === 'tabach' && !st.tzevatim.some((x) => x.chaverim.includes(o.id)));
      if (panui) { t.chaverim.push(panui.id); st.maagar = st.maagar.filter((id) => id !== panui.id); tziyer(); } else hodaa('אין טבחים פנויים', true);
    };
    for (const el of $$('[data-hasar]')) el.onclick = () => { st.tzevatim.splice(Number(el.dataset.hasar), 1); st.tzevatim.forEach((t) => { t.shlav = Math.min(t.shlav, st.tzevatim.length - 1); }); tziyer(); };
    $('#hosef-tzevet').onclick = () => {
      const tfusim = new Set(st.tzevatim.map((t) => t.shlav));
      const shlav = shlaveiMachzor(st.tzevatim.length + 1).findIndex((_, i) => !tfusim.has(i));
      st.tzevatim.push({ shem: `צוות ${st.tzevatim.length + 1}`, shlav, chaverim: [] });
      tziyer();
    };
    for (const el of $$('[data-maagar]')) el.onchange = () => {
      const id = Number(el.dataset.maagar);
      st.maagar = el.checked ? [...st.maagar, id] : st.maagar.filter((x) => x !== id);
    };
    $('#shmor').onclick = zehirut(async () => {
      await api('PUT', '/api/matzav-ptiha', st);
      await tkaneKlali();
      hodaa('מצב הפתיחה נשמר — המערכת ממשיכה ממנו');
      await masachPtiha();
    });
  };
  tziyer();
}

// =====================================================================
// הגדרות
// =====================================================================
async function masachHagdarot() {
  await tkaneKlali();
  let H = structuredClone(K.hagdarot);
  const get = (p) => p.split('.').reduce((o, k) => o?.[k], H);
  const set = (p, v) => {
    const keys = p.split('.');
    const last = keys.pop();
    keys.reduce((o, k) => o[k], H)[last] = v;
  };
  const num = (p, label, step = 1) => `<div class="sade"><label>${label}</label><input type="number" step="${step}" min="0" data-p="${p}" value="${esc(get(p))}"></div>`;
  const time = (p, label) => `<div class="sade"><label>${label}</label><input type="time" data-p="${p}" value="${esc(get(p))}"></div>`;
  const bool = (p, label) => `<div class="sade"><label><input type="checkbox" data-p="${p}" ${get(p) ? 'checked' : ''}> ${label}</label></div>`;

  const tziyer = () => {
    main.innerHTML = `
      <h1>הגדרות</h1>
      <div class="hagdarot-grid">
        <div class="kartis">
          <h2 style="margin-top:0">שעות</h2>
          ${time('yom_hatchala', 'תחילת יממת השיבוץ')}
          <h3>משמרות פס חם והכנות</h3>
          ${H.pas_cham.mishmarot.map((m, i) => `<div class="sade"><input data-p="pas_cham.mishmarot.${i}.shem" value="${esc(m.shem)}" style="width:90px">
            <input type="time" data-p="pas_cham.mishmarot.${i}.hatchala" value="${m.hatchala}"> – <input type="time" data-p="pas_cham.mishmarot.${i}.siyum" value="${m.siyum}"></div>`).join('')}
          <h3>הכנת שחר</h3>
          ${bool('hachanat_shachar.pail', 'צוות פס חם מתחיל לפני המשמרת')}
          ${time('hachanat_shachar.shaa', 'שעת התחלה בפועל')}
          <div class="sade"><label>במשמרת</label><select data-p="hachanat_shachar.mishmeret" data-num="1">${H.pas_cham.mishmarot.map((m, i) => `<option value="${i}" ${Number(H.hachanat_shachar.mishmeret) === i ? 'selected' : ''}>${esc(m.shem)}</option>`).join('')}</select></div>
          <h3>חריגות</h3>
          ${bool('chariga_menucha_lifnei_boker', 'חריגה מותרת: המנוחה שלפני פס חם בוקר מסתיימת בהכנת שחר (נספרת עד תחילת המשמרת)')}
        </div>

        <div class="kartis">
          <h2 style="margin-top:0">גודלי ההרכבים</h2>
          <h3>פס חם</h3>
          ${H.pas_cham.emdot.map((e, i) => `<div class="sade"><span>${esc(M().EMDOT[e.emda])}</span><span>שף <input type="number" min="0" data-p="pas_cham.emdot.${i}.shef" value="${e.shef}"> טבחים <input type="number" min="0" data-p="pas_cham.emdot.${i}.tabach" value="${e.tabach}"></span></div>`).join('')}
          <div class="chalash">חובה: שף אחד בדיוק, ותמיד בפס חם א.</div>
          ${bool('shef_kotabach', 'שף יכול לשמש גם כטבח (בעמדות טבח, בפס קר ובמנהל)')}
          <h3>הכנות</h3>
          ${num('hachanot.shef', 'שפים')}
          ${num('hachanot.tabach', 'טבחים')}
          <h3>תגיות רצויות בכל משמרת פס חם</h3>
          <div>${Object.entries(M().TAGIOT).map(([k, v]) => `<label><input type="checkbox" data-tagit="${k}" ${H.pas_cham.tagiot_retzuyot.includes(k) ? 'checked' : ''}> ${v}</label>`).join(' ')}</div>
        </div>

        <div class="kartis">
          <h2 style="margin-top:0">פס קר</h2>
          ${num('pas_kar.anashim', 'אנשים בכל רגע')}
          ${num('pas_kar.orech_shaot', 'אורך משמרת (שעות)')}
          ${num('pas_kar.maagar_muadaf', 'מצב מועדף: גודל מאגר')}
          ${num('pas_kar.menucha_muadefet', 'מצב מועדף: מנוחה אחרי משמרת (שעות)')}
          ${num('pas_kar.maagar_minimum', 'מצב מינימום: גודל מאגר')}
          ${num('pas_kar.menucha_minimum', 'מצב מינימום: מנוחה אחרי משמרת (שעות)')}
        </div>

        <div class="kartis">
          <h2 style="margin-top:0">מנהל</h2>
          ${H.minhal.mishmarot.map((m, i) => `<div class="sade">
            <span><input type="time" data-p="minhal.mishmarot.${i}.hatchala" value="${m.hatchala}"> – <input type="time" data-p="minhal.mishmarot.${i}.siyum" value="${m.siyum}"></span>
            <span>מנהלנים <input type="number" min="0" data-p="minhal.mishmarot.${i}.minhalanim" value="${m.minhalanim}" style="width:56px">
            טבחים <input type="number" min="0" data-p="minhal.mishmarot.${i}.tabachim" value="${m.tabachim}" style="width:56px"></span>
            <button class="sakana" data-hasar-minhal="${i}">✕</button></div>`).join('')}
          <button id="hosef-minhal">+ משמרת מנהל</button>
        </div>

        <div class="kartis">
          <h2 style="margin-top:0">מינימום המנוחה (שעות)</h2>
          ${num('menucha.achrei_pas_cham', 'אחרי פס חם')}
          ${num('menucha.achrei_hachanot', 'אחרי הכנות')}
          ${num('menucha.achrei_minhal', 'אחרי מנהל')}
          <div class="chalash">אחרי פס קר — לפי מצב מועדף / מינימום בכרטיס פס קר.</div>
          ${num('menucha_murchevet_shaot', 'הפסקה שנחשבת מנוחה מורחבת (שעות)')}
        </div>

        <div class="kartis">
          <h2 style="margin-top:0">סדר הוויתור במקרה של חוסר</h2>
          <ol style="padding-inline-start:18px">${H.seder_vitur.map((v, i) => `<li class="sade"><label><input type="checkbox" data-vitur="${i}" ${v.pail ? 'checked' : ''}> ${esc(M().VITURIM[v.id])}</label>
            <span><button data-lemala="${i}" ${i === 0 ? 'disabled' : ''}>↑</button><button data-lemata="${i}" ${i === H.seder_vitur.length - 1 ? 'disabled' : ''}>↓</button></span></li>`).join('')}</ol>
          <div class="chalash">פס חם (6) והכנות (4) לא יורדים לעולם. אם אי אפשר לאייש אותן — התראה בולטת, והשיבוץ לא מתפרסם בלי אישור ידני.</div>
          <h2>עודף</h2>
          <select data-p="odef">${Object.entries(M().ODEF).map(([k, v]) => `<option value="${k}" ${H.odef === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        </div>
      </div>
      <div class="kartis shura" style="margin-top:12px"><button class="ikari" id="shmor">שמור הגדרות</button><button id="brirat-mechdal">החזר לברירת מחדל</button></div>`;

    for (const el of $$('[data-p]')) {
      el.onchange = () => {
        const p = el.dataset.p;
        let v = el.type === 'checkbox' ? el.checked : el.value;
        if (el.type === 'number' || el.dataset.num) v = Number(v);
        set(p, v);
      };
    }
    for (const el of $$('[data-tagit]')) el.onchange = () => {
      H.pas_cham.tagiot_retzuyot = $$('[data-tagit]').filter((c) => c.checked).map((c) => c.dataset.tagit);
    };
    for (const el of $$('[data-vitur]')) el.onchange = () => { H.seder_vitur[el.dataset.vitur].pail = el.checked; };
    const hazez = (i, j) => { const a = H.seder_vitur; [a[i], a[j]] = [a[j], a[i]]; tziyer(); };
    for (const el of $$('[data-lemala]')) el.onclick = () => hazez(Number(el.dataset.lemala), Number(el.dataset.lemala) - 1);
    for (const el of $$('[data-lemata]')) el.onclick = () => hazez(Number(el.dataset.lemata), Number(el.dataset.lemata) + 1);
    for (const el of $$('[data-hasar-minhal]')) el.onclick = () => { H.minhal.mishmarot.splice(Number(el.dataset.hasarMinhal), 1); tziyer(); };
    $('#hosef-minhal').onclick = () => { H.minhal.mishmarot.push({ hatchala: '00:00', siyum: '06:00', minhalanim: 1, tabachim: 0 }); tziyer(); };
    $('#brirat-mechdal').onclick = () => { H = structuredClone(K.hagdarot_brirat_mechdal); tziyer(); hodaa('ערכי ברירת המחדל נטענו — לחצו "שמור" כדי לשמור'); };
    $('#shmor').onclick = zehirut(async () => {
      await api('PUT', '/api/hagdarot', H);
      await tkaneKlali();
      hodaa('ההגדרות נשמרו. יחולו על טיוטות חדשות.');
    });
  };
  tziyer();
}

// ---------- התחלה ----------
await tkaneKlali();
render();
