/* Semana: días con su energía, tracker tipo bullet journal, bloque de batch de 4 días y escalera de emergencia. */
import { useMemo } from "react";
import type { PantallaProps } from "../App";
import { activitiesForDay, energyForDay, shiftIsoDate, slotLabel, todayInTimezone, weekdayFromIso } from "../comemos/engine";
import type { MealSlot } from "../comemos/models";
import { Huellitas, Pildora, Seccion, Titulo } from "../componentes/base";
import { logroDe } from "../juego/motor";
import { PUNTOS } from "../juego/reglas";
import { fechaCorta } from "./Hoy";
import { comidaDecidida, TEXTO_DECISION } from "../decisiones/decisiones";

const LETRAS = ["L", "M", "X", "J", "V", "S", "D"];
const SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];
const lunes = (f: string) => shiftIsoDate(f, 1 - weekdayFromIso(f));

export function Semana({ datos, fecha, setFecha, irA }: PantallaProps) {
  const { plan, juego } = datos;
  const hoy = todayInTimezone(plan.settings.timezone);
  const dias = Array.from({ length: 7 }, (_, i) => shiftIsoDate(lunes(fecha), i));
  const huellitasSemana = juego.logros.filter((l) => dias.includes(l.fecha)).reduce((s, l) => s + l.puntos, 0);

  type Estado = "hecho" | "pendiente" | "libre";
  const estado = (d: string, hecho: boolean): Estado => (hecho ? "hecho" : d >= hoy ? "pendiente" : "libre");
  const filas: { nombre: string; puntos: number; dias: Estado[] }[] = [
    ...SLOTS.map((s) => ({ nombre: slotLabel(s), puntos: PUNTOS.comida, dias: dias.map((d) => estado(d, Boolean(logroDe(juego, d, "comida", s)))) })),
    { nombre: "Gimnasio", puntos: PUNTOS.gimnasio, dias: dias.map((d) => {
      const toca = activitiesForDay(plan, "rali", d).some((a) => a.category === "gym");
      const hecho = Boolean(logroDe(juego, d, "gimnasio"));
      return hecho ? "hecho" : toca && d >= hoy ? "pendiente" : "libre";
    }) },
    { nombre: "Agua", puntos: PUNTOS.agua, dias: dias.map((d) => estado(d, Boolean(logroDe(juego, d, "agua")))) },
  ];

  // Bloque de cocina de 4 días (mismo cálculo que Comemos), solo con las raciones de Rali.
  const ancla = plan.settings.cookCycleAnchor;
  const desfase = Math.round((new Date(`${fecha}T12:00:00Z`).getTime() - new Date(`${ancla}T12:00:00Z`).getTime()) / 86_400_000);
  const inicioBloque = shiftIsoDate(ancla, Math.floor(desfase / 4) * 4);
  const batch = useMemo(() => {
    const g = new Map<string, { nombre: string; gramos: number; raciones: number; slots: Set<string> }>();
    for (let i = 0; i < 4; i++) {
      for (const s of ["lunch", "dinner"] as const) {
        // Solo cuenta lo que se va a comer del batch: si esa comida es pizza, sobras u otra receta, no se cocina.
        const c = comidaDecidida(datos, shiftIsoDate(inicioBloque, i), s);
        if (c.decision.tipo !== "plan" || c.libre) continue;
        // Receta y acompañamiento por separado: son dos cosas que cocinar.
        for (const parte of c.partes) {
          const x = g.get(parte.template.id) ?? { nombre: parte.template.name, gramos: 0, raciones: 0, slots: new Set<string>() };
          x.gramos += parte.grams; x.raciones += 1; x.slots.add(slotLabel(s));
          g.set(parte.template.id, x);
        }
      }
    }
    return [...g.values()];
  }, [datos, inicioBloque]);
  const decididas = (["breakfast", "lunch", "snack", "dinner"] as MealSlot[])
    .map((s) => ({ s, d: datos.decisiones[fecha]?.[s] })).filter((x) => x.d)
    .map((x) => `${slotLabel(x.s)}: ${TEXTO_DECISION[x.d!.tipo].corto.toLowerCase()}`).join(" · ");
  const diasGym = dias.filter((d) => activitiesForDay(plan, "rali", d).some((a) => a.category === "gym"));

  return (
    <div className="pila">
      <Titulo antes="Mi" marcado="semana" texto="Los horarios cambian lo que necesitas; las bases de cocina siguen siendo simples." derecha={<Huellitas n={huellitasSemana} etiqueta="esta semana" />} />

      <div className="semana-dias">
        <button type="button" className="flecha" aria-label="Semana anterior" onClick={() => setFecha(shiftIsoDate(fecha, -7))}>‹</button>
        <div className="semana-dias__lista">
          {dias.map((d, i) => (
            <button key={d} type="button" className="dia" data-activo={d === fecha} data-hoy={d === hoy} onClick={() => setFecha(d)}>
              <span className="etiqueta">{LETRAS[i]}</span>
              <b>{Number(d.slice(-2))}</b>
              <small>{energyForDay(plan, "rali", d).targetKcal}</small>
            </button>
          ))}
        </div>
        <button type="button" className="flecha" aria-label="Semana siguiente" onClick={() => setFecha(shiftIsoDate(fecha, 7))}>›</button>
      </div>

      <button type="button" className="dia-elegido" onClick={() => irA("hoy")}>
        <span className="nota">{fechaCorta(fecha)} · comida</span>
        <b>{comidaDecidida(datos, fecha, "lunch").nombre}</b>
        <span className="nota">cena · <b>{comidaDecidida(datos, fecha, "dinner").nombre}</b></span>
        {decididas ? <span className="nota">{decididas}</span> : null}
        <span className="enlace">ver el día →</span>
      </button>

      <Seccion titulo="Tracker" washi="rosa">
        <div className="rp-tr">
          <table>
            <thead><tr><th />{dias.map((d, i) => <th key={d} className={d === hoy ? "is-hoy" : ""}>{LETRAS[i]}</th>)}</tr></thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.nombre}>
                  <th scope="row">{f.nombre}<small>+{f.puntos}</small></th>
                  {f.dias.map((e, i) => (
                    <td key={i} className={dias[i] === hoy ? "is-hoy" : ""}>
                      {e === "hecho" ? (
                        <span className="rp-tr__hecho"><svg viewBox="0 0 24 24" width="20" height="20" role="img" aria-label="hecho"><path d="M12 8 C12 3 3 3 3 9 C3 14 9 17 12 20 C15 17 21 14 21 9 C21 3 12 3 12 8Z" fill="#F7B3C4" stroke="#3B2E40" strokeWidth="1.8" strokeLinejoin="round" /></svg></span>
                      ) : e === "pendiente" ? <span className="rp-tr__pend" aria-label="pendiente" /> : <span className="rp-tr__libre" aria-label="sin marcar" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nota">Los círculos vacíos son solo días sin marcar. No cuentan en contra de nada.</p>
      </Seccion>

      <Seccion titulo={`Batch · ${fechaCorta(inicioBloque)} – ${fechaCorta(shiftIsoDate(inicioBloque, 3))}`} washi="mantequilla" derecha={<Pildora color="mantequilla">{batch.reduce((s, b) => s + b.raciones, 0)} raciones</Pildora>}>
        <p className="nota">Son solo tus raciones. Guarda dos días en nevera y congela dos.</p>
        <div className="batch">
          {batch.map((b, i) => (
            <article key={b.nombre} className="batch__receta">
              <span className="batch__num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="cuerpo-fuerte">{b.nombre}</h3>
                <p className="nota">≈ {Math.round(b.gramos / 50) * 50} g cocinados · {b.raciones} raciones</p>
                <div className="chips">{[...b.slots].map((s) => <Pildora key={s} color="papel">{s}</Pildora>)}</div>
              </div>
            </article>
          ))}
        </div>
        <ol className="pasos">
          <li><b>Dos ollas, una sesión.</b> Tomate con soja y beans por un lado; curry o guiso por el otro.</li>
          <li><b>Hidrato separado.</b> Arroz en la arrocera o pasta al momento; así la misma salsa cambia de textura.</li>
          <li><b>Porciones etiquetadas.</b> Nombre + gramos en cada táper.</li>
          <li><b>Cubos que salvan cenas.</b> Congela salsa de tomate, curry y crema vegetal en monodosis.</li>
        </ol>
      </Seccion>

      <Seccion titulo="Escalera de emergencia" washi="cielo">
        <p className="nota">Elige el primer nivel que puedas hacer.</p>
        <div className="escalones">
          {[["0 energía", "Plenny ya medido + agua fría"], ["5 minutos", "Arroz congelado + proteína + salsa en cubos"], ["10 minutos", "Huevos + beans + pan + queso"], ["15 minutos", "Noodles + tofu o huevo + guisantes"]].map(([t, c], i) => (
            <div key={t} className="escalon"><span>{i}</span><div><b>{t}</b><p className="nota">{c}</p></div></div>
          ))}
        </div>
        <p className="nota">Mantén pulsada una comida en Hoy y cámbiala por una receta de congelador. Cuenta como comida apuntada.</p>
      </Seccion>

      <Seccion titulo="Días con más carga" washi="lavanda">
        <p className="cuerpo">
          {diasGym.length
            ? `Gimnasio el ${diasGym.map((d) => LETRAS[weekdayFromIso(d) - 1]).join(", ")}. Esos días la merienda se coloca antes del entrenamiento.`
            : "Sin gimnasio programado esta semana. Añádelo en Actividad cuando sepas la hora."}
        </p>
        <p className="nota">La actividad mueve el plan, no lo castiga: una comida muy grande no genera una sesión extra.</p>
      </Seccion>
    </div>
  );
}
