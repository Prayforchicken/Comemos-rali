/* ============================================================
   Guardado local. Todo vive en el propio móvil (localStorage).
   - `plan`: el mismo formato que Comemos (AppState), para poder importar/exportar.
   - `juego`: huellitas, mascotas, chuches y logros.
   - `decisiones`: qué se decidió en cada comida (lo que hay, otra cosa, algo diferente, sobras).
   - `alimentos`: alimentos usados o creados (de wger, de la base local o propios), por id.
   - `extras`: picoteos fuera de las 4 comidas, por fecha (alimentos + gramos).
   - `recetas`: recetas propias con sus ingredientes. Cada una tiene también su copia en plan.mealTemplates.
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from "react";
import { freshDefaultState } from "../comemos/default-data";
import type { AppState } from "../comemos/models";
import { juegoInicial } from "../juego/motor";
import type { Juego } from "../juego/tipos";
import type { Decisiones } from "../decisiones/decisiones";
import type { Alimento, Item, RecetaPropia } from "../alimentos/tipos";

export interface Datos {
  plan: AppState;
  juego: Juego;
  decisiones: Decisiones;
  alimentos: Record<string, Alimento>;
  recetas: Record<string, RecetaPropia>;
  extras: Record<string, Item[]>;
}

const CLAVE = "comemos-rali-v1";

export function datosIniciales(): Datos {
  const plan = freshDefaultState();
  plan.settings.selectedPerson = "rali";
  return { plan, juego: juegoInicial(), decisiones: {}, alimentos: {}, recetas: {}, extras: {} };
}

function cargar(): Datos {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return datosIniciales();
    const d = JSON.parse(raw) as Partial<Datos>;
    const base = datosIniciales();
    return {
      plan: d.plan?.version === 1 ? { ...base.plan, ...d.plan } : base.plan,
      juego: d.juego?.version === 1 ? { ...base.juego, ...d.juego, avisos: { ...base.juego.avisos, ...d.juego.avisos } } : base.juego,
      decisiones: d.decisiones && typeof d.decisiones === "object" ? d.decisiones : {},
      alimentos: d.alimentos && typeof d.alimentos === "object" ? d.alimentos : {},
      recetas: d.recetas && typeof d.recetas === "object" ? d.recetas : {},
      extras: d.extras && typeof d.extras === "object" ? d.extras : {},
    };
  } catch {
    return datosIniciales();
  }
}

export type Cambio = (d: Datos) => Datos;

/** Hook único de estado de la app: `datos` y `cambiar(fn)`, que guarda solo. */
export function useDatos() {
  const [datos, setDatos] = useState<Datos>(cargar);
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch { /* sin espacio: seguimos en memoria */ }
  }, [datos]);
  const cambiar = useCallback((fn: Cambio) => setDatos((d) => fn(d)), []);
  return { datos, cambiar };
}

/* ---------------- copia JSON ---------------- */

export function exportar(d: Datos) {
  return JSON.stringify({ app: "comemos-rali", version: 1, exportado: new Date().toISOString(), ...d }, null, 2);
}

/** Acepta una copia de esta app o un JSON completo de Comemos (solo reemplaza el plan). */
export function importar(texto: string, actual: Datos): Datos {
  const v = JSON.parse(texto);
  if (v?.app === "comemos-rali" && v.plan?.version === 1 && v.juego?.version === 1) return { plan: v.plan, juego: v.juego, decisiones: v.decisiones ?? {}, alimentos: v.alimentos ?? {}, recetas: v.recetas ?? {}, extras: v.extras ?? {} };
  if (v?.version === 1 && v.profiles?.rali) return { ...actual, plan: { ...v, settings: { ...v.settings, selectedPerson: "rali" } } };
  throw new Error("Este JSON no es de Comemos ni de esta app.");
}
