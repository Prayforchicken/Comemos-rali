/* ============================================================
   Guardado local: todo vive en el propio móvil (localStorage), en una sola clave.
   Para pasarlo a otro móvil: Ajustes → copia de seguridad.
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Ajustes, Datos } from "../nucleo/tipos";

const CLAVE = "comemos-adrian-v1";

export const AJUSTES_INICIALES: Ajustes = {
  // Objetivo orientativo para Adrián (se cambia en Ajustes).
  objetivo: { kcal: 2700, proteina: 150, carbos: 320, grasa: 90, fibra: 40 },
  raciones: 4,
  tamano: 100,
  horaComida: "14:40",
  horaCena: "20:15",
  horaCocinar: "19:00",
  avisos: true,
};

export function datosIniciales(): Datos {
  return {
    version: 1, lotes: [], recetasPropias: {}, apartadas: [], propuesta: null,
    nevera: { fecha: "", tengo: [] }, extras: {}, alimentos: {},
    ajustes: structuredClone(AJUSTES_INICIALES),
  };
}

/** Completa con valores de inicio lo que falte (copias antiguas o a medias). */
export function normalizar(v: Partial<Datos>): Datos {
  const base = datosIniciales();
  const obj = (x: unknown) => (x && typeof x === "object" && !Array.isArray(x) ? x : null);
  return {
    version: 1,
    lotes: Array.isArray(v.lotes) ? v.lotes : [],
    recetasPropias: (obj(v.recetasPropias) as Datos["recetasPropias"]) ?? {},
    apartadas: Array.isArray(v.apartadas) ? v.apartadas : [],
    propuesta: typeof v.propuesta === "string" ? v.propuesta : null,
    nevera: v.nevera && Array.isArray(v.nevera.tengo) ? v.nevera : base.nevera,
    extras: (obj(v.extras) as Datos["extras"]) ?? {},
    alimentos: (obj(v.alimentos) as Datos["alimentos"]) ?? {},
    ajustes: { ...base.ajustes, ...(obj(v.ajustes) ?? {}), objetivo: { ...base.ajustes.objetivo, ...(obj(v.ajustes?.objetivo) ?? {}) } },
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
