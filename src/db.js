// מסד נתונים (SQLite מובנה ב-Node). שמות הטבלאות הם תעתיק של המונחים.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tzevatim (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shem TEXT NOT NULL,
  seder INTEGER NOT NULL DEFAULT 0,
  ogen_pas_cham INTEGER            -- מספר משמרת (גלובלי) שבה הצוות היה בפס חם; ממנו נגזר המחזור
);
CREATE TABLE IF NOT EXISTS ovdim (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shem TEXT NOT NULL,
  tafkid TEXT NOT NULL CHECK (tafkid IN ('shef', 'tabach', 'minhalan')),
  tagiot TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'nimtza' CHECK (status IN ('nimtza', 'bechofesh')),
  taarich_chazara TEXT,
  hearot TEXT NOT NULL DEFAULT '',
  tzevet_id INTEGER REFERENCES tzevatim(id) ON DELETE SET NULL,
  bemaagar_pas_kar INTEGER NOT NULL DEFAULT 0,
  seder INTEGER NOT NULL DEFAULT 0,
  pail INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS hagdarot (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS matzav_ptiha (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  taarich TEXT NOT NULL,
  mishmeret INTEGER NOT NULL,
  nishmar TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS doch_nochechut (
  taarich TEXT NOT NULL,
  oved_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('nimtza', 'bechofesh')),
  PRIMARY KEY (taarich, oved_id)
);
CREATE TABLE IF NOT EXISTS shibutzim (
  taarich TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'tyuta' CHECK (status IN ('tyuta', 'mefursam')),
  udkan TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS historia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oved_id INTEGER NOT NULL,
  mesima TEXT NOT NULL,
  emda TEXT NOT NULL,
  hatchala TEXT NOT NULL,
  siyum TEXT NOT NULL,
  hatchala_mishmeret TEXT,
  taarich TEXT NOT NULL,
  mishmeret TEXT
);
CREATE INDEX IF NOT EXISTS historia_taarich ON historia (taarich);
CREATE INDEX IF NOT EXISTS historia_oved ON historia (oved_id, hatchala);
`;

export function ptachDb(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}

export function iska(db, fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
