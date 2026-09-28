/* Diario: "Mi día" (emociones y lo que ha pasado) y el mini MyFitnessPal:
   lo comido frente al objetivo, extras y el aprendizaje de raciones.
   Las recetas y los alimentos guardados están en la pestaña Menú (Recetario.tsx). */
import { useMemo, useState } from "react";
import type { PantallaProps } from "../App";
import { totales } from "../alimentos/nutricion";
import type { Item } from "../alimentos/tipos";
import { energyForDay, shiftIsoDate, slotLabel, todayInTimezone } from "../comemos/engine";
import { Buscador, ListaItems } from "../componentes/Buscador";
import { Boton, Hoja, Pildora, Seccion, Titulo } from "../componentes/base";
import { usePegatina } from "../componentes/Pegatinas";
import { diaDecidido, TEXTO_DECISION } from "../decisiones/decisiones";
import { logroDe } from "../juego/motor";
import { fechaBonita } from "./Hoy";
import { Registro } from "./Registro";
import { MiDia } from "./MiDia";

type Vista = "midia" | "comida" | "aprendizaje";
const VISTAS: { v: Vista; t: string }[] = [{ v: "midia", t: "Mi día" }, { v: "comida", t: "Comida" }, { v: "aprendizaje", t: "Raciones" }];

export function Diario(props: PantallaProps) {
  const [vista, setVista] = useState<Vista>("midia");
  return (
    <div className="pila">
      <Titulo antes="Mi" marcado="diario" texto="Cómo estás y lo que comes. Las recetas viven ahora en Menú. Nada de aquí resta huellitas." />
      <div className="segmento segmento--ancho" role="tablist">
        {VISTAS.map((x) => <button key={x.v} type="button" role="tab" aria-selected={vista === x.v} data-activa={vista === x.v} onClick={() => setVista(x.v)}>{x.t}</button>)}
      </div>
      {vista === "midia" && <MiDia {...props} />}
      {vista === "comida" && <Dia {...props} />}
      {vista === "aprendizaje" && <Registro {...props} incrustado />}
    </div>
  );
}

/* ---------------- día: objetivo vs comido ---------------- */

function Dia({ datos, cambiar, fecha, setFecha }: PantallaProps) {
  const { plan, juego } = datos;
  const pegatina = usePegatina();
  const hoy = todayInTimezone(plan.settings.timezone);
  const [extra, setExtra] = useState(false);
  const comidas = useMemo(() => diaDecidido(datos, fecha), [datos, fecha]);
  const objetivo = energyForDay(plan, "rali", fecha);
  const perfil = plan.profiles.rali;
  const extras = datos.extras[fecha] ?? [];
  const tExtras = totales(extras);

  // Lo comido: comidas marcadas (por el % que se registró) + extras.
  const filas = comidas.map((c) => {
    const marcada = Boolean(logroDe(juego, fecha, "comida", c.slot));
    const registro = plan.feedback.find((f) => f.personId === "rali" && f.date === fecha && f.slot === c.slot);
    const pct = marcada ? (c.libre ? 100 : registro?.eatenPercent ?? 100) : 0;
    const k = pct / 100;
    return { c, marcada, pct, kcal: Math.round((c.kcal + c.addOnKcal) * k), proteina: c.proteinG * k, fibra: c.fibreG * k };
  });
  const comido = {
    kcal: filas.reduce((s, f) => s + f.kcal, 0) + tExtras.kcal,
    proteina: Math.round(filas.reduce((s, f) => s + f.proteina, 0) + tExtras.proteina),
    fibra: Math.round(filas.reduce((s, f) => s + f.fibra, 0) + tExtras.fibra),
  };
  const barras = [
    { t: "Energía", v: comido.kcal, m: objetivo.targetKcal, u: "kcal", c: "rosa" },
    { t: "Proteína", v: comido.proteina, m: perfil.proteinTargetG, u: "g", c: "menta" },
    { t: "Fibra", v: comido.fibra, m: perfil.fibreTargetG, u: "g", c: "mantequilla" },
  ];
  const guardarExtras = (l: Item[]) => cambiar((d) => {
    const e = { ...d.extras };
    if (l.length) e[fecha] = l; else delete e[fecha];
    return { ...d, extras: e };
  });

  return (
    <>
      <div className="navegador-fecha navegador-fecha--centro">
        <button type="button" className="flecha" aria-label="Día anterior" onClick={() => setFecha(shiftIsoDate(fecha, -1))}>‹</button>
        <button type="button" className="fecha" onClick={() => setFecha(hoy)}><span className="subtitulo">{fecha === hoy ? "Hoy" : fechaBonita(fecha)}</span></button>
        <button type="button" className="flecha" aria-label="Día siguiente" onClick={() => setFecha(shiftIsoDate(fecha, 1))}>›</button>
      </div>

      <section className="energia">
        <div className="energia__cab">
          <div>
            <p className="nota">Te quedan</p>
            <p className="numero">{Math.max(0, objetivo.targetKcal - comido.kcal)}<small> kcal</small></p>
          </div>
          <p className="nota derecha">objetivo {objetivo.targetKcal}<br />comido {comido.kcal}</p>
        </div>
        {barras.map((b) => (
          <div key={b.t} className="barra">
            <span className="nota"><b>{b.t}</b> · {b.v} / {b.m} {b.u}</span>
            <div className="rp-unlock__bar" style={{ ["--relleno" as string]: `var(--${b.c})` }}><i style={{ width: `${Math.min(100, (b.v / Math.max(1, b.m)) * 100)}%` }} /></div>
          </div>
        ))}
        <p className="nota">Pasarse un día no es un problema: la siguiente comida vuelve al plan, sin compensar.</p>
      </section>

      <Seccion titulo="Comidas" washi="rosa">
        {filas.map(({ c, marcada, pct, kcal }) => (
          <div key={c.slot} className="diario-fila" data-hecha={marcada}>
            <span className="diario-fila__slot"><b>{slotLabel(c.slot)}</b><Pildora color={TEXTO_DECISION[c.decision.tipo].color}>{TEXTO_DECISION[c.decision.tipo].corto}</Pildora></span>
            <span className="diario-fila__txt">{c.nombre}{c.libre || !c.grams ? "" : ` · ${c.grams} g`}{c.ajustada ? " · ajustada hoy" : ""}</span>
            <span className="diario-fila__kcal">{marcada ? <><b>{kcal}</b> kcal{pct < 100 ? ` (${pct} %)` : ""}</> : <span className="nota">sin marcar · {c.kcal + c.addOnKcal}</span>}</span>
          </div>
        ))}
        <p className="nota">Las comidas se marcan en Hoy con “¡Me lo he comido!”.</p>
      </Seccion>

      <Seccion titulo="Extras y picoteos" washi="mantequilla" derecha={<Boton variante="mantequilla" onClick={() => setExtra(true)}>+ Añadir</Boton>}>
        {extras.length ? <ListaItems items={extras} cambiar={guardarExtras} /> : <p className="nota">Algo fuera de las 4 comidas: un café con leche, una onza de chocolate… Apúntalo si quieres, sin culpa.</p>}
      </Seccion>

      <Hoja abierta={extra} cerrar={() => setExtra(false)} titulo="Añadir un extra">
        {extra ? <Buscador guardados={datos.alimentos} recetas={datos.recetas}
          alGuardarAlimento={(a) => cambiar((d) => ({ ...d, alimentos: { ...d.alimentos, [a.id]: a } }))}
          alAnadir={(i) => { guardarExtras([...extras, i]); setExtra(false); pegatina({ motivo: "Apuntado", extra: `${i.gramos} g de ${i.nombre}` }); }} /> : null}
      </Hoja>
    </>
  );
}

