/* ============================================================
   Motor del juego: funciones puras (reciben un Juego y devuelven otro).
   La interfaz nunca modifica el Juego directamente: siempre pasa por aquí.
   ============================================================ */
import { CHUCHES } from "../sprites/chuches.js";
import {
  BAJADA_POR_HORA, BANO, EFECTO_CHUCHE, ESPECIES, EXTRA_FAVORITA, FACTOR_NOCHE, HORAS_REGALO, MIMO,
  SUELO_NECESIDAD, UMBRAL_BAJO, UMBRAL_CANSADO, UMBRAL_CUIDADO, UMBRAL_FELIZ, multiplicador, umbralLlegada,
} from "./reglas";
import { personalidadAlAzar } from "./frases";
import type { Accesorio, Animo, ChucheId, Especie, Juego, Logro, Mascota, Necesidad, Necesidades, Regalo, TipoLogro } from "./tipos";

export interface Sueno { dormir: string; despertar: string } // "03:30", "11:00"

/** Las que se cuidan (bajan con el tiempo y suben con chuches, baños y mimos). */
const CUIDADOS = ["hambre", "limpieza", "mimos"] as const;
const limitar = (v: number) => Math.max(SUELO_NECESIDAD, Math.min(100, v));
const nuevoId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const minutosDelDia = (d: Date) => d.getHours() * 60 + d.getMinutes();
const aMinutos = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

export function estaDurmiendo(momento: Date, sueno: Sueno) {
  const m = minutosDelDia(momento), a = aMinutos(sueno.dormir), b = aMinutos(sueno.despertar);
  return a <= b ? m >= a && m < b : m >= a || m < b;
}

export function juegoInicial(): Juego {
  return {
    version: 1,
    huellitas: 20, // un regalito de bienvenida para comprar las primeras chuches
    ganadasTotal: 0,
    mascotas: [],
    activaId: null,
    inventario: { caramelo: 1, pescadito: 1 },
    logros: [],
    desbloqueadas: ["gatito"],
    pendientes: [],
    llegadas: 0,
    regalos: [],
    avisos: { comidas: true, gimnasio: true, mascotas: true },
  };
}

/* ---------------- paso del tiempo ---------------- */

/** Recalcula las necesidades de todas las mascotas hasta `ahora`. Máximo 3 días de golpe.
    `energia` es la de Rali ahora mismo (energia.ts): los animalitos la reflejan tal cual. */
export function avanzarTiempo(juego: Juego, ahora: Date, sueno: Sueno, energia: number): Juego {
  const regalos: Regalo[] = [];
  const mascotas = juego.mascotas.map((m) => {
    const desde = new Date(m.actualizado);
    let minutos = Math.min(72 * 60, Math.floor((ahora.getTime() - desde.getTime()) / 60000));
    if (minutos < 5) return m.necesidades.energia === energia ? m : { ...m, necesidades: { ...m.necesidades, energia } };
    const n: Necesidades = { ...m.necesidades };
    let cuidado = m.cuidadoMin ?? 0;
    const cursor = new Date(desde);
    while (minutos > 0) {
      const paso = Math.min(30, minutos);
      const horas = paso / 60;
      const durmiendo = estaDurmiendo(cursor, sueno);
      for (const k of CUIDADOS) n[k] = limitar(n[k] - BAJADA_POR_HORA[k] * horas * (durmiendo ? FACTOR_NOCHE : 1));
      // Buen cuidado: tripita, baño y mimos bien cubiertos → suma tiempo para traer un regalo.
      // La energía no cuenta: un día cargado nunca quita regalos.
      if (CUIDADOS.every((k) => n[k] >= UMBRAL_CUIDADO)) cuidado += paso;
      if (cuidado >= HORAS_REGALO * 60) {
        cuidado -= HORAS_REGALO * 60;
        regalos.push({ id: nuevoId("regalo"), mascotaId: m.id, quien: m.nombre, especie: m.especie, traido: new Date(cursor).toISOString(), visto: false });
      }
      cursor.setMinutes(cursor.getMinutes() + paso);
      minutos -= paso;
    }
    n.energia = energia;
    return { ...m, necesidades: n, cuidadoMin: cuidado, actualizado: ahora.toISOString() };
  });
  return { ...juego, mascotas, regalos: regalos.length ? [...juego.regalos, ...regalos] : juego.regalos };
}

/** Cuánto le falta a un animalito para traer el siguiente regalo (0–1). */
export const progresoRegalo = (m: Mascota) => Math.min(1, (m.cuidadoMin ?? 0) / (HORAS_REGALO * 60));
export const cuidadoBien = (m: Mascota) => CUIDADOS.every((k) => m.necesidades[k] >= UMBRAL_CUIDADO);

/** El ánimo sale de la necesidad más baja. Nunca hay un estado irreversible.
    Si todo lo que se cuida está bien pero Rali va sin energía, el animalito también va "sin pilas". */
export function animoDe(m: Mascota, ahora: Date, sueno: Sueno): Animo {
  if (m.alegreHasta && new Date(m.alegreHasta) > ahora) return "feliz";
  if (estaDurmiendo(ahora, sueno)) return "dormido";
  const n = m.necesidades;
  const bajas = CUIDADOS.filter((k) => n[k] < UMBRAL_BAJO);
  if (bajas.length >= 2) return "enfadado";
  if (bajas[0] === "hambre") return "hambriento";
  if (bajas[0] === "limpieza") return "sucio";
  if (bajas[0] === "mimos") return "triste";
  if (n.energia < UMBRAL_CANSADO) return "cansado";
  return CUIDADOS.every((k) => n[k] >= UMBRAL_FELIZ) ? "feliz" : "contento";
}

export const TEXTO_ANIMO: Record<Animo, string> = {
  feliz: "¡Feliz!",
  contento: "A gustito",
  triste: "Quiere mimos",
  enfadado: "Un poco gruñón",
  hambriento: "Tiene hambre",
  sucio: "Pide un baño",
  dormido: "Durmiendo",
  cansado: "Sin pilas",
};

/* ---------------- huellitas ---------------- */

export function logroDe(juego: Juego, fecha: string, tipo: TipoLogro, slot?: Logro["slot"]) {
  return juego.logros.find((l) => l.fecha === fecha && l.tipo === tipo && (slot ? l.slot === slot : true));
}

export interface ResultadoGanar { juego: Juego; logro: Logro | null; nuevas: Especie[] }

/** Suma huellitas por un logro. Si ya estaba conseguido ese día, no hace nada. */
export function ganar(juego: Juego, fecha: string, tipo: TipoLogro, base: number, slot?: Logro["slot"]): ResultadoGanar {
  if (logroDe(juego, fecha, tipo, slot)) return { juego, logro: null, nuevas: [] };
  const mult = multiplicador(Math.max(1, juego.mascotas.length));
  const puntos = Math.round(base * mult);
  const logro: Logro = { id: nuevoId("logro"), fecha, creado: new Date().toISOString(), tipo, slot, base, multiplicador: mult, puntos };
  const ganadasTotal = juego.ganadasTotal + puntos;
  const llegadas = nuevasLlegadas(juego, ganadasTotal);
  // Las mascotas se alegran un ratito cada vez que Rali consigue algo.
  const alegreHasta = new Date(Date.now() + 20 * 60000).toISOString();
  return {
    juego: {
      ...juego,
      huellitas: juego.huellitas + puntos,
      ganadasTotal,
      logros: [logro, ...juego.logros].slice(0, 2000),
      pendientes: [...juego.pendientes, ...llegadas.especies],
      llegadas: llegadas.total,
      mascotas: juego.mascotas.map((m) => ({ ...m, alegreHasta, necesidades: { ...m.necesidades, mimos: limitar(m.necesidades.mimos + 10) } })),
    },
    logro,
    nuevas: llegadas.especies,
  };
}

/** Al azar, con preferencia por especies que aún no viven en casa ni esperan en la puerta. */
function especieAlAzar(yaEstan: Especie[]): Especie {
  const nuevas = ESPECIES.filter((e) => !yaEstan.includes(e));
  const bolsa = nuevas.length ? nuevas : ESPECIES;
  return bolsa[Math.floor(Math.random() * bolsa.length)];
}

function nuevasLlegadas(juego: Juego, ganadasTotal: number) {
  let total = juego.llegadas;
  const especies: Especie[] = [];
  const yaEstan = [...juego.mascotas.map((m) => m.especie), ...juego.pendientes];
  while (ganadasTotal >= umbralLlegada(total)) {
    const e = especieAlAzar([...yaEstan, ...especies]);
    especies.push(e);
    total++;
  }
  return { total, especies };
}

/** Deshace un logro marcado por error. No es un castigo: solo corrige un toque equivocado. */
export function deshacer(juego: Juego, logroId: string): Juego {
  const l = juego.logros.find((x) => x.id === logroId);
  if (!l) return juego;
  return {
    ...juego,
    huellitas: Math.max(0, juego.huellitas - l.puntos),
    ganadasTotal: Math.max(0, juego.ganadasTotal - l.puntos),
    logros: juego.logros.filter((x) => x.id !== logroId),
  };
}

/** Siguiente llegada sorpresa: cuántas huellitas faltan. */
export function siguienteLlegada(juego: Juego) {
  const meta = umbralLlegada(juego.llegadas);
  const desde = juego.llegadas ? umbralLlegada(juego.llegadas - 1) : 0;
  return { meta, desde, falta: Math.max(0, meta - juego.ganadasTotal) };
}

/** Animalitos que esperan en la puerta para ser adoptados. */
export const porAdoptar = (juego: Juego) => juego.pendientes;

/* ---------------- mascotas ---------------- */

export function adoptar(juego: Juego, especie: Especie, nombre: string, pelaje: string, accesorio: Accesorio): Juego {
  const ahora = new Date().toISOString();
  const m: Mascota = {
    id: nuevoId(especie), especie, nombre: nombre.trim() || "Sin nombre", pelaje, accesorio,
    necesidades: { hambre: 80, limpieza: 90, mimos: 70, energia: 90 },
    actualizado: ahora, adoptada: ahora, alegreHasta: new Date(Date.now() + 30 * 60000).toISOString(),
    personalidad: personalidadAlAzar(),
  };
  const i = juego.pendientes.indexOf(especie);
  const pendientes = i >= 0 ? [...juego.pendientes.slice(0, i), ...juego.pendientes.slice(i + 1)] : juego.pendientes;
  return { ...juego, mascotas: [...juego.mascotas, m], activaId: m.id, pendientes };
}

/** Deja pasar de largo a un animalito que esperaba (volverá a haber más llegadas). */
export function despedir(juego: Juego, especie: Especie): Juego {
  const i = juego.pendientes.indexOf(especie);
  return i < 0 ? juego : { ...juego, pendientes: [...juego.pendientes.slice(0, i), ...juego.pendientes.slice(i + 1)] };
}

/* ---------------- regalos para Rali ---------------- */

export const regalosSinVer = (juego: Juego) => juego.regalos.filter((r) => !r.visto);
export const regalosGuardados = (juego: Juego) => juego.regalos.filter((r) => !r.canjeado);
export const verRegalos = (juego: Juego): Juego => ({ ...juego, regalos: juego.regalos.map((r) => (r.visto ? r : { ...r, visto: true })) });
export const canjear = (juego: Juego, id: string): Juego =>
  ({ ...juego, regalos: juego.regalos.map((r) => (r.id === id && !r.canjeado ? { ...r, visto: true, canjeado: new Date().toISOString() } : r)) });

export function editarMascota(juego: Juego, id: string, cambios: Partial<Pick<Mascota, "nombre" | "pelaje" | "accesorio">>): Juego {
  return { ...juego, mascotas: juego.mascotas.map((m) => (m.id === id ? { ...m, ...cambios } : m)) };
}

const tocar = (juego: Juego, id: string, f: (m: Mascota) => Mascota): Juego =>
  ({ ...juego, mascotas: juego.mascotas.map((m) => (m.id === id ? f(m) : m)) });

export function comprar(juego: Juego, chuche: ChucheId, cantidad = 1): Juego | null {
  const coste = CHUCHES[chuche].precio * cantidad;
  if (juego.huellitas < coste) return null;
  return { ...juego, huellitas: juego.huellitas - coste, inventario: { ...juego.inventario, [chuche]: (juego.inventario[chuche] ?? 0) + cantidad } };
}

export function darChuche(juego: Juego, id: string, chuche: ChucheId): Juego | null {
  if (!(juego.inventario[chuche] ?? 0)) return null;
  const e = EFECTO_CHUCHE[chuche];
  const juego2 = { ...juego, inventario: { ...juego.inventario, [chuche]: (juego.inventario[chuche] ?? 0) - 1 } };
  return tocar(juego2, id, (m) => {
    const fav = CHUCHES[chuche].favorito === m.especie;
    return {
      ...m,
      alegreHasta: new Date(Date.now() + 10 * 60000).toISOString(),
      necesidades: {
        ...m.necesidades,
        hambre: limitar(m.necesidades.hambre + e.hambre + (fav ? EXTRA_FAVORITA.hambre : 0)),
        mimos: limitar(m.necesidades.mimos + e.mimos + (fav ? EXTRA_FAVORITA.mimos : 0)),
      },
    };
  });
}

export const banar = (juego: Juego, id: string) =>
  tocar(juego, id, (m) => ({ ...m, necesidades: { ...m.necesidades, limpieza: limitar(BANO) } }));

export const mimar = (juego: Juego, id: string) =>
  tocar(juego, id, (m) => ({ ...m, alegreHasta: new Date(Date.now() + 3 * 60000).toISOString(), necesidades: { ...m.necesidades, mimos: limitar(m.necesidades.mimos + MIMO) } }));

export const marcarEntregado = (juego: Juego, id: string, si: boolean): Juego =>
  ({ ...juego, regalos: juego.regalos.map((r) => (r.id === id ? { ...r, entregado: si ? new Date().toISOString() : undefined } : r)) });
