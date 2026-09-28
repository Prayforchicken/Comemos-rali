/* Hoja para decidir una comida concreta: otra cosa (pizza…), otra receta o sobras. */
import { useState } from "react";
import { plannedMeal, shiftIsoDate, slotLabel } from "../comemos/engine";
import type { AppState, MealTemplate } from "../comemos/models";
import { IDEAS_OTRA, recetasPara, type ComidaDecidida, type Decision, type TipoDecision } from "../decisiones/decisiones";
import { Boton, Campo, Hoja, Pildora } from "./base";

type Eleccion = { comida: ComidaDecidida; tipo: Exclude<TipoDecision, "plan"> };

const TITULO: Record<Eleccion["tipo"], string> = { otra: "¿Qué te apetece?", diferente: "¿Qué otra receta?", sobras: "¿Qué sobras hay?" };

export function ElegirDecision({ eleccion, plan, fecha, cerrar, alElegir }: { eleccion: Eleccion | null; plan: AppState; fecha: string; cerrar: () => void; alElegir: (d: Decision) => void }) {
  return (
    <Hoja abierta={Boolean(eleccion)} cerrar={cerrar} titulo={eleccion ? `${slotLabel(eleccion.comida.slot)} · ${TITULO[eleccion.tipo]}` : ""}>
      {eleccion ? <Contenido key={`${eleccion.comida.slot}-${eleccion.tipo}`} e={eleccion} plan={plan} fecha={fecha} alElegir={alElegir} /> : null}
    </Hoja>
  );
}

function Contenido({ e, plan, fecha, alElegir }: { e: Eleccion; plan: AppState; fecha: string; alElegir: (d: Decision) => void }) {
  const actual = e.comida.decision;
  const [texto, setTexto] = useState(actual.tipo === e.tipo ? actual.texto ?? "" : "");

  if (e.tipo === "otra") {
    return (
      <>
        <p className="cuerpo">Pizza, comer fuera, un capricho… Se disfruta sin pesar y la siguiente comida vuelve al plan, sin compensar nada.</p>
        <div className="opciones">
          {IDEAS_OTRA.map((i) => <button key={i} type="button" className="opcion" data-activa={texto === i} onClick={() => setTexto(i)}>{i}</button>)}
        </div>
        <Campo etiqueta="O escríbelo"><input className="entrada" value={texto} maxLength={40} placeholder="Ej.: tacos con amigas" onChange={(x) => setTexto(x.target.value)} /></Campo>
        <div className="hoja__acciones"><Boton variante="melocoton" className="ancho" onClick={() => alElegir({ tipo: "otra", texto: texto.trim() || "Otra cosa" })}>Decidido</Boton></div>
      </>
    );
  }

  const recetas = recetasPara(plan, e.comida.slot).filter((t) => e.tipo === "sobras" || t.id !== e.comida.delPlan.id);
  // Para sobras, primero las recetas que tocaron en los últimos 4 días (lo más probable que quede en la nevera).
  const recientes = new Set<string>();
  if (e.tipo === "sobras") {
    const base = { ...plan, scenarios: {} };
    for (let i = 1; i <= 4; i++) for (const slot of ["lunch", "dinner"] as const) recientes.add(plannedMeal(base, "rali", shiftIsoDate(fecha, -i), slot).template.id);
  }
  const ordenadas = [...recetas].sort((a, b) => Number(recientes.has(b.id)) - Number(recientes.has(a.id)));

  const Fila = ({ t }: { t: MealTemplate }) => (
    <button type="button" className="receta-op" data-activa={actual.tipo === e.tipo && actual.recetaId === t.id} onClick={() => alElegir({ tipo: e.tipo, recetaId: t.id })}>
      <span><b>{t.shortName}</b><small className="nota">{t.name}</small></span>
      {recientes.has(t.id) ? <Pildora color="cielo">en la nevera</Pildora> : t.kind === "emergency" ? <Pildora color="mantequilla">rápida</Pildora> : null}
    </button>
  );

  return (
    <>
      <p className="cuerpo">{e.tipo === "sobras" ? "Elige de qué son y te calculo la ración para esta comida." : `En vez de ${e.comida.delPlan.shortName}. La ración se calcula para esta comida.`}</p>
      <div className="recetas-op">{ordenadas.map((t) => <Fila key={t.id} t={t} />)}</div>
      {e.tipo === "sobras" ? (
        <>
          <Campo etiqueta="¿Son de otra cosa? Escríbelo"><input className="entrada" value={texto} maxLength={40} placeholder="Ej.: la paella del domingo" onChange={(x) => setTexto(x.target.value)} /></Campo>
          <Boton variante="cielo" disabled={!texto.trim()} onClick={() => alElegir({ tipo: "sobras", texto: texto.trim() })}>Usar estas sobras</Boton>
        </>
      ) : null}
    </>
  );
}

