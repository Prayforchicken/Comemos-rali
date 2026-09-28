/* ============================================================
   Guardado local. Todo vive en el propio móvil (localStorage).
   - `plan`: el mismo formato que Comemos (AppState), para poder importar/exportar.
   - `juego`: huellitas, mascotas, chuches y logros.
   - `decisiones`: qué se decidió en cada comida (lo que hay, otra cosa, algo diferente, sobras).
   - `alimentos`: alimentos usados o creados (de wger, de la base local o propios), por id.
   - `extras`: picoteos fuera de las 4 comidas, por fecha (alimentos + gramos).
   - `diario`: diario personal (cómo se siente y qué ha pasado), por fecha.
   - `recetas`: recetas propias con sus ingredientes. Cada una tiene también su copia en plan.mealTemplates.
   - `menus`: el menú de comidas (qué receta y acompañamiento toca en cada toma), con la fecha desde la que vale.
   - `cheats`: grupos de cheat meal sin pesar (Pizza, Hamburguesa del burger…).
   - `semillas`: versión de las recetas de ejemplo ya añadidas (para no repetirlas si se borran).
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from "react";
import { freshDefaultState } from "../comemos/default-data";
import type { AppState } from "../comemos/models";
import { juegoInicial } from "../juego/motor";
import type { Juego } from "../juego/tipos";
import type { Decisiones } from "../decisiones/decisiones";
import type { Alimento, Item, RecetaPropia } from "../alimentos/tipos";
import type { Diario } from "../diario/tipos";
import { aPlantilla } from "../alimentos/nutricion";
import { CHEATS_INICIALES, RECETAS_EJEMPLO, type GrupoCheat, type Menu } from "../menu/menu";

export interface Datos {
  plan: AppState;
  juego: Juego;
  decisiones: Decisiones;
  alimentos: Record<string, Alimento>;
  recetas: Record<string, RecetaPropia>;
  extras: Record<string, Item[]>;
  diario: Diario;
  menus: Menu[];
  cheats: GrupoCheat[];
  semillas: number;
}

const CLAVE = "comemos-rali-v1";

export function datosIniciales(): Datos {
  const plan = freshDefaultState();
  plan.settings.selectedPerson = "rali";
  return sembrar({ plan, juego: juegoInicial(), decisiones: {}, alimentos: {}, recetas: {}, extras: {}, diario: {}, menus: [], cheats: CHEATS_INICIALES, semillas: 0 });
}

const obj = <T,>(v: unknown, def: T): T => (v && typeof v === "object" ? (v as T) : def);

/** Rellena lo que falte (copias y datos de versiones anteriores) con los valores de inicio. */
function completar(d: Partial<Datos>, base: Datos): Datos {
  return sembrar({
    plan: d.plan?.version === 1 ? { ...base.plan, ...d.plan } : base.plan,
    juego: d.juego?.version === 1 ? { ...base.juego, ...d.juego, avisos: { ...base.juego.avisos, ...d.juego.avisos } } : base.juego,
    decisiones: obj(d.decisiones, {}),
    alimentos: obj(d.alimentos, {}),
    recetas: obj(d.recetas, {}),
    extras: obj(d.extras, {}),
    diario: obj(d.diario, {}),
    menus: Array.isArray(d.menus) ? d.menus : [],
    cheats: Array.isArray(d.cheats) ? d.cheats : CHEATS_INICIALES,
    semillas: typeof d.semillas === "number" ? d.semillas : 0,
  });
}

/** Añade una sola vez las recetas de ejemplo (hamburguesa casera, café con galletas). Si se borran, no vuelven. */
function sembrar(d: Datos): Datos {
  if (d.semillas >= 1) return d;
  const nuevas = RECETAS_EJEMPLO.filter((r) => !d.recetas[r.id]);
  const recetas = { ...d.recetas };
  for (const r of nuevas) recetas[r.id] = r;
  const plantillas = [...d.plan.mealTemplates.filter((t) => !nuevas.some((r) => r.id === t.id)), ...nuevas.map(aPlantilla)];
  return { ...d, recetas, plan: { ...d.plan, mealTemplates: plantillas }, semillas: 1 };
}

function cargar(): Datos {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return datosIniciales();
    return completar(JSON.parse(raw) as Partial<Datos>, datosIniciales());
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
  if (v?.app === "comemos-rali" && v.plan?.version === 1 && v.juego?.version === 1) {
    // Copias de versiones anteriores: lo que falte se rellena con los valores de inicio.
    return completar(v, datosIniciales());
  }
  if (v?.version === 1 && v.profiles?.rali) return { ...actual, plan: { ...v, settings: { ...v.settings, selectedPerson: "rali" } } };
  throw new Error("Este JSON no es de Comemos ni de esta app.");
}
