/* ============================================================
   Guardado local: todo vive en el propio móvil (localStorage), en una sola clave.
   Para pasarlo a otro móvil: Ajustes → copia de seguridad.
   Versión 2: los tápers guardan gramos. Las copias de la versión 1 (raciones) se convierten al cargar.
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from "react";
import { por, vacio } from "../alimentos/nutricion";
import type { Totales } from "../alimentos/tipos";
import type { Ajustes, Datos, Lote, Receta } from "../nucleo/tipos";

const CLAVE = "comemos-adrian-v1";

export const AJUSTES_INICIALES: Ajustes = {
  // Objetivo orientativo para Adrián (se cambia en Ajustes).
  objetivo: { kcal: 2700, proteina: 150, carbos: 320, grasa: 90, fibra: 40 },
  reparto: { comida: 0.32, cena: 0.35 },
  raciones: 4,
  horaComida: "14:40",
  horaCena: "20:15",
  horaCocinar: "19:00",
  avisos: true,
};

export function datosIniciales(): Datos {
  return {
    version: 2, lotes: [], recetasPropias: {}, apartadas: [], propuesta: null,
    nevera: { fecha: "", tengo: [] }, extras: {}, alimentos: {},
    ajustes: structuredClone(AJUSTES_INICIALES),
  };
}

/* ---------------- de la versión 1 (raciones) a la 2 (gramos) ---------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Suelto = any;

function migrarLote(x: Suelto): Lote {
  const salidas = (x.salidas ?? []) as Suelto[];
  if (x.total && typeof x.gramos === "number") {
    return { batchId: x.id, tipo: "combinado", pesado: true, raciones: 0, ingredientes: [], guardar: "", ...x, salidas: salidas.map((s) => ({ gramos: 0, ...s })) };
  }
  const porRacion: Totales = { ...vacio, ...(x.porRacion ?? {}) };
  const raciones = Math.max(1, Number(x.raciones) || 1);
  const gRacion = porRacion.gramos || 450;
  return {
    id: x.id, batchId: x.id, recetaId: x.recetaId ?? null, nombre: x.nombre ?? "Táper", tipo: "combinado",
    total: { ...por(porRacion, raciones), gramos: gRacion * raciones }, gramos: gRacion * raciones, pesado: false, raciones,
    hecho: x.hecho, creado: x.creado ?? new Date().toISOString(), ingredientes: [], guardar: x.guardar ?? "",
    salidas: salidas.map((s) => ({ ...s, gramos: typeof s.gramos === "number" ? s.gramos : gRacion })),
  };
}

function migrarReceta(r: Suelto): Receta {
  if (Array.isArray(r.componentes)) return r as Receta;
  return { ...r, componentes: [{ id: "c1", nombre: r.nombre, tipo: "combinado", ingredientes: r.ingredientes ?? [] }] } as Receta;
}

/** Completa con valores de inicio lo que falte (copias antiguas o a medias). */
export function normalizar(v: Partial<Datos> & Suelto): Datos {
  const base = datosIniciales();
  const obj = (x: unknown) => (x && typeof x === "object" && !Array.isArray(x) ? x : null);
  const propias = (obj(v.recetasPropias) ?? {}) as Record<string, Suelto>;
  return {
    version: 2,
    lotes: Array.isArray(v.lotes) ? v.lotes.map(migrarLote) : [],
    recetasPropias: Object.fromEntries(Object.entries(propias).map(([k, r]) => [k, migrarReceta(r)])),
    apartadas: Array.isArray(v.apartadas) ? v.apartadas : [],
    propuesta: typeof v.propuesta === "string" ? v.propuesta : null,
    nevera: v.nevera && Array.isArray(v.nevera.tengo) ? v.nevera : base.nevera,
    extras: (obj(v.extras) as Datos["extras"]) ?? {},
    alimentos: (obj(v.alimentos) as Datos["alimentos"]) ?? {},
    ajustes: {
      ...base.ajustes, ...(obj(v.ajustes) ?? {}),
      objetivo: { ...base.ajustes.objetivo, ...(obj(v.ajustes?.objetivo) ?? {}) },
      reparto: { ...base.ajustes.reparto, ...(obj(v.ajustes?.reparto) ?? {}) },
    },
  };
}

function cargar(): Datos {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? normalizar(JSON.parse(raw)) : datosIniciales();
  } catch {
    return datosIniciales();
  }
}

export type Cambio = (d: Datos) => Datos;

/** Hook único de estado: `datos` y `cambiar(fn)`, que guarda solo. */
export function useDatos() {
  const [datos, setDatos] = useState<Datos>(cargar);
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch { /* sin espacio o sin permiso: seguimos en memoria */ }
  }, [datos]);
  const cambiar = useCallback((fn: Cambio) => setDatos((d) => fn(d)), []);
  return { datos, cambiar };
}

/* ---------------- copia JSON ---------------- */

export const exportar = (d: Datos) => JSON.stringify({ app: "comemos-adrian", exportado: new Date().toISOString(), ...d }, null, 2);

export function importar(texto: string): Datos {
  const v = JSON.parse(texto);
  if (v?.app !== "comemos-adrian") throw new Error("Este archivo no es una copia de Comemos · Adrián.");
  return normalizar(v);
}
