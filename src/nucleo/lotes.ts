/* ============================================================
   La nevera: tápers con su peso y lo que sale de cada uno, en gramos.
   Funciones puras: reciben Datos y devuelven Datos nuevos (o un cálculo).
   ============================================================ */
import { por, totales } from "../alimentos/nutricion";
import type { Item, Por100, Totales } from "../alimentos/tipos";
import { diasEntre, fechaDe, horaDe, minutos, momentoDe, sumarDias } from "./fechas";
import { conCambios, escalar, pesoEstimado, racionDe } from "./receta";
import type { Datos, Destino, Lote, Momento, Receta, Salida, Tipo } from "./tipos";

export interface Toma { fecha: string; momento: Momento }

export const nuevoId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Por debajo de esto un táper se da por vacío (restos de pesar). */
const VACIO_G = 5;

export const salido = (l: Lote) => l.salidas.reduce((s, x) => s + x.gramos, 0);
export const quedan = (l: Lote) => Math.max(0, Math.round(l.gramos - salido(l)));

/** Macros por 100 g de lo cocinado. */
export function por100(l: Lote): Por100 {
  const t = por(l.total, 100 / Math.max(1, l.gramos));
  return { kcal: t.kcal, proteina: t.proteina, carbos: t.carbos, grasa: t.grasa, fibra: t.fibra };
}

/** Kcal y macros de `g` gramos de un táper. */
export const macrosDe = (l: Lote, g: number): Totales => ({ ...por(l.total, g / Math.max(1, l.gramos)), gramos: g });

/** Tápers con comida, primero lo que caduca antes: es lo que hay que comerse ya. */
export function enNevera(d: Datos): Lote[] {
  return d.lotes
    .filter((l) => quedan(l) >= VACIO_G)
    .sort((a, b) => a.caduca.localeCompare(b.caduca) || a.hecho.localeCompare(b.hecho) || a.creado.localeCompare(b.creado));
}

export interface Grupo { batchId: string; lotes: Lote[]; nombre: string; hecho: string; caduca: string }

/** Tápers agrupados por cocinado (el curry con su arroz), primero el que caduca antes. */
/** Con `hoy`, deja fuera lo caducado (no se planea comerlo). */
export function grupos(d: Datos, hoy?: string): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const l of enNevera(d).filter((x) => !hoy || x.caduca >= hoy)) {
    const g = mapa.get(l.batchId) ?? { batchId: l.batchId, lotes: [], nombre: "", hecho: l.hecho, caduca: l.caduca };
    if (l.caduca < g.caduca) g.caduca = l.caduca;
    g.lotes.push(l);
    mapa.set(l.batchId, g);
  }
  for (const g of mapa.values()) g.nombre = g.lotes.map((l) => l.nombre).join(" + ");
  return [...mapa.values()];
}

/* ---------------- caducidad ---------------- */

export type Estado = "bien" | "ya" | "tirar";

/**
 * Cuenta atrás hasta la caducidad. `quedan` son días: 0 = caduca hoy, negativo = ya caducó.
 * bien: 2 días o más. ya: caduca hoy o mañana (cómetelo ya). tirar: caducado.
 * `vida` es la parte de vida que le queda (1 = recién hecho, 0 = caducado), para la barra.
 */
export function frescura(l: { hecho: string; caduca: string }, hoy: string): { quedan: number; estado: Estado; vida: number } {
  const quedan = diasEntre(hoy, l.caduca);
  const total = Math.max(1, diasEntre(l.hecho, l.caduca) + 1);
  return { quedan, estado: quedan < 0 ? "tirar" : quedan <= 1 ? "ya" : "bien", vida: Math.max(0, Math.min(1, (quedan + 1) / total)) };
}

/** Mueve la fecha de caducidad de un táper (por ejemplo, si lo congelaste o sabes que aguanta menos). */
export function moverCaducidad(d: Datos, loteId: string, dias: number): Datos {
  return { ...d, lotes: d.lotes.map((l) => (l.id === loteId ? { ...l, caduca: sumarDias(l.caduca, dias) } : l)) };
}

/* ---------------- tomas previstas ---------------- */

export const siguiente = (t: Toma): Toma => (t.momento === "comida" ? { fecha: t.fecha, momento: "cena" } : { fecha: sumarDias(t.fecha, 1), momento: "comida" });

/** Toma de lo que sale ahora (comida o cena, según la hora). */
export function momentoAhora(d: Datos, ahora: Date): Momento {
  return momentoDe(horaDe(ahora), d.ajustes.horaComida, d.ajustes.horaCena);
}

/** La próxima toma que aún no se ha comido. Muy tarde, la comida de mañana. */
export function primeraTomaLibre(d: Datos, ahora: Date): Toma {
  const hoy = fechaDe(ahora);
  if (minutos(horaDe(ahora)) > minutos(d.ajustes.horaCena) + 120) return { fecha: sumarDias(hoy, 1), momento: "comida" };
  let t: Toma = { fecha: hoy, momento: momentoAhora(d, ahora) };
  // Una toma está hecha si se sacó comida de un táper o se apuntó otra cosa en ella.
  const comida = (x: Toma) =>
    d.lotes.some((l) => l.salidas.some((s) => s.destino === "comida" && s.fecha === x.fecha && s.momento === x.momento)) ||
    (d.extras[x.fecha] ?? []).some((e) => e.momento === x.momento);
  while (comida(t)) t = siguiente(t);
  return t;
}

/** Kcal que tocan en una toma según el reparto de Ajustes. */
export const kcalToma = (d: Datos, m: Momento) => d.ajustes.objetivo.kcal * d.ajustes.reparto[m];

/**
 * Tamaño de ración (en %) para que una ración de la receta sea lo que toca en una toma.
 * Así "4 raciones" son de verdad 4 comidas o cenas.
 */
export function tamanoDe(d: Datos, r: Receta): number {
  const media = (kcalToma(d, "comida") + kcalToma(d, "cena")) / 2;
  const base = racionDe(r, 100).kcal;
  return base > 0 ? Math.min(160, Math.max(60, Math.round((media / base) * 100))) : 100;
}

/** Cuántas comidas o cenas dan unas kcal, comiendo lo que toca en cada toma. */
export function comidasDeKcal(d: Datos, kcal: number): number {
  const media = (kcalToma(d, "comida") + kcalToma(d, "cena")) / 2;
  const n = kcal / Math.max(1, media);
  return n < 0.3 ? 0 : Math.max(1, Math.round(n));
}

/** Cuántas comidas o cenas da lo que queda de un cocinado. */
export const comidasQueDa = (d: Datos, g: Grupo) => comidasDeKcal(d, g.lotes.reduce((s, l) => s + macrosDe(l, quedan(l)).kcal, 0));

/** Reparte lo que hay en la nevera en las próximas tomas (lo más antiguo primero). */
export function proyectar(d: Datos, ahora: Date): { batchId: string; nombre: string; toma: Toma }[] {
  const plan: { batchId: string; nombre: string; toma: Toma }[] = [];
  let t = primeraTomaLibre(d, ahora);
  for (const g of grupos(d, fechaDe(ahora))) {
    for (let i = 0; i < comidasQueDa(d, g); i++) { plan.push({ batchId: g.batchId, nombre: g.nombre, toma: t }); t = siguiente(t); }
  }
  return plan;
}

/** Tomas que cubriría un batch nuevo de `kcal` en total, justo después de lo que ya hay en la nevera. */
export function tomasDeNuevoBatch(d: Datos, kcal: number, ahora: Date): Toma[] {
  const plan = proyectar(d, ahora);
  let t = plan.length ? siguiente(plan[plan.length - 1].toma) : primeraTomaLibre(d, ahora);
  const tomas: Toma[] = [];
  for (let i = 0; i < comidasDeKcal(d, kcal); i++) { tomas.push(t); t = siguiente(t); }
  return tomas;
}

/* ---------------- cambios ---------------- */

/**
 * "Lo hago": cada parte de la receta pasa a la nevera en su táper, con un peso estimado.
 * La receta es la plantilla; si hoy cambiaste cantidades (`d.variacion`), el táper lleva las de hoy.
 */
export function cocinar(d: Datos, r: Receta, raciones: number, ahora: Date): Datos {
  const f = raciones * (tamanoDe(d, r) / 100);
  const factor = d.variacion?.recetaId === r.id ? d.variacion.factor : {};
  const batchId = nuevoId("batch");
  const nuevos: Lote[] = r.componentes.filter((c) => conCambios(c.ingredientes, factor).length).map((c) => {
    const ingredientes = escalar(conCambios(c.ingredientes, factor), f);
    return {
      id: nuevoId("lote"), batchId, recetaId: r.id, nombre: r.componentes.length === 1 ? r.nombre : c.nombre, tipo: c.tipo,
      total: totales(ingredientes), gramos: Math.max(1, pesoEstimado(ingredientes)), pesado: false, raciones,
      hecho: fechaDe(ahora), caduca: sumarDias(fechaDe(ahora), c.dura ?? r.dura), creado: ahora.toISOString(), ingredientes, guardar: r.guardar, salidas: [],
    };
  });
  return { ...d, lotes: [...d.lotes, ...nuevos], propuesta: null, variacion: null };
}

/**
 * Lo que de verdad lleva un táper ya hecho (si al cocinar cambiaste algo y no lo apuntaste antes).
 * Cambian sus kcal y macros, también las de lo que ya comiste de él. Si no está pesado, su peso estimado.
 */
export function cambiarIngredientes(d: Datos, loteId: string, items: Item[]): Datos {
  return {
    ...d,
    lotes: d.lotes.map((l) => {
      if (l.id !== loteId) return l;
      const ingredientes = items.filter((i) => i.gramos > 0);
      const gramos = l.pesado ? l.gramos : Math.max(salido(l) + 1, pesoEstimado(ingredientes));
      return { ...l, ingredientes, total: totales(ingredientes), gramos };
    }),
  };
}

/** Sobras o algo hecho fuera de la app: nombre, tipo, peso y macros por 100 g. */
export function anadirAMano(d: Datos, x: { nombre: string; tipo: Tipo; gramos: number; hecho: string; caduca: string; n: Por100 }, ahora: Date): Datos {
  const lote: Lote = {
    id: nuevoId("lote"), batchId: nuevoId("batch"), recetaId: null, nombre: x.nombre, tipo: x.tipo,
    total: totales([{ alimentoId: "mano", nombre: x.nombre, gramos: x.gramos, n: x.n }]), gramos: x.gramos, pesado: true, raciones: 0,
    hecho: x.hecho, caduca: x.caduca, creado: ahora.toISOString(), ingredientes: [], guardar: "", salidas: [],
  };
  return { ...d, lotes: [...d.lotes, lote] };
}

/** Saca gramos de un táper: comida (suma al día), para Rali o a la basura. */
export function sacar(d: Datos, loteId: string, destino: Destino, gramos: number, ahora: Date, momento?: Momento): { datos: Datos; salida: Salida | null } {
  const g = Math.round(gramos);
  if (!(g > 0) || !d.lotes.some((l) => l.id === loteId)) return { datos: d, salida: null };
  const salida: Salida = { id: nuevoId("salida"), destino, gramos: g, cuando: ahora.toISOString(), fecha: fechaDe(ahora), momento: momento ?? momentoAhora(d, ahora) };
  return { datos: { ...d, lotes: d.lotes.map((l) => (l.id === loteId ? { ...l, salidas: [...l.salidas, salida] } : l)) }, salida };
}

export function deshacer(d: Datos, loteId: string, salidaId: string): Datos {
  return { ...d, lotes: d.lotes.map((l) => (l.id === loteId ? { ...l, salidas: l.salidas.filter((s) => s.id !== salidaId) } : l)) };
}

/** Pesa lo que queda en el táper: corrige el peso total (y con él, los macros por 100 g). */
export function pesarQueda(d: Datos, loteId: string, quedaAhora: number): Datos {
  return {
    ...d,
    lotes: d.lotes.map((l) => (l.id === loteId ? { ...l, gramos: Math.max(1, Math.round(salido(l) + Math.max(0, quedaAhora))), pesado: true } : l)),
  };
}

export const borrarLote = (d: Datos, loteId: string): Datos => ({ ...d, lotes: d.lotes.filter((l) => l.id !== loteId) });
