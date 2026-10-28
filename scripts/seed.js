// טעינת נתוני הדמה (30 עובדים + מצב פתיחה) למסד הנתונים של האפליקציה
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, rmSync } from 'node:fs';
import { ptachDb } from '../src/db.js';
import { Sherut } from '../src/sherut.js';
import { netuneiDema } from './netunei-dema.js';
import { hosefYamim } from '../src/zman.js';

const SHORESH = fileURLToPath(new URL('..', import.meta.url));
const nativ = process.env.DB_PATH || join(SHORESH, 'data', 'shibutz.db');
if (existsSync(nativ)) {
  if (!process.argv.includes('--force')) {
    console.error(`המסד ${nativ} כבר קיים. הריצו עם --force כדי למחוק ולטעון מחדש.`);
    process.exit(1);
  }
  rmSync(nativ);
}

const sherut = new Sherut(ptachDb(nativ));
const machar = hosefYamim(sherut.hayom(), 1);
const { ovdim, tzevatim } = netuneiDema(machar);
const mapa = new Map();
for (const o of ovdim) {
  const { id, tzevet_id, bemaagar_pas_kar, ...shar } = o;
  mapa.set(id, sherut.shmorOved({ ...shar, tzevet_id: null, bemaagar_pas_kar: 0 }));
}
// מצב פתיחה: במשמרת הבוקר של מחר — צוות 1 בפס חם, צוות 2 במנוחה אחרי פס חם, צוות 3 בהכנות, צוות 4 במנוחה אחרי הכנות
sherut.shmorMatzavPtiha({
  taarich: machar,
  mishmeret: 0,
  tzevatim: tzevatim.map((t, i) => ({
    shem: t.shem,
    shlav: i,
    chaverim: ovdim.filter((o) => o.tzevet_id === t.id).sort((a, b) => a.seder - b.seder).map((o) => mapa.get(o.id)),
  })),
  maagar: ovdim.filter((o) => o.bemaagar_pas_kar).map((o) => mapa.get(o.id)),
});
console.log(`נטענו ${ovdim.length} עובדים ו-${tzevatim.length} צוותים אל ${nativ}. מצב פתיחה: ${machar} בוקר.`);
