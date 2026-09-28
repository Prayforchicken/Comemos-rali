/* Actividad: el horario semanal de Rali (trabajo, caminar, bici, gimnasio…) que mueve la energía del día. */
import { useMemo, useState } from "react";
import type { PantallaProps } from "../App";
import { enPlan } from "../acciones";
import { activitiesForDay, activityCalories, weekdayFromIso } from "../comemos/engine";
import type { ActivityCategory, ActivityRule, AppState } from "../comemos/models";
import { Boton, Campo, Confirmar, Hoja, Interruptor, Pildora, Seccion, Selector, Titulo } from "../componentes/base";
import { usePegatina } from "../componentes/Pegatinas";
import { fechaBonita } from "./Hoy";

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
export const CATEGORIAS: Record<ActivityCategory, { nombre: string; color: string }> = {
  work: { nombre: "Trabajo", color: "cielo" },
  walk: { nombre: "Caminar", color: "menta" },
  bike: { nombre: "Bici", color: "mantequilla" },
  gym: { nombre: "Gimnasio", color: "rosa" },
  chores: { nombre: "Tareas", color: "lavanda" },
  other: { nombre: "Otra", color: "melocoton" },
};
const nuevoId = () => `activity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function Actividad({ datos, cambiar, fecha }: PantallaProps) {
  const { plan } = datos;
  const perfil = plan.profiles.rali;
  const pegatina = usePegatina();
  const [editando, setEditando] = useState<ActivityRule | "nueva" | null>(null);
  const [borrando, setBorrando] = useState<ActivityRule | null>(null);
  const [json, setJson] = useState(false);
  const reglas = plan.activities.filter((a) => a.personId === "rali").sort((a, b) => a.start.localeCompare(b.start));
  const deHoy = activitiesForDay(plan, "rali", fecha);
  const quitadasHoy = new Set(plan.activityOverrides[fecha]?.rali?.disabledRuleIds ?? []);
  const carga = Math.round(deHoy.reduce((s, a) => s + activityCalories(a, perfil), 0));

  const tocarRegla = (id: string, cambios: Partial<ActivityRule>) =>
    cambiar(enPlan((p) => ({ ...p, activities: p.activities.map((a) => (a.id === id ? { ...a, ...cambios } : a)) })));

  const alternarHoy = (regla: ActivityRule) => cambiar(enPlan((p) => {
    const dia = { ...(p.activityOverrides[fecha] ?? {}) };
    const o = dia.rali ?? { disabledRuleIds: [], extras: [] };
    const ids = new Set(o.disabledRuleIds);
    if (ids.has(regla.id)) ids.delete(regla.id); else ids.add(regla.id);
    dia.rali = { ...o, disabledRuleIds: [...ids] };
    return { ...p, activityOverrides: { ...p.activityOverrides, [fecha]: dia } };
  }));

  return (
    <div className="pila">
      <Titulo antes="Mi" marcado="actividad" texto="El horario semanal que alimenta el cálculo. Solo se suma la energía por encima del reposo." />

      <div className="fila fila--envuelve">
        <Boton onClick={() => setEditando("nueva")}>+ Actividad</Boton>
        <Boton variante="papel" onClick={() => setJson(true)}>JSON</Boton>
      </div>

      <section className="energia">
        <div className="energia__cab">
          <div>
            <p className="nota">{fechaBonita(fecha)} · carga prevista</p>
            <p className="numero">+{carga}<small> kcal</small></p>
          </div>
          <Pildora color="menta">{deHoy.length} hoy</Pildora>
        </div>
        {deHoy.length ? (
          <ul className="actividades-hoy">
            {deHoy.map((a) => <li key={a.id}><b>{a.label}</b> {a.start}–{a.end} · {Math.round(activityCalories(a, perfil))} kcal</li>)}
          </ul>
        ) : <p className="nota">No hay actividades activas para este día.</p>}
      </section>

      <div className="seccion__cab">
        <h2 className="etiqueta"><span className="rp-subrayado">Reglas semanales</span></h2>
        <Pildora>{reglas.length} regla{reglas.length === 1 ? "" : "s"}</Pildora>
      </div>

      {reglas.length ? reglas.map((r) => {
        const tocaHoy = r.days.includes(weekdayFromIso(fecha));
        const cat = CATEGORIAS[r.category];
        return (
          <article key={r.id} className="regla" data-apagada={!r.enabled} style={{ ["--cinta" as string]: `var(--${cat.color})` }}>
            <div className="regla__cab">
              <div className="regla__txt">
                <div className="fila fila--envuelve"><h3 className="subtitulo">{r.label}</h3><Pildora color={cat.color}>{cat.nombre}</Pildora></div>
                <p className="cuerpo">{r.days.map((d) => DIAS[d - 1]).join(" · ")} · {r.start}–{r.end}</p>
                <p className="nota">{r.energyMode === "met" ? `${r.met} MET · ${Math.round(activityCalories(r, perfil))} kcal por día` : `${r.fixedKcal} kcal fijas por día`}</p>
              </div>
              <Interruptor activo={r.enabled} etiqueta={`Activar ${r.label}`} alCambiar={(v) => tocarRegla(r.id, { enabled: v })} />
            </div>
            {r.trainingPlan ? <p className="plan-sesion">{r.trainingPlan}</p> : null}
            <div className="regla__acciones">
              {tocaHoy ? <button type="button" className="enlace" onClick={() => alternarHoy(r)}>{quitadasHoy.has(r.id) ? "Recuperar solo este día" : "Quitar solo este día"}</button> : null}
              <button type="button" className="enlace" onClick={() => setEditando(r)}>Editar</button>
              <button type="button" className="enlace frambuesa" onClick={() => setBorrando(r)}>Borrar</button>
            </div>
          </article>
        );
      }) : (
        <div className="vacio">
          <p className="subtitulo">Aún no hay actividades</p>
          <p className="nota">Añade trabajo, caminar, bici o gimnasio. El plan del día se recalcula solo.</p>
          <Boton onClick={() => setEditando("nueva")}>Añadir la primera</Boton>
        </div>
      )}

      <Hoja abierta={editando !== null} cerrar={() => setEditando(null)} titulo={editando === "nueva" ? "Nueva actividad" : "Editar actividad"}>
        {editando !== null ? (
          <EditorActividad key={editando === "nueva" ? "nueva" : editando.id} inicial={editando === "nueva" ? null : editando} alGuardar={(a) => {
            cambiar(enPlan((p) => {
              const existe = p.activities.some((x) => x.id === a.id);
              return { ...p, activities: existe ? p.activities.map((x) => (x.id === a.id ? a : x)) : [...p.activities, a] };
            }));
            setEditando(null);
            pegatina({ motivo: "Actividad guardada", extra: "Las comidas se han recalculado" });
          }} />
        ) : null}
      </Hoja>

      <Confirmar abierta={Boolean(borrando)} cerrar={() => setBorrando(null)} titulo={`¿Borrar “${borrando?.label ?? ""}”?`}
        texto="Se quitará de todas las semanas. Las excepciones y los registros de comidas se conservan." si="Borrar actividad"
        alConfirmar={() => { const id = borrando?.id; cambiar(enPlan((p) => ({ ...p, activities: p.activities.filter((a) => a.id !== id) }))); setBorrando(null); }} />

      <Hoja abierta={json} cerrar={() => setJson(false)} titulo="Mi JSON de actividad">
        {json ? <JsonPersonal plan={plan} alAplicar={(p) => { cambiar(enPlan(() => p)); setJson(false); pegatina({ motivo: "JSON aplicado" }); }} /> : null}
      </Hoja>
    </div>
  );
}

function EditorActividad({ inicial, alGuardar }: { inicial: ActivityRule | null; alGuardar: (a: ActivityRule) => void }) {
  const [a, setA] = useState<ActivityRule>(() => inicial ? structuredClone(inicial) : {
    id: nuevoId(), personId: "rali", label: "", category: "gym", days: [2, 4], start: "18:00", end: "19:00",
    enabled: true, energyMode: "met", met: 5, fixedKcal: 0, trainingPlan: "", notes: "",
  });
  const [error, setError] = useState("");
  const poner = <K extends keyof ActivityRule>(k: K, v: ActivityRule[K]) => setA((x) => ({ ...x, [k]: v }));
  const guardar = () => {
    if (!a.label.trim()) return setError("Ponle un nombre a la actividad.");
    if (!a.days.length) return setError("Elige al menos un día.");
    if (a.energyMode === "met" && (a.met < 1 || a.met > 15)) return setError("Revisa el valor MET (entre 1 y 15).");
    alGuardar({ ...a, label: a.label.trim(), personId: "rali" });
  };
  return (
    <>
      <p className="nota">Se suma al basal solo la energía por encima del reposo, para no contar dos veces lo mismo.</p>
      <div className="rejilla">
        <Campo etiqueta="Nombre"><input className="entrada" value={a.label} onChange={(e) => poner("label", e.target.value)} placeholder="Ej.: Fuerza" /></Campo>
        <Campo etiqueta="Tipo"><Selector valor={a.category} opciones={Object.entries(CATEGORIAS).map(([v, c]) => ({ v: v as ActivityCategory, t: c.nombre }))} alCambiar={(v) => poner("category", v)} /></Campo>
        <Campo etiqueta="Empieza"><input className="entrada" type="time" value={a.start} onChange={(e) => poner("start", e.target.value)} /></Campo>
        <Campo etiqueta="Termina"><input className="entrada" type="time" value={a.end} onChange={(e) => poner("end", e.target.value)} /></Campo>
      </div>
      <div className="campo">
        <span className="nota">Días de la semana</span>
        <div className="opciones">
          {DIAS.map((l, i) => {
            const dia = i + 1, activo = a.days.includes(dia);
            return <button key={l} type="button" className="opcion opcion--dia" data-activa={activo} onClick={() => poner("days", activo ? a.days.filter((d) => d !== dia) : [...a.days, dia].sort())}>{l}</button>;
          })}
        </div>
      </div>
      <div className="rejilla">
        <Campo etiqueta="Cómo estimar el gasto"><Selector valor={a.energyMode} opciones={[{ v: "met", t: "MET × peso × tiempo" }, { v: "fixed", t: "Calorías fijas" }]} alCambiar={(v) => poner("energyMode", v)} /></Campo>
        {a.energyMode === "met"
          ? <Campo etiqueta="Intensidad MET"><input className="entrada" type="number" min={1} max={15} step={0.1} value={a.met} onChange={(e) => poner("met", Number(e.target.value))} /></Campo>
          : <Campo etiqueta="Calorías por sesión"><input className="entrada" type="number" min={0} max={3000} value={a.fixedKcal} onChange={(e) => poner("fixedKcal", Number(e.target.value))} /></Campo>}
      </div>
      {a.category === "gym" ? (
        <Campo etiqueta="Plan de la sesión (opcional)"><textarea className="entrada" rows={3} value={a.trainingPlan ?? ""} onChange={(e) => poner("trainingPlan", e.target.value)} placeholder="Ej.: press de pierna, remo, plancha…" /></Campo>
      ) : null}
      <Campo etiqueta="Nota (opcional)"><textarea className="entrada" rows={2} value={a.notes ?? ""} onChange={(e) => poner("notes", e.target.value)} /></Campo>
      {error ? <p className="nota frambuesa">{error}</p> : null}
      <div className="hoja__acciones"><Boton onClick={guardar} className="ancho">Guardar</Boton></div>
    </>
  );
}

/** JSON solo de Rali: perfil, horario y excepciones. Aplicarlo sustituye solo eso. */
function JsonPersonal({ plan, alAplicar }: { plan: AppState; alAplicar: (p: AppState) => void }) {
  const objeto = useMemo(() => ({
    version: 1, personId: "rali", profile: plan.profiles.rali,
    activities: plan.activities.filter((a) => a.personId === "rali"),
    overrides: Object.fromEntries(Object.entries(plan.activityOverrides).filter(([, v]) => v.rali).map(([f, v]) => [f, v.rali])),
  }), [plan]);
  const [texto, setTexto] = useState(() => JSON.stringify(objeto, null, 2));
  const [error, setError] = useState("");
  const pegatina = usePegatina();
  const aplicar = () => {
    try {
      const v = JSON.parse(texto);
      if (v.version !== 1 || v.personId !== "rali" || v.profile?.id !== "rali" || !Array.isArray(v.activities)) throw new Error("Este JSON tiene que ser de Rali.");
      if (v.activities.some((a: ActivityRule) => a.personId !== "rali" || !Array.isArray(a.days))) throw new Error("Hay una actividad de otra persona o sin días válidos.");
      const overrides = structuredClone(plan.activityOverrides);
      for (const dia of Object.values(overrides)) delete dia.rali;
      for (const [f, o] of Object.entries(v.overrides ?? {})) overrides[f] = { ...(overrides[f] ?? {}), rali: o as never };
      alAplicar({ ...plan, profiles: { ...plan.profiles, rali: v.profile }, activities: [...plan.activities.filter((a) => a.personId !== "rali"), ...v.activities], activityOverrides: overrides });
    } catch (e) { setError(e instanceof Error ? e.message : "El JSON no es válido."); }
  };
  return (
    <>
      <p className="nota">Perfil, horario semanal, gimnasio y excepciones por fecha. Útil para pegarlo en otra IA y traer los cambios de vuelta.</p>
      <textarea className="entrada json" rows={14} value={texto} spellCheck={false} onChange={(e) => setTexto(e.target.value)} />
      {error ? <p className="nota frambuesa">{error}</p> : null}
      <div className="fila fila--envuelve">
        <Boton variante="papel" onClick={async () => { try { await navigator.clipboard.writeText(texto); pegatina({ motivo: "JSON copiado" }); } catch { pegatina({ motivo: "Selecciónalo y cópialo a mano" }); } }}>Copiar</Boton>
        <Boton onClick={aplicar}>Aplicar JSON</Boton>
      </div>
    </>
  );
}
