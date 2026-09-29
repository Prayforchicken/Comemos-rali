/* ============================================================
   Búsqueda en la base de datos abierta de wger (wger.de).
   - Solo lectura, sin cuenta ni clave.
   - Funciona en la APK y en la web publicada. Dentro de un artifact de claude.ai
     el navegador no deja salir a internet: entonces la app usa la base local
     y los alimentos ya guardados.
   Valores de wger: energía en kcal y macros en gramos, por 100 g.
   ============================================================ */
import type { Alimento } from "./tipos";

const API = "https://wger.de/api/v2";
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

interface IngredienteWger { id: number; name: string; energy: number | string; protein: string; carbohydrates: string; fat: string; fiber: string | null }

const aAlimento = (x: IngredienteWger): Alimento => ({
  id: `wger-${x.id}`, nombre: x.name.trim(), fuente: "wger",
  n: { kcal: Math.round(num(x.energy)), proteina: num(x.protein), carbos: num(x.carbohydrates), grasa: num(x.fat), fibra: num(x.fiber) },
});

async function json(url: string, signal?: AbortSignal) {
  const r = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`wger ${r.status}`);
  return r.json();
}

/** Busca por nombre (primero en español, luego en inglés). Lanza error si no hay conexión. */
export async function buscarWger(texto: string, signal?: AbortSignal): Promise<Alimento[]> {
  const q = encodeURIComponent(texto.trim());
  // 1) Lista filtrada con los valores ya incluidos (versiones recientes de wger).
  try {
    const d = await json(`${API}/ingredientinfo/?name__search=${q}&language__code=es,en&limit=20`, signal);
    if (Array.isArray(d?.results)) return d.results.map(aAlimento).filter((a: Alimento) => a.nombre && a.n.kcal > 0);
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
  }
  // 2) Buscador clásico (autocompletado) + detalle de los primeros resultados.
  const s = await json(`${API}/ingredient/search/?term=${q}&language=es,en`, signal);
  const ids: number[] = (s?.suggestions ?? []).slice(0, 12).map((x: { data: { id: number } }) => x.data.id);
  const detalles = await Promise.all(ids.map((id) => json(`${API}/ingredient/${id}/`, signal).catch(() => null)));
  return detalles.filter(Boolean).map(aAlimento).filter((a) => a.nombre && a.n.kcal > 0);
}
