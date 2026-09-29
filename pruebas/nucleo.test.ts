/* Pruebas de la lógica (sin pantalla). Ejecutar: npm test */
import assert from "node:assert/strict";
import { test } from "node:test";
import { datosIniciales } from "../src/datos/almacen";
import { resumen } from "../src/nucleo/cuentas";
import { anadirExtra, totalDelDia } from "../src/nucleo/dia";
import { cocinar, enNevera, frescura, primeraTomaLibre, proyectar, quedan, sacar, tomasDeNuevoBatch } from "../src/nucleo/lotes";
import { candidatas, enUnidades, lista, otraIdea, propuestaActual } from "../src/nucleo/propuesta";
import { RECETAS } from "../src/recetas/recetas";
import { alimentoBase } from "../src/alimentos/base";

const hora = (iso: string) => new Date(`${iso}+02:00`); // hora de Madrid en verano
const curry = RECETAS.find((r) => r.id === "curry-garbanzos")!;

test("la lista multiplica por raciones y da unidades de cocina", () => {
  const l = lista(curry, 4, 100);
  const garbanzos = l.find((x) => x.alimentoId === "base-garbanzos-cocidos")!;
  assert.equal(garbanzos.gramos, 720);
  assert.equal(garbanzos.aprox, "≈ 3 botes de 400 g");
  assert.equal(l.find((x) => x.alimentoId === "base-ajo")!.aprox, "4 dientes");
  assert.equal(enUnidades(110 * 4, alimentoBase("huevo").unidad), "8 huevos");
});

test("un batch hecho por la tarde empieza en la cena de hoy", () => {
  let d = cocinar(datosIniciales(), curry, 4, hora("2026-09-29T19:30:00"));
  const tomas = proyectar(d, hora("2026-09-29T19:45:00")).map((p) => `${p.toma.fecha} ${p.toma.momento}`);
  assert.deepEqual(tomas, ["2026-09-29 cena", "2026-09-30 comida", "2026-09-30 cena", "2026-10-01 comida"]);
  // Se come la cena: lo siguiente es la comida de mañana.
  d = sacar(d, d.lotes[0].id, "comida", hora("2026-09-29T20:30:00")).datos;
  assert.deepEqual(primeraTomaLibre(d, hora("2026-09-29T21:00:00")), { fecha: "2026-09-30", momento: "comida" });
  assert.equal(quedan(d.lotes[0]), 3);
});

test("muy tarde, lo siguiente es la comida de mañana", () => {
  assert.deepEqual(primeraTomaLibre(datosIniciales(), hora("2026-09-29T23:30:00")), { fecha: "2026-09-30", momento: "comida" });
});

test("solo cuenta calorías lo que te comes", () => {
  let d = cocinar(datosIniciales(), curry, 4, hora("2026-09-29T13:00:00"));
  const id = d.lotes[0].id;
  d = sacar(d, id, "comida", hora("2026-09-29T14:40:00")).datos;
  d = sacar(d, id, "rali", hora("2026-09-29T14:45:00")).datos;
  d = sacar(d, id, "basura", hora("2026-09-29T21:00:00")).datos;
  d = anadirExtra(d, { alimentoId: "base-plenny-pro", nombre: "Plenny", gramos: 99, n: alimentoBase("plenny-pro").n }, hora("2026-09-29T08:15:00"));
  const t = totalDelDia(d, "2026-09-29");
  assert.equal(t.kcal, d.lotes[0].porRacion.kcal + 400);
  const r = resumen(d, null);
  assert.deepEqual([r.comida, r.rali, r.basura, r.pctBasura], [1, 1, 1, 33]);
  assert.equal(enNevera(d).length, 1);
});

test("no propone lo que ya está en la nevera y 'otra idea' avanza", () => {
  const d0 = datosIniciales();
  assert.equal(propuestaActual(d0)?.id, RECETAS[0].id);
  const d = cocinar(d0, RECETAS[0], 4, hora("2026-09-29T19:00:00"));
  assert.ok(!candidatas(d).some((r) => r.id === RECETAS[0].id));
  const siguiente = otraIdea(d);
  assert.notEqual(propuestaActual(siguiente)?.id, propuestaActual(d)?.id);
});

test("un batch nuevo va detrás de lo que queda", () => {
  const d = cocinar(datosIniciales(), curry, 2, hora("2026-09-29T13:00:00"));
  const tomas = tomasDeNuevoBatch(d, 2, hora("2026-09-29T13:30:00"));
  assert.deepEqual(tomas, [{ fecha: "2026-09-30", momento: "comida" }, { fecha: "2026-09-30", momento: "cena" }]);
});

test("frescura: 3 días avisa, 5 días a la basura", () => {
  const d = cocinar(datosIniciales(), curry, 4, hora("2026-09-29T19:00:00"));
  assert.equal(frescura(d.lotes[0], "2026-10-01").estado, "bien");
  assert.equal(frescura(d.lotes[0], "2026-10-02").estado, "ya");
  assert.equal(frescura(d.lotes[0], "2026-10-04").estado, "tirar");
});
