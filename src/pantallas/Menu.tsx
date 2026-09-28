/* Menú: qué receta toca en cada toma (y con qué acompañamiento), el recetario,
   los cheat meals y los alimentos guardados. La ración de cada día la calcula la app
   con el objetivo de energía y el reparto de las comidas. */
import { useMemo, useState } from "react";
import type { PantallaProps } from "../App";
import { slotLabel, todayInTimezone } from "../comemos/engine";
import type { MealSlot, MealTemplate } from "../comemos/models";
import { Boton, Campo, Pastillas, Seccion, Selector, Titulo } from "../componentes/base";
import { usePegatina } from "../componentes/Pegatinas";
import { comidaDecidida, SLOTS } from "../decisiones/decisiones";
import { CATEGORIAS, categoriaDe, menuDe, PARTE_ACOMPANAMIENTO, type Menu as TMenu, type TomaMenu } from "../menu/menu";
import { fechaCorta } from "./Hoy";
import { Alimentos, Cheats, Recetas } from "./Recetario";

type Vista = "toca" | "recetas" | "cheats" | "alimentos";
const VISTAS: { v: Vista; t: string }[] = [{ v: "toca", t: "Lo que toca" }, { v: "recetas", t: "Recetas" }, { v: "cheats", t: "Cheat" }, { v: "alimentos", t: "Alimentos" }];

export function Menu(props: PantallaProps) {
  const [vista, setVista] = useState<Vista>("toca");
  return (
    <div className="pila">
      <Titulo antes="Mi" marcado="menú" texto="Las comidas se hacen con recetas y las recetas con ingredientes (de wger o tuyos). Tú eliges qué toca; la app calcula cuánto." />
      <div className="segmento segmento--ancho" role="tablist">
        {VISTAS.map((x) => <button key={x.v} type="button" role="tab" aria-selected={vista === x.v} data-activa={vista === x.v} onClick={() => setVista(x.v)}>{x.t}</button>)}
      </div>
      {vista === "toca" && <LoQueToca {...props} />}
      {vista === "recetas" && <Recetas {...props} />}
      {vista === "cheats" && <Cheats {...props} />}
      {vista === "alimentos" && <Alimentos {...props} />}
    </div>
  );
}

const PARTES = [{ v: 0.2, t: "Poquito" }, { v: 0.3, t: "Normal" }, { v: 0.4, t: "Mucho" }];
const etiqueta = (t: MealTemplate) => `${CATEGORIAS[categoriaDe(t)].nombre} · ${t.name}`;

function LoQueToca(props: PantallaProps) {
  const { datos, cambiar } = props;
  const pegatina = usePegatina();
  const hoy = todayInTimezone(datos.plan.settings.timezone);
  const actual = menuDe(datos.menus, hoy);
  const [tomas, setTomas] = useState<TMenu["tomas"]>(() => structuredClone(actual?.tomas ?? {}));
  const cambiado = JSON.stringify(tomas) !== JSON.stringify(actual?.tomas ?? {});
  const activas = datos.plan.mealTemplates.filter((t) => t.active && t.kind !== "flex");

  // Vista previa: cómo quedaría hoy con este menú (sin las decisiones de hoy).
  const borrador: TMenu = { id: "borrador", desde: hoy, tomas };
  const previa = useMemo(() => SLOTS.map((s) => comidaDecidida({ ...datos, menus: [borrador], decisiones: {} }, hoy, s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datos, JSON.stringify(tomas), hoy]);

  const poner = (s: MealSlot, t: TomaMenu | undefined) => setTomas((x) => {
    const y = { ...x };
    if (t) y[s] = t; else delete y[s];
    return y;
  });

  const guardar = () => {
    cambiar((d) => ({ ...d, menus: [...d.menus.filter((m) => m.desde !== hoy), { id: `menu-${Date.now().toString(36)}`, desde: hoy, tomas }] }));
    pegatina({ motivo: "Menú guardado", extra: "Vale desde hoy. Los días anteriores no cambian." });
  };

  return (
    <>
      <p className="nota">
        {actual && Object.keys(actual.tomas).length ? `Menú en marcha desde el ${fechaCorta(actual.desde)}.` : "Ahora manda el plan de Comemos (ciclo de batch de 4 días)."}
        {" "}Lo que no elijas aquí sigue saliendo del plan.
      </p>
      {SLOTS.map((s, i) => {
        const t = tomas[s];
        const conAcomp = s === "lunch" || s === "dinner";
        const encajan = activas.filter((x) => x.slots.includes(s));
        const acompanamientos = activas.filter((x) => categoriaDe(x) === "acompanamiento");
        const c = previa[i];
        return (
          <Seccion key={s} titulo={slotLabel(s)} washi={["melocoton", "mantequilla", "lavanda", "cielo"][i]}>
            <Campo etiqueta={conAcomp ? "Receta (el batch)" : "Receta"}>
              <Selector valor={t?.recetaId ?? ""} etiqueta={`Receta de ${slotLabel(s)}`}
                opciones={[{ v: "", t: "Lo que diga el plan" }, ...encajan.map((x) => ({ v: x.id, t: etiqueta(x) }))]}
                alCambiar={(v) => poner(s, v ? { ...t, recetaId: v } : undefined)} />
            </Campo>
            {conAcomp && t ? (
              <>
                <Campo etiqueta="Acompañamiento (hidratos para completar)">
                  <Selector valor={t.acompanamientoId ?? ""} etiqueta={`Acompañamiento de ${slotLabel(s)}`}
                    opciones={[{ v: "", t: acompanamientos.length ? "Sin acompañamiento" : "Sin acompañamiento (crea uno en Recetas)" }, ...acompanamientos.map((x) => ({ v: x.id, t: x.name }))]}
                    alCambiar={(v) => poner(s, { ...t, acompanamientoId: v || undefined })} />
                </Campo>
                {t.acompanamientoId ? (
                  <div className="campo">
                    <span className="nota">Cuánto acompañamiento</span>
                    <Pastillas valor={t.parte ?? PARTE_ACOMPANAMIENTO} opciones={PARTES} alCambiar={(v) => poner(s, { ...t, parte: v })} />
                  </div>
                ) : null}
              </>
            ) : null}
            <p className="nota nota--menta">
              Hoy: {c.partes.map((x) => <span key={x.rol}><b>{x.grams} g</b> de {x.template.shortName.toLowerCase()} </span>)}
              · {c.kcal} kcal · {c.proteinG} g proteína
            </p>
          </Seccion>
        );
      })}
      <div className="hoja__acciones">
        <Boton className="ancho" disabled={!cambiado} onClick={guardar}>{cambiado ? "Guardar menú (desde hoy)" : "Menú guardado"}</Boton>
        {Object.keys(tomas).length ? <button type="button" className="enlace" onClick={() => setTomas({})}>Volver todo al plan de Comemos</button> : null}
      </div>
      <Seccion titulo="Cómo cuenta" washi="rosa">
        <ul className="lista-bujo">
          <li>Comer <b>lo que toca</b> da +10 huellitas, aunque lo ajustes ese día (quitar el pan, el azúcar…).</li>
          <li>Cambiar <b>un batch por otro</b> sigue dando +10: sigues comiendo batch con su acompañamiento.</li>
          <li><b>Sobras</b> del batch de estos días: también +10.</li>
          <li>Cualquier otra receta, comida de congelador, cheat meal u otra cosa: +8.</li>
          <li>En Hoy, <b>mantén pulsada</b> una comida para cambiarla o ajustarla solo para ese día.</li>
        </ul>
        <p className="nota nota--mantequilla">Las raciones salen de tu objetivo del día y del reparto de Ajustes → Mi perfil.</p>
      </Seccion>
    </>
  );
}
