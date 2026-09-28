/* Diario: "Mi día" (emociones y lo que ha pasado) y el mini MyFitnessPal:
   lo comido frente al objetivo, extras, recetas propias, alimentos guardados y el aprendizaje de raciones. */
import { useMemo, useState } from "react";
import type { PantallaProps } from "../App";
import { dividir, totales, aPlantilla } from "../alimentos/nutricion";
import { BASE } from "../alimentos/base";
import type { Alimento, Item, RecetaPropia } from "../alimentos/tipos";
import { energyForDay, shiftIsoDate, slotLabel, todayInTimezone } from "../comemos/engine";
import type { MealSlot } from "../comemos/models";
import { Buscador, ListaItems } from "../componentes/Buscador";
import { Boton, Campo, Confirmar, Hoja, Pildora, Seccion, Titulo } from "../componentes/base";
import { usePegatina } from "../componentes/Pegatinas";
import { diaDecidido, SLOTS, TEXTO_DECISION } from "../decisiones/decisiones";
import { logroDe } from "../juego/motor";
import { fechaBonita } from "./Hoy";
import { Registro } from "./Registro";
import { MiDia } from "./MiDia";

type Vista = "midia" | "comida" | "recetas" | "aprendizaje";
const VISTAS: { v: Vista; t: string }[] = [{ v: "midia", t: "Mi día" }, { v: "comida", t: "Comida" }, { v: "recetas", t: "Recetas" }, { v: "aprendizaje", t: "Raciones" }];

export function Diario(props: PantallaProps) {
  const [vista, setVista] = useState<Vista>("midia");
  return (
    <div className="pila">
      <Titulo antes="Mi" marcado="diario" texto="Cómo estás, lo que comes y tus recetas. Nada de aquí resta huellitas." />
      <div className="segmento segmento--ancho" role="tablist">
        {VISTAS.map((x) => <button key={x.v} type="button" role="tab" aria-selected={vista === x.v} data-activa={vista === x.v} onClick={() => setVista(x.v)}>{x.t}</button>)}
      </div>
      {vista === "midia" && <MiDia {...props} />}
      {vista === "comida" && <Dia {...props} />}
      {vista === "recetas" && <><Recetas {...props} /><h2 className="etiqueta"><span className="rp-subrayado">Alimentos</span></h2><Alimentos {...props} /></>}
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
  const comidas = useMemo(() => diaDecidido(plan, datos.decisiones, fecha), [plan, datos.decisiones, fecha]);
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
            <span className="diario-fila__txt">{c.template.shortName}{c.libre || !c.grams ? "" : ` · ${c.grams} g`}</span>
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

/* ---------------- recetas propias ---------------- */

const MOMENTOS: { v: MealSlot; t: string }[] = SLOTS.map((s) => ({ v: s, t: slotLabel(s) }));
const nuevaReceta = (): RecetaPropia => ({ id: `receta-${Date.now().toString(36)}`, nombre: "", raciones: 2, momentos: ["lunch", "dinner"], items: [], pasos: "", creada: new Date().toISOString() });

function Recetas({ datos, cambiar }: PantallaProps) {
  const pegatina = usePegatina();
  const [editando, setEditando] = useState<RecetaPropia | null>(null);
  const [borrando, setBorrando] = useState<RecetaPropia | null>(null);
  const lista = Object.values(datos.recetas).sort((a, b) => b.creada.localeCompare(a.creada));

  const guardar = (r: RecetaPropia) => {
    cambiar((d) => {
      const tpl = aPlantilla(r);
      const plantillas = d.plan.mealTemplates.some((t) => t.id === r.id) ? d.plan.mealTemplates.map((t) => (t.id === r.id ? tpl : t)) : [...d.plan.mealTemplates, tpl];
      return { ...d, recetas: { ...d.recetas, [r.id]: r }, plan: { ...d.plan, mealTemplates: plantillas } };
    });
    setEditando(null);
    pegatina({ motivo: "Receta guardada", extra: "Ya sale en “Algo diferente” y en “Sobras”" });
  };
  const borrar = (r: RecetaPropia) => {
    cambiar((d) => {
      const recetas = { ...d.recetas };
      delete recetas[r.id];
      return { ...d, recetas, plan: { ...d.plan, mealTemplates: d.plan.mealTemplates.filter((t) => t.id !== r.id) } };
    });
    setBorrando(null);
  };

  return (
    <>
      <Boton onClick={() => setEditando(nuevaReceta())}>+ Nueva receta</Boton>
      {lista.length ? lista.map((r) => {
        const x = dividir(totales(r.items), r.raciones);
        return (
          <article key={r.id} className="receta-propia">
            <div className="fila">
              <h3 className="subtitulo">{r.nombre}</h3>
              <Pildora color="lavanda">{r.raciones} {r.raciones === 1 ? "ración" : "raciones"}</Pildora>
            </div>
            <dl className="macros macros--5">
              <div><dt>kcal</dt><dd>{x.kcal}</dd></div>
              <div><dt>Prot.</dt><dd>{Math.round(x.proteina)}</dd></div>
              <div><dt>Carbos</dt><dd>{Math.round(x.carbos)}</dd></div>
              <div><dt>Grasa</dt><dd>{Math.round(x.grasa)}</dd></div>
              <div><dt>Fibra</dt><dd>{Math.round(x.fibra)}</dd></div>
            </dl>
            <p className="nota">Por ración · {x.gramos} g · {r.items.length} ingredientes · {r.momentos.map((m) => slotLabel(m).toLowerCase()).join(", ")}</p>
            <div className="regla__acciones">
              <button type="button" className="enlace" onClick={() => setEditando(structuredClone(r))}>Editar</button>
              <button type="button" className="enlace frambuesa" onClick={() => setBorrando(r)}>Borrar</button>
            </div>
          </article>
        );
      }) : (
        <div className="vacio">
          <p className="subtitulo">Tu recetario está vacío</p>
          <p className="nota">Crea una receta con sus ingredientes y gramos. La app calcula cada ración y la podrás elegir en cualquier comida.</p>
        </div>
      )}

      <Hoja abierta={Boolean(editando)} cerrar={() => setEditando(null)} titulo={editando && datos.recetas[editando.id] ? "Editar receta" : "Nueva receta"}>
        {editando ? <EditorReceta key={editando.id} inicial={editando} datos={datos}
          alGuardarAlimento={(a) => cambiar((d) => ({ ...d, alimentos: { ...d.alimentos, [a.id]: a } }))} alGuardar={guardar} /> : null}
      </Hoja>
      <Confirmar abierta={Boolean(borrando)} cerrar={() => setBorrando(null)} titulo={`¿Borrar “${borrando?.nombre ?? ""}”?`}
        texto="Las comidas que la usaban vuelven a lo que tocaba en el plan." si="Borrar receta" alConfirmar={() => borrando && borrar(borrando)} />
    </>
  );
}

function EditorReceta({ inicial, datos, alGuardar, alGuardarAlimento }: { inicial: RecetaPropia; datos: PantallaProps["datos"]; alGuardar: (r: RecetaPropia) => void; alGuardarAlimento: (a: Alimento) => void }) {
  const [r, setR] = useState(inicial);
  const [buscando, setBuscando] = useState(!inicial.items.length);
  const valido = r.nombre.trim() && r.items.length && r.raciones >= 1;
  return (
    <>
      <Campo etiqueta="Nombre"><input className="entrada" value={r.nombre} onChange={(e) => setR({ ...r, nombre: e.target.value })} placeholder="Ej.: Curry de garbanzos" /></Campo>
      <div className="rejilla">
        <Campo etiqueta="Raciones que salen"><input className="entrada" type="number" min={1} max={20} value={r.raciones} onChange={(e) => setR({ ...r, raciones: Math.max(1, Number(e.target.value) || 1) })} /></Campo>
      </div>
      <div className="campo">
        <span className="nota">Para qué comidas</span>
        <div className="opciones">
          {MOMENTOS.map((m) => {
            const on = r.momentos.includes(m.v);
            return <button key={m.v} type="button" className="opcion" data-activa={on} onClick={() => setR({ ...r, momentos: on ? r.momentos.filter((x) => x !== m.v) : [...r.momentos, m.v] })}>{m.t}</button>;
          })}
        </div>
      </div>
      <span className="etiqueta">Ingredientes (toda la receta)</span>
      <ListaItems items={r.items} cambiar={(items) => setR({ ...r, items })} divisor={r.raciones} etiquetaTotal="Por ración" />
      {buscando ? (
        <Buscador guardados={datos.alimentos} recetas={datos.recetas} sinRecetas alGuardarAlimento={alGuardarAlimento}
          alAnadir={(i) => { setR((x) => ({ ...x, items: [...x.items, i] })); setBuscando(false); }} />
      ) : <Boton variante="papel" onClick={() => setBuscando(true)}>+ Ingrediente</Boton>}
      <Campo etiqueta="Pasos (opcional)"><textarea className="entrada" rows={3} value={r.pasos} onChange={(e) => setR({ ...r, pasos: e.target.value })} /></Campo>
      <div className="hoja__acciones"><Boton className="ancho" disabled={!valido} onClick={() => alGuardar({ ...r, nombre: r.nombre.trim() })}>Guardar receta</Boton></div>
    </>
  );
}

/* ---------------- alimentos guardados ---------------- */

function Alimentos({ datos, cambiar }: PantallaProps) {
  const [borrando, setBorrando] = useState<Alimento | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const lista = Object.values(datos.alimentos).sort((a, b) => a.nombre.localeCompare(b.nombre));
  return (
    <>
      <p className="nota">Aquí quedan los alimentos de wger que usas y los que creas a mano, para tenerlos también sin internet. Además hay {BASE.length} alimentos comunes en la base local.</p>
      <Boton variante="papel" onClick={() => setNuevo(true)}>Buscar o crear alimento</Boton>
      {lista.length ? (
        <Seccion titulo="Mis alimentos" washi="cielo" derecha={<Pildora color="cielo">{lista.length}</Pildora>}>
          {lista.map((a) => (
            <div key={a.id} className="alimento-guardado">
              <span><b>{a.nombre}</b><small className="nota">{a.n.kcal} kcal · P {Math.round(a.n.proteina)} · C {Math.round(a.n.carbos)} · G {Math.round(a.n.grasa)} · F {Math.round(a.n.fibra)} (100 g)</small></span>
              <Pildora color={a.fuente === "wger" ? "cielo" : "rosa"}>{a.fuente === "wger" ? "wger" : "tuyo"}</Pildora>
              <button type="button" className="item__quitar" aria-label={`Quitar ${a.nombre}`} onClick={() => setBorrando(a)}>×</button>
            </div>
          ))}
        </Seccion>
      ) : null}
      <Hoja abierta={nuevo} cerrar={() => setNuevo(false)} titulo="Buscar o crear">
        {nuevo ? <Buscador guardados={datos.alimentos} recetas={datos.recetas} sinRecetas
          alGuardarAlimento={(a) => cambiar((d) => ({ ...d, alimentos: { ...d.alimentos, [a.id]: a } }))}
          alAnadir={(i) => { const a = [...BASE, ...lista].find((x) => x.id === i.alimentoId); if (a && !datos.alimentos[a.id]) cambiar((d) => ({ ...d, alimentos: { ...d.alimentos, [a.id]: a } })); setNuevo(false); }} /> : null}
      </Hoja>
      <Confirmar abierta={Boolean(borrando)} cerrar={() => setBorrando(null)} titulo={`¿Quitar “${borrando?.nombre ?? ""}”?`}
        texto="Solo se quita de tu lista. Las comidas y recetas donde ya está guardan sus valores." si="Quitar"
        alConfirmar={() => { const id = borrando?.id; cambiar((d) => { const a = { ...d.alimentos }; if (id) delete a[id]; return { ...d, alimentos: a }; }); setBorrando(null); }} />
    </>
  );
}
