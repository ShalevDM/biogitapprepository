// פרסום: שורות היסטוריה משיבוץ
import { muchlatLeiso } from '../zman.js';

export function emdotLehistoria(taarich, emdot) {
  return emdot.filter((e) => e.oved_id).map((e) => ({
    oved_id: e.oved_id,
    mesima: e.mesima,
    emda: e.emda,
    hatchala: muchlatLeiso(e.hatchala),
    siyum: muchlatLeiso(e.siyum),
    hatchala_mishmeret: muchlatLeiso(e.nominal),
    taarich,
    mishmeret: e.shem_mishmeret || null,
  }));
}
