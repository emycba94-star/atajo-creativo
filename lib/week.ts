// Utilidades de semana ISO + labels en español (AR).
// week_id con formato "2026-W38".

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

// Devuelve [año ISO, número de semana ISO] para una fecha dada.
function isoYearWeek(date: Date): [number, number] {
  // Copia en UTC para evitar líos de zona horaria.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // ISO: la semana empieza el lunes. getUTCDay() domingo=0..sábado=6.
  const dayNum = (d.getUTCDay() + 6) % 7; // lunes=0..domingo=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // jueves de esta semana
  const isoYear = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week =
    1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return [isoYear, week];
}

// Lunes de la semana ISO que contiene `date`.
function mondayOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // lunes=0
  d.setUTCDate(d.getUTCDate() - dayNum);
  return d;
}

export type WeekInfo = {
  weekId: string;   // "2026-W38"
  weekLabel: string; // "Semana del 15 al 21 sep"
};

export function weekInfoFor(date: Date): WeekInfo {
  const [year, week] = isoYearWeek(date);
  const weekId = `${year}-W${String(week).padStart(2, "0")}`;

  const mon = mondayOf(date);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);

  const dMon = mon.getUTCDate();
  const dSun = sun.getUTCDate();
  const mMon = MESES[mon.getUTCMonth()];
  const mSun = MESES[sun.getUTCMonth()];

  const rango =
    mMon === mSun
      ? `${dMon} al ${dSun} ${mSun}`
      : `${dMon} ${mMon} al ${dSun} ${mSun}`;

  return { weekId, weekLabel: `Semana del ${rango}` };
}

export function currentWeek(): WeekInfo {
  return weekInfoFor(new Date());
}

// Suma (o resta) semanas y devuelve su info.
export function shiftWeek(weekId: string, delta: number): WeekInfo {
  const anchor = mondayFromWeekId(weekId);
  anchor.setUTCDate(anchor.getUTCDate() + delta * 7);
  return weekInfoFor(anchor);
}

// Lunes de un weekId dado.
export function mondayFromWeekId(weekId: string): Date {
  const m = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return mondayOf(new Date());
  const year = Number(m[1]);
  const week = Number(m[2]);
  // Jueves de la semana 1 de ese año ISO.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday;
}

// ¿weekId A es posterior a weekId B? (para no pasar de la semana actual)
export function isAfter(weekIdA: string, weekIdB: string): boolean {
  return mondayFromWeekId(weekIdA).getTime() > mondayFromWeekId(weekIdB).getTime();
}
