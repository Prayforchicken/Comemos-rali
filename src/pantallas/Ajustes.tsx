/* Ajustes: avisos, perfil completo, ciclo de cocina, suplementos y copia de seguridad. */
import { useEffect, useState } from "react";
import type { PantallaProps } from "../App";
import { enPlan } from "../acciones";
import { avisoDePrueba, esNativo, pedirPermiso, reprogramar, tienePermiso } from "../avisos/notificaciones";
import { slotLabel } from "../comemos/engine";
import type { MealSlot, Profile } from "../comemos/models";
import { Boton, Campo, Confirmar, Interruptor, Seccion, Selector, Titulo } from "../componentes/base";
import { usePegatina } from "../componentes/Pegatinas";
import { datosIniciales, exportar, importar } from "../datos/almacen";

const SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

export function Ajustes({ datos, cambiar }: PantallaProps) {
  const { plan, juego } = datos;
  const pegatina = usePegatina();
  const mascota = juego.mascotas.find((m) => m.id === juego.activaId) ?? juego.mascotas[0];
  const [permiso, setPermiso] = useState<boolean | null>(null);
  useEffect(() => { void tienePermiso().then(setPermiso); }, []);
  const [json, setJson] = useState("");
  const [reinicio, setReinicio] = useState(false);
  const bases = plan.mealTemplates.filter((m) => m.kind === "batch" && m.active).map((m) => ({ v: m.id, t: m.shortName }));
  const reparto = plan.profiles.rali.mealSplit;

  return (
    <div className="pila">
      <Titulo marcado="Ajustes" texto="Los números iniciales son estimaciones de trabajo, no una prescripción médica. Todo se puede corregir." />

      <Seccion titulo="Avisos" washi="rosa">
        <p className="cuerpo">
          {esNativo()
            ? "Te avisamos a la hora de cada comida y antes del gimnasio, aunque la app esté cerrada."
            : "En el navegador solo avisa mientras la app está abierta. Para avisos de verdad, usa la APK."}
        </p>
        {permiso === false ? <Boton onClick={async () => { const ok = await pedirPermiso(); setPermiso(ok); if (ok) await reprogramar(datos); }}>Permitir notificaciones</Boton> : null}
        {([["comidas", "Comidas del plan"], ["gimnasio", "Una hora antes del gimnasio"], ["mascotas", `${mascota?.nombre ?? "Tu mascota"} te da las buenas noches (21:45)`]] as const).map(([k, t]) => (
          <div key={k} className="fila casilla-fila">
            <span className="cuerpo-fuerte">{t}</span>
            <Interruptor activo={juego.avisos[k]} etiqueta={t} alCambiar={(v) => cambiar((d) => ({ ...d, juego: { ...d.juego, avisos: { ...d.juego.avisos, [k]: v } } }))} />
          </div>
        ))}
        <Boton variante="papel" onClick={async () => { const ok = await avisoDePrueba(mascota?.nombre ?? "tu gatito"); setPermiso(ok); pegatina({ motivo: ok ? "Aviso de prueba en 5 segundos" : "Sin permiso para avisar", extra: ok ? undefined : "Actívalo en los ajustes del móvil" }); }}>Probar un aviso</Boton>
      </Seccion>

      <EditorPerfil perfil={plan.profiles.rali} alGuardar={(p) => { cambiar(enPlan((x) => ({ ...x, profiles: { ...x.profiles, rali: p } }))); pegatina({ motivo: "Perfil guardado", extra: "El plan se ha recalculado" }); }} />

      <Seccion titulo="Por qué comes más al mediodía" washi="melocoton">
        <div className="reparto">
          {SLOTS.map((s) => <div key={s}><b>{Math.round(reparto[s] * 100)} %</b><span className="nota">{slotLabel(s).toLowerCase()}</span></div>)}
        </div>
        <p className="nota">Preferencia primero, mitos fuera. El reparto pone más en la comida que en la cena porque así te resulta más cómodo. Lo cenado no se convierte en grasa por dormir: cuenta el total del día, la regularidad y que puedas mantenerlo.</p>
      </Seccion>

      <Seccion titulo="Ciclo de cuatro días" washi="mantequilla">
        <p className="nota">La app cambia gramos y extras, no te obliga a cocinar platos distintos.</p>
        <Campo etiqueta="Base de comidas"><Selector valor={plan.settings.batchLunchTemplateId} opciones={bases} alCambiar={(v) => cambiar(enPlan((p) => ({ ...p, settings: { ...p.settings, batchLunchTemplateId: v } })))} /></Campo>
        <Campo etiqueta="Base de cenas"><Selector valor={plan.settings.batchDinnerTemplateId} opciones={bases} alCambiar={(v) => cambiar(enPlan((p) => ({ ...p, settings: { ...p.settings, batchDinnerTemplateId: v } })))} /></Campo>
        <Campo etiqueta="Primer día del bloque"><input className="entrada" type="date" value={plan.settings.cookCycleAnchor} onChange={(e) => cambiar(enPlan((p) => ({ ...p, settings: { ...p.settings, cookCycleAnchor: e.target.value } })))} /></Campo>
      </Seccion>

      <Seccion titulo="Suplementos" washi="lavanda">
        <p className="nota">Se muestran como checklist en Hoy; la app no inventa dosis.</p>
        {plan.supplements.filter((s) => s.personId === "rali").map((s) => (
          <div key={s.id} className="fila casilla-fila">
            <span><b className="cuerpo-fuerte">{s.label}</b><br /><span className="nota">{s.note}</span></span>
            <Interruptor activo={s.enabled} etiqueta={`Activar ${s.label}`} alCambiar={(v) => cambiar(enPlan((p) => ({ ...p, supplements: p.supplements.map((x) => (x.id === s.id ? { ...x, enabled: v } : x)) })))} />
          </div>
        ))}
        <p className="nota nota--mantequilla">El hierro no se activa por defecto: mejor decidirlo con analítica o indicación profesional. Vitamina D y omega-3, según etiqueta o pauta.</p>
      </Seccion>

      <Seccion titulo="Copia de seguridad" washi="cielo">
        <p className="nota">Todo cabe en un JSON: perfil, horarios, recetas, raciones, agua, aprendizaje y tus animalitos. También acepta un JSON completo de Comemos.</p>
        <div className="fila fila--envuelve">
          <Boton variante="papel" onClick={async () => { const t = exportar(datos); setJson(t); try { await navigator.clipboard.writeText(t); pegatina({ motivo: "Copia en el portapapeles" }); } catch { pegatina({ motivo: "Copia lista abajo", extra: "Selecciónala y cópiala" }); } }}>Exportar</Boton>
          <Boton variante="papel" disabled={!json.trim()} onClick={() => { try { const nuevo = importar(json, datos); cambiar(() => nuevo); pegatina({ motivo: "Copia importada" }); } catch (e) { pegatina({ motivo: "No se pudo importar", extra: (e as Error).message }); } }}>Importar lo pegado</Boton>
        </div>
        <textarea className="entrada json" value={json} onChange={(e) => setJson(e.target.value)} placeholder="Pega aquí un JSON para importarlo" rows={5} spellCheck={false} />
        <button type="button" className="enlace frambuesa" onClick={() => setReinicio(true)}>Empezar de cero</button>
      </Seccion>

      <Confirmar abierta={reinicio} cerrar={() => setReinicio(false)} titulo="¿Empezar de cero?" texto="Se borra todo lo de este móvil: plan, registros y animalitos. Exporta una copia antes si quieres poder volver." si="Sí, empezar de cero" alConfirmar={() => { cambiar(() => datosIniciales()); setReinicio(false); }} />
      <p className="nota centro">Comemos · Rali · versión de pruebas 0.3</p>
    </div>
  );
}

function EditorPerfil({ perfil, alGuardar }: { perfil: Profile; alGuardar: (p: Profile) => void }) {
  const [p, setP] = useState(perfil);
  const [error, setError] = useState("");
  useEffect(() => setP(perfil), [perfil]);
  const poner = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const num = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => poner(k, Number(e.target.value) as never);
  const suma = Object.values(p.mealSplit).reduce((s, v) => s + v, 0);
  const cambiado = JSON.stringify(p) !== JSON.stringify(perfil);
  const guardar = () => {
    if (Math.abs(suma - 1) > 0.011) return setError(`El reparto tiene que sumar 100 % (ahora ${Math.round(suma * 100)} %).`);
    if (p.minimumKcal > p.maximumKcal) return setError("El mínimo no puede superar al máximo.");
    setError("");
    alGuardar(p);
  };
  return (
    <Seccion titulo="Mi perfil" washi="menta" derecha={cambiado ? <Boton onClick={guardar}>Guardar</Boton> : null}>
      <div className="rejilla">
        <Campo etiqueta="Edad"><input className="entrada" type="number" min={18} max={100} value={p.age} onChange={num("age")} /></Campo>
        <Campo etiqueta="Fórmula basal"><Selector valor={p.sexAtBirth} opciones={[{ v: "female", t: "Femenina" }, { v: "male", t: "Masculina" }]} alCambiar={(v) => poner("sexAtBirth", v)} /></Campo>
        <Campo etiqueta="Altura (cm)"><input className="entrada" type="number" min={120} max={230} value={p.heightCm} onChange={num("heightCm")} /></Campo>
        <Campo etiqueta="Peso de cálculo (kg)"><input className="entrada" type="number" step={0.1} value={p.weightKg} onChange={num("weightKg")} /></Campo>
        <Campo etiqueta="Objetivo"><Selector valor={p.goal} opciones={[{ v: "recomposition", t: "Recomposición" }, { v: "weight-loss", t: "Perder peso" }, { v: "maintenance", t: "Mantener" }]} alCambiar={(v) => poner("goal", v)} /></Campo>
        <Campo etiqueta="Ajuste sobre mantenimiento"><input className="entrada" type="number" step={50} min={-800} max={500} value={p.goalDeltaKcal} onChange={num("goalDeltaKcal")} /></Campo>
        <Campo etiqueta="Mínimo diario (kcal)"><input className="entrada" type="number" step={50} value={p.minimumKcal} onChange={num("minimumKcal")} /></Campo>
        <Campo etiqueta="Máximo diario (kcal)"><input className="entrada" type="number" step={50} value={p.maximumKcal} onChange={num("maximumKcal")} /></Campo>
        <Campo etiqueta="Proteína (g)"><input className="entrada" type="number" value={p.proteinTargetG} onChange={num("proteinTargetG")} /></Campo>
        <Campo etiqueta="Fibra (g)"><input className="entrada" type="number" value={p.fibreTargetG} onChange={num("fibreTargetG")} /></Campo>
        <Campo etiqueta="Agua (ml)"><input className="entrada" type="number" step={250} value={p.waterTargetMl} onChange={num("waterTargetMl")} /></Campo>
        <Campo etiqueta="Me despierto"><input className="entrada" type="time" value={p.wakeTime} onChange={(e) => poner("wakeTime", e.target.value)} /></Campo>
        <Campo etiqueta="Me duermo"><input className="entrada" type="time" value={p.sleepTime} onChange={(e) => poner("sleepTime", e.target.value)} /></Campo>
      </div>
      <div className="campo">
        <span className="etiqueta">Reparto del día <small className="nota">· suma {Math.round(suma * 100)} %</small></span>
        <div className="rejilla rejilla--4">
          {SLOTS.map((s) => (
            <Campo key={s} etiqueta={slotLabel(s)}>
              <input className="entrada" type="number" min={5} max={60} value={Math.round(p.mealSplit[s] * 100)} onChange={(e) => poner("mealSplit", { ...p.mealSplit, [s]: Number(e.target.value) / 100 })} />
            </Campo>
          ))}
        </div>
      </div>
      <Campo etiqueta="Notas y límites personales"><textarea className="entrada" rows={3} value={p.notes.join("\n")} onChange={(e) => poner("notes", e.target.value.split("\n").filter(Boolean))} /></Campo>
      {error ? <p className="nota frambuesa">{error}</p> : null}
      <p className="nota">Las mascotas duermen cuando tú duermes.</p>
      {cambiado ? <Boton onClick={guardar} className="ancho">Guardar perfil</Boton> : null}
    </Seccion>
  );
}
