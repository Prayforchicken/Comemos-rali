/* Registro: lo que la app ha aprendido de las raciones, el peso de referencia y el historial de comidas y huellitas. */
import { useMemo, useState } from "react";
import type { PantallaProps } from "../App";
import { enPlan } from "../acciones";
import { servingAdjustment, slotLabel, todayInTimezone } from "../comemos/engine";
import type { MealFeedback, MealSlot } from "../comemos/models";
import { Boton, Campo, Confirmar, Hoja, IconoHuellita, Pildora, Seccion, Titulo } from "../componentes/base";
import { usePegatina } from "../componentes/Pegatinas";
import type { TipoLogro } from "../juego/tipos";
import { fechaCorta } from "./Hoy";

const TEXTO_LOGRO: Record<TipoLogro, string> = { comida: "Comida del plan", gimnasio: "Gimnasio", agua: "Agua del día", "dia-completo": "Día completo" };

export function Registro({ datos, cambiar, incrustado }: PantallaProps & { incrustado?: boolean }) {
  const { plan, juego } = datos;
  const pegatina = usePegatina();
  const [peso, setPeso] = useState(String(plan.profiles.rali.weightKg));
  const [editando, setEditando] = useState<MealFeedback | null>(null);
  const registros = plan.feedback.filter((f) => f.personId === "rali");
  const pesos = plan.weightLogs.filter((w) => w.personId === "rali").sort((a, b) => b.date.localeCompare(a.date));
  const nombreDe = (id: string) => plan.mealTemplates.find((m) => m.id === id)?.shortName ?? id;

  const aprendido = useMemo(() => {
    const claves = new Set(registros.map((r) => `${r.slot}|${r.templateId}`));
    return [...claves].map((k) => {
      const [slot, templateId] = k.split("|") as [MealSlot, string];
      return {
        slot, templateId,
        ajuste: servingAdjustment(plan.feedback, "rali", slot, templateId),
        veces: registros.filter((r) => r.slot === slot && r.templateId === templateId).length,
      };
    });
  }, [registros, plan.feedback]);

  const guardarPeso = () => {
    const kg = Number(peso.replace(",", "."));
    if (!(kg >= 35 && kg <= 300)) return pegatina({ motivo: "Revisa el peso", extra: "Entre 35 y 300 kg" });
    const fecha = todayInTimezone(plan.settings.timezone);
    cambiar(enPlan((p) => ({
      ...p,
      profiles: { ...p.profiles, rali: { ...p.profiles.rali, weightKg: kg } },
      weightLogs: [{ id: `peso-${Date.now()}`, personId: "rali" as const, date: fecha, weightKg: kg }, ...p.weightLogs.filter((w) => !(w.personId === "rali" && w.date === fecha))].slice(0, 260),
    })));
    pegatina({ motivo: "Peso guardado", extra: "Solo ajusta la energía estimada" });
  };

  return (
    <div className="pila">
      {incrustado ? <p className="nota">La app aprende de repeticiones; un día raro no se convierte en una regla.</p> : <Titulo antes="Mi" marcado="registro" texto="La app aprende de repeticiones; un día raro no se convierte en una regla." />}

      <section className="regla-aprendizaje">
        <span className="regla-aprendizaje__num">3</span>
        <div>
          <p className="subtitulo">Tres datos para el primer cambio</p>
          <p className="nota">Si dos de tres raciones parecidas quedan claramente grandes y de media comes un 78 % o menos, la siguiente baja solo un 5 %. Seis registros coherentes permiten llegar al 10 %. Si te lo terminas y te queda hambre varias veces, puede subir un 5 %.</p>
        </div>
      </section>

      <Seccion titulo="Lo aprendido" washi="menta">
        {aprendido.length ? aprendido.map((a) => (
          <div key={`${a.slot}-${a.templateId}`} className="aprendido">
            <div>
              <p className="cuerpo-fuerte">{nombreDe(a.templateId)}</p>
              <p className="nota">{slotLabel(a.slot)} · {a.veces} registro{a.veces === 1 ? "" : "s"}</p>
            </div>
            <div className="aprendido__dcha">
              <Pildora color={a.ajuste.factor === 1 ? "papel" : a.ajuste.factor < 1 ? "cielo" : "melocoton"}>
                {a.ajuste.factor === 1 ? "Sin cambio" : `${a.ajuste.factor > 1 ? "+" : ""}${Math.round((a.ajuste.factor - 1) * 100)} %`}
              </Pildora>
              <p className="nota">{a.ajuste.note ?? "Aún no hay un patrón claro."}</p>
            </div>
          </div>
        )) : <p className="nota">Cuando marques algunas comidas aparecerán aquí los ajustes y su motivo.</p>}
      </Seccion>

      <Seccion titulo="Peso de referencia" washi="cielo">
        <p className="nota">Solo actualiza el basal. No cambia objetivos de golpe por una pesada aislada.</p>
        <div className="fila">
          <Campo etiqueta="Peso (kg)"><input className="entrada" type="number" inputMode="decimal" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} /></Campo>
          <Boton variante="papel" onClick={guardarPeso}>Guardar</Boton>
        </div>
        {pesos.length ? (
          <ul className="lista-bujo">{pesos.slice(0, 5).map((w) => <li key={w.id}>{fechaCorta(w.date)} · <b>{w.weightKg} kg</b></li>)}</ul>
        ) : null}
      </Seccion>

      <Seccion titulo="Últimas comidas" washi="rosa" derecha={<Pildora color="rosa">{registros.length}</Pildora>}>
        {registros.length ? registros.slice(0, 20).map((r) => (
          <button key={r.id} type="button" className="historial" onClick={() => setEditando(r)}>
            <span className="historial__pct"><b>{r.eatenPercent}%</b><small>comido</small></span>
            <span className="historial__txt">
              <b>{nombreDe(r.templateId)}</b>
              <small>{fechaCorta(r.date)} · {slotLabel(r.slot)} · {r.servedGrams} g servidos</small>
              {r.note ? <small className="historial__nota">“{r.note}”</small> : null}
            </span>
            <span className="historial__dcha nota">rico {r.enjoyment}/5<br />hambre {r.hungerAfter}/5</span>
          </button>
        )) : <p className="nota">Aún no has marcado ninguna comida.</p>}
      </Seccion>

      <Seccion titulo="Huellitas ganadas" washi="mantequilla">
        {juego.logros.length ? (
          <ul className="huellitas-log">
            {juego.logros.slice(0, 12).map((l) => (
              <li key={l.id}>
                <span>{fechaCorta(l.fecha)} · {TEXTO_LOGRO[l.tipo]}{l.slot ? ` (${slotLabel(l.slot).toLowerCase()})` : ""}</span>
                <b><IconoHuellita tam={18} />+{l.puntos}</b>
              </li>
            ))}
          </ul>
        ) : <p className="nota">Aquí irá apareciendo cada huellita que ganes. Nunca hay líneas en negativo.</p>}
      </Seccion>

      <Hoja abierta={Boolean(editando)} cerrar={() => setEditando(null)} titulo="Editar registro">
        {editando ? <EditarRegistro key={editando.id} r={editando} nombre={nombreDe(editando.templateId)}
          alGuardar={(r) => { cambiar(enPlan((p) => ({ ...p, feedback: p.feedback.map((x) => (x.id === r.id ? r : x)) }))); setEditando(null); pegatina({ motivo: "Registro actualizado", extra: "El aprendizaje se ha recalculado" }); }}
          alBorrar={(id) => { cambiar(enPlan((p) => ({ ...p, feedback: p.feedback.filter((x) => x.id !== id) }))); setEditando(null); }} /> : null}
      </Hoja>
    </div>
  );
}

function EditarRegistro({ r, nombre, alGuardar, alBorrar }: { r: MealFeedback; nombre: string; alGuardar: (r: MealFeedback) => void; alBorrar: (id: string) => void }) {
  const [x, setX] = useState(r);
  const [borrar, setBorrar] = useState(false);
  const num = (k: "servedGrams" | "eatenPercent" | "hungerAfter" | "enjoyment") => (e: React.ChangeEvent<HTMLInputElement>) => setX({ ...x, [k]: Number(e.target.value) });
  return (
    <>
      <p className="nota">{nombre} · {slotLabel(r.slot)} · {fechaCorta(r.date)}</p>
      <div className="rejilla">
        <Campo etiqueta="Servido (g)"><input className="entrada" type="number" value={x.servedGrams} onChange={num("servedGrams")} /></Campo>
        <Campo etiqueta="Comido (%)"><input className="entrada" type="number" min={0} max={100} step={5} value={x.eatenPercent} onChange={num("eatenPercent")} /></Campo>
        <Campo etiqueta="Hambre después (1–5)"><input className="entrada" type="number" min={1} max={5} value={x.hungerAfter} onChange={num("hungerAfter")} /></Campo>
        <Campo etiqueta="Qué rico (1–5)"><input className="entrada" type="number" min={1} max={5} value={x.enjoyment} onChange={num("enjoyment")} /></Campo>
      </div>
      <Campo etiqueta="Nota"><textarea className="entrada" rows={2} value={x.note} onChange={(e) => setX({ ...x, note: e.target.value })} /></Campo>
      <div className="hoja__acciones">
        <Boton onClick={() => alGuardar(x)} className="ancho">Guardar cambios</Boton>
        <button type="button" className="enlace frambuesa" onClick={() => setBorrar(true)}>Borrar este registro</button>
      </div>
      <Confirmar abierta={borrar} cerrar={() => setBorrar(false)} titulo="¿Borrar este registro?" texto="La ración volverá a calcularse sin este dato. Las huellitas ganadas se quedan." si="Borrar" alConfirmar={() => alBorrar(r.id)} />
    </>
  );
}
