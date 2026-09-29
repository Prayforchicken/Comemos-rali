/* Fechas y horas. Las fechas se guardan como "YYYY-MM-DD" en hora de España. */
import type { Momento } from "./tipos";

export const ZONA = "Europe/Madrid";

/** Fecha local "YYYY-MM-DD" de un instante. */
export function fechaDe(d: Date = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${v("year")}-${v("month")}-${v("day")}`;
}

/** Hora local "HH:MM" de un instante. */
export function horaDe(d: Date = new Date()) {
  return new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

export const minutos = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

export function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(desde: string, hasta: string) {
  return Math.round((new Date(`${hasta}T12:00:00Z`).getTime() - new Date(`${desde}T12:00:00Z`).getTime()) / 86_400_000);
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const diaSemana = (f: string) => new Date(`${f}T12:00:00Z`).getUTCDay();

/** "martes 29 de septiembre" */
export const fechaLarga = (f: string) => `${DIAS[diaSemana(f)]} ${Number(f.slice(8))} de ${MESES[Number(f.slice(5, 7)) - 1]}`;
/** "29 sep" */
export const fechaCorta = (f: string) => `${Number(f.slice(8))} ${MESES[Number(f.slice(5, 7)) - 1].slice(0, 3)}`;
/** "mar" */
export const diaCorto = (f: string) => DIAS_CORTOS[diaSemana(f)];

/** "hoy", "mañana", "ayer" o "mié" (para los próximos días). */
export function cuandoRelativo(f: string, hoy: string) {
  const d = diasEntre(hoy, f);
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  if (d === -1) return "ayer";
  return diaCorto(f);
}

/** "hoy", "ayer", "hace 3 días" */
export function haceDias(f: string, hoy: string) {
  const d = diasEntre(f, hoy);
  if (d <= 0) return "hoy";
  if (d === 1) return "ayer";
  return `hace ${d} días`;
}

export const MOMENTO: Record<Momento, string> = { comida: "Comida", cena: "Cena" };

/** A qué toma pertenece una hora: hasta la mitad entre comida y cena es comida; luego, cena. */
export function momentoDe(hhmm: string, horaComida: string, horaCena: string): Momento {
  const corte = (minutos(horaComida) + minutos(horaCena)) / 2;
  return minutos(hhmm) < corte ? "comida" : "cena";
}
