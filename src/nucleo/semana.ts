/* ============================================================
   Plan de la semana: qué se come en cada toma y cuándo toca cocinar.
   1. Lo que hay en la nevera se reparte en las próximas tomas (lotes.proyectar).
   2. Cuando se acaba, entra la receta propuesta; luego las siguientes por turno,
      cada una con las raciones de Ajustes (y las tomas que den sus kcal).
   3. Se cocina la tarde del día en que se come lo último que hay
      (si lo último es la comida, así hay cena; si es la cena, hay comida mañana).
   ============================================================ */
import { fechaDe, sumarDias } from "./fechas";
import { comidasDeKcal, grupos, primeraTomaLibre, proyectar, siguiente, tamanoDe, type Toma } from "./lotes";
import { racionDe } from "./receta";
import { candidatas, propuestaActual } from "./propuesta";
import type { Datos } from "./tipos";

/** `caducado`: esa toma cae después de la fecha de caducidad de lo que hay en la nevera. */
export interface Hueco { toma: Toma; nombre: string; deLaNevera: boolean; caducado?: boolean }
export interface Cocinado { fecha: string; recetaId: string; nombre: string }

export function planSemana(d: Datos, ahora: Date, dias = 7): { huecos: Hueco[]; cocinados: Cocinado[] } {
  const hoy = fechaDe(ahora);
  const fin = sumarDias(hoy, dias - 1);
  const caduca = new Map(grupos(d, hoy).map((g) => [g.batchId, g.caduca]));
  const huecos: Hueco[] = proyectar(d, ahora).map((p) => ({ toma: p.toma, nombre: p.nombre, deLaNevera: true, caducado: p.toma.fecha > (caduca.get(p.batchId) ?? p.toma.fecha) }));
  const cocinados: Cocinado[] = [];

  // Recetas en orden: la propuesta ahora y después el resto por turno.
  const actual = propuestaActual(d);
  const resto = candidatas(d).filter((r) => r.id !== actual?.id);
  const orden = actual ? [actual, ...resto] : resto;
  if (!orden.length) return { huecos, cocinados };

  let ultima: Toma | null = huecos.length ? huecos[huecos.length - 1].toma : null;
  let t = ultima ? siguiente(ultima) : primeraTomaLibre(d, ahora);
  let dia = ultima ? ultima.fecha : t.fecha;
  for (let i = 0; t.fecha <= fin && i < 50; i++) {
    const r = orden[i % orden.length];
    cocinados.push({ fecha: dia, recetaId: r.id, nombre: r.nombre });
    const tomas = Math.max(1, comidasDeKcal(d, racionDe(r, tamanoDe(d, r)).kcal * d.ajustes.raciones));
    for (let k = 0; k < tomas && t.fecha <= fin; k++) {
      huecos.push({ toma: t, nombre: r.nombre, deLaNevera: false });
      ultima = t;
      t = siguiente(t);
    }
    dia = ultima!.fecha;
  }
  return { huecos, cocinados };
}
