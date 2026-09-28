/* Hoy: energía estimada, margen de maniobra, las 4 comidas con sus gramos, gimnasio y básicos.
   Comer lo del plan, ir al gimnasio y llegar al agua dan huellitas (ver acciones.ts). */
import { useMemo, useState } from "react";
import type { PantallaProps } from "../App";
import { agua, comidaDelPlan, gimnasio, suplemento, type DetalleComida, type Premio } from "../acciones";
import { activitiesForDay, activityCalories, energyForDay, plannedTotals, servingAdjustment, shiftIsoDate, slotLabel, todayInTimezone } from "../comemos/engine";
import { decidir, diaDecidido, TEXTO_DECISION, type ComidaDecidida } from "../decisiones/decisiones";
import { ElegirDecision, type Modo } from "../componentes/ElegirDecision";
import { Bocadillo, Boton, Campo, Hoja, Huellitas, Pastillas, Pildora, Seccion, Sprite, Svg, Washi } from "../componentes/base";
import { usePulsacionLarga } from "../componentes/usePulsacionLarga";
import { fraseDe } from "../juego/frases";
import { CATEGORIAS, categoriaDe } from "../menu/menu";
import { usePegatina } from "../componentes/Pegatinas";
import { animoDe, deshacer, logroDe, regalosSinVer, TEXTO_ANIMO } from "../juego/motor";
import { regaloIcono } from "../sprites/chuches.js";
import { diasSinRespaldo } from "../datos/respaldo";
import { PUNTOS, multiplicador } from "../juego/reglas";

const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export function fechaBonita(f: string) {
  const d = new Date(`${f}T12:00:00`);
  return `${DIAS[(d.getDay() + 6) % 7]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}
export function fechaCorta(f: string) {
  const d = new Date(`${f}T12:00:00`);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
}

export function Hoy({ datos, cambiar, fecha, setFecha, ahora, sueno, energia: energiaRali, irA }: PantallaProps) {
  const { plan, juego } = datos;
  const pegatina = usePegatina();
  const hoy = todayInTimezone(plan.settings.timezone);
  const esFuturo = fecha > hoy;
  const comidas = useMemo(() => diaDecidido(datos, fecha), [datos, fecha]);
  const energia = useMemo(() => energyForDay(plan, "rali", fecha), [plan, fecha]);
  const totales = plannedTotals(comidas);
  const perfil = plan.profiles.rali;
  const actividades = activitiesForDay(plan, "rali", fecha);
  const gym = actividades.find((a) => a.category === "gym");
  const [marcando, setMarcando] = useState<ComidaDecidida | null>(null);
  const [eligiendo, setEligiendo] = useState<{ comida: ComidaDecidida; modo: Modo } | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const mascota = juego.mascotas.find((m) => m.id === juego.activaId) ?? juego.mascotas[0];
  const mult = multiplicador(juego.mascotas.length);

  const celebrar = (premios: Premio[], extraFinal?: string) => {
    premios.forEach((p, i) => pegatina({ puntos: p.puntos, motivo: p.motivo, extra: i === premios.length - 1 && extraFinal ? extraFinal : p.extra }));
    if (!premios.length && extraFinal) pegatina({ motivo: "Registro guardado", extra: extraFinal });
    const nuevas = premios.flatMap((p) => p.nuevas);
    if (nuevas.length) setTimeout(() => pegatina({ motivo: "¡Alguien quiere conocerte!", extra: "Mira en Mascotas" }), 600);
  };

  const aguaHoy = plan.waterLogs[fecha]?.rali ?? 0;
  const suplementos = plan.supplements.filter((s) => s.personId === "rali" && s.enabled);
  const marcados = new Set(plan.dailyChecks[fecha]?.supplements ?? []);
  const logroGym = logroDe(juego, fecha, "gimnasio");
  const animo = mascota ? animoDe(mascota, ahora, sueno) : "contento";

  return (
    <div className="pila">
      <header className="cabecera">
        <div className="navegador-fecha">
          <button type="button" className="flecha" aria-label="Día anterior" onClick={() => setFecha(shiftIsoDate(fecha, -1))}>‹</button>
          <button type="button" className="fecha" onClick={() => setFecha(hoy)}>
            <Washi patron="rayas" color={fecha === hoy ? "rosa" : "lavanda"}>{fecha === hoy ? "hoy" : "ir a hoy"}</Washi>
            <span className="subtitulo">{fechaBonita(fecha)}</span>
          </button>
          <button type="button" className="flecha" aria-label="Día siguiente" onClick={() => setFecha(shiftIsoDate(fecha, 1))}>›</button>
        </div>
        <Huellitas n={juego.huellitas} />
      </header>

      {mascota ? (
        <div className="compi">
          <button type="button" className="compi__pet" onClick={() => setVuelta((v) => v + 1)} aria-label={`${mascota.nombre}: que diga otra cosa`}>
            <Sprite m={mascota} animo={animo} tam={112} />
          </button>
          <span className="compi__txt">
            <Bocadillo lado="izquierda">{fraseDe(mascota, { animo, hora: ahora.getHours(), energia: energiaRali.valor, amanecio: energiaRali.amanecio }, vuelta)}</Bocadillo>
            <span className="fila fila--envuelve">
              <button type="button" className="enlace" onClick={() => irA("mascotas")}><b>{mascota.nombre}</b></button>
              <span className={`rp-chip rp-chip--${animo}`}>{TEXTO_ANIMO[animo]}</span>
            </span>
            <span className="nota">Lo que toca: <b className="frambuesa">+{Math.round(PUNTOS.comida * mult)}</b> · otra cosa: +{Math.round(PUNTOS.comidaOtra * mult)}{mult > 1 ? ` (x${mult.toLocaleString("es-ES")})` : ""}</span>
          </span>
        </div>
      ) : null}

      {regalosSinVer(juego).length ? (
        <button type="button" className="regalo-aviso" onClick={() => irA("mascotas")}>
          <Svg html={regaloIcono(56)} />
          <span><b className="subtitulo">¡{regalosSinVer(juego)[0].quien} te ha traído algo!</b><span className="nota">Por cuidarle tan bien. Míralo en Mascotas.</span></span>
        </button>
      ) : null}

      {(() => {
        const dias = diasSinRespaldo();
        const hayQuePerder = juego.logros.length >= 10 || Object.keys(datos.diario).length >= 2;
        return hayQuePerder && (dias === null || dias > 7) ? (
          <button type="button" className="aviso-copia" onClick={() => irA("ajustes")}>
            {dias === null ? "Aún no tienes copia de seguridad." : `Hace ${dias} días de tu última copia.`} <b>Guardar una →</b>
          </button>
        ) : null;
      })()}

      {/* ---------- energía del día ---------- */}
      <section className="energia">
        <div className="energia__cab">
          <div>
            <p className="nota">Objetivo estimado</p>
            <p className="numero">{energia.targetKcal}<small> kcal</small></p>
          </div>
          <Pildora color={actividades.length ? "menta" : "lavanda"}>
            {actividades.length ? `${actividades.length} ${actividades.length === 1 ? "actividad" : "actividades"}` : "día tranquilo"}
          </Pildora>
        </div>
        <dl className="macros">
          <div><dt>Plan</dt><dd>{Math.round(totales.kcal)}</dd></div>
          <div><dt>Proteína</dt><dd>{totales.proteinG}<small>/{perfil.proteinTargetG} g</small></dd></div>
          <div><dt>Fibra</dt><dd>{totales.fibreG}<small>/{perfil.fibreTargetG} g</small></dd></div>
        </dl>
        {actividades.length ? (
          <ul className="actividades-hoy">
            {actividades.map((a) => <li key={a.id}><b>{a.label}</b> {a.start}–{a.end} · +{Math.round(activityCalories(a, perfil))}</li>)}
          </ul>
        ) : null}
        <div className="fila nota"><span>Basal + vida: {energia.baseLiving} kcal</span><span>Actividad: +{energia.activityKcal}</span></div>
      </section>

      {/* ---------- comidas ---------- */}
      <div className="seccion__cab">
        <h2 className="etiqueta"><span className="rp-subrayado">Lo que toca y cuánto</span></h2>
        <Pildora color="rosa">4 tomas</Pildora>
      </div>
      <p className="nota">Cada comida se decide por separado: <b>mantén pulsada</b> una comida (o toca “Cambiar”) para cambiarla o ajustarla solo hoy. Lo que toca da <b>+{Math.round(PUNTOS.comida * mult)}</b>; otras opciones, <b>+{Math.round(PUNTOS.comidaOtra * mult)}</b>.</p>
      <div className="pila">
        {comidas.map((c) => (
          <TarjetaComida key={c.slot} c={c} logro={logroDe(juego, fecha, "comida", c.slot)} esFuturo={esFuturo} mult={mult}
            alCambiar={(modo) => setEligiendo({ comida: c, modo })}
            alComer={() => setMarcando(c)}
            alDesmarcar={(id) => cambiar((d) => {
              let j = deshacer(d.juego, id);
              const dc = logroDe(j, fecha, "dia-completo");
              if (dc) j = deshacer(j, dc.id);
              return { ...d, juego: j };
            })} />
        ))}
      </div>

      {/* ---------- gimnasio ---------- */}
      <Seccion titulo="Gimnasio" washi="menta">
        <div className="fila">
          <p className="cuerpo">{gym ? `Hoy toca ${gym.label.toLowerCase()} de ${gym.start} a ${gym.end}.` : "Hoy no hay gimnasio en el plan. Si vas igualmente, también cuenta."}</p>
          {logroGym ? <span className="hecho__sello">¡Hecho! +{logroGym.puntos}</span> : !esFuturo ? (
            <Boton variante="mantequilla" onClick={() => { const r = gimnasio(datos, fecha); cambiar(() => r.datos); celebrar(r.premios); }}>¡He ido!</Boton>
          ) : null}
        </div>
        {gym?.trainingPlan ? <p className="plan-sesion">{gym.trainingPlan}</p> : null}
        {gym ? <p className="nota">La merienda se coloca antes del entrenamiento para llegar con energía.</p> : null}
      </Seccion>

      {/* ---------- básicos ---------- */}
      <Seccion titulo="Básicos" washi="cielo">
        <p className="nota">Agua y recordatorios, sin perfeccionismo.</p>
        <div className="fila">
          <div className="agua">
            <p className="cuerpo-fuerte">Agua · {aguaHoy} / {perfil.waterTargetMl} ml</p>
            <div className="rp-unlock__bar"><i style={{ width: `${Math.min(100, (aguaHoy / perfil.waterTargetMl) * 100)}%` }} /></div>
          </div>
          <Boton variante="papel" onClick={() => { const r = agua(datos, fecha, 250); cambiar(() => r.datos); celebrar(r.premios); }}>+250 ml</Boton>
        </div>
        {suplementos.map((s) => (
          <label key={s.id} className="casilla">
            <input type="checkbox" checked={marcados.has(s.id)} onChange={(e) => cambiar((d) => suplemento(d, fecha, s.id, e.target.checked))} />
            <span><b>{s.label}</b><small>{s.note}</small></span>
          </label>
        ))}
      </Seccion>

      <MarcarComida comida={marcando} cerrar={() => setMarcando(null)} alGuardar={(x) => {
        if (!marcando) return;
        // Solo se aprende de las raciones calculadas (no de lo libre ni de lo ajustado a mano).
        const r = comidaDelPlan(datos, fecha, marcando, { ...x, registrar: !marcando.libre && !marcando.ajustada }, marcando.bonus);
        const aprendido = servingAdjustment(r.datos.plan.feedback, "rali", marcando.slot, marcando.template.id).note;
        cambiar(() => r.datos);
        setMarcando(null);
        celebrar(r.premios, aprendido ?? undefined);
      }} />

      <ElegirDecision eleccion={eligiendo} fecha={fecha} mult={mult} irAMenu={() => irA("menu")}
        despensa={{ ...datos, alGuardarAlimento: (a) => cambiar((d) => ({ ...d, alimentos: { ...d.alimentos, [a.id]: a } })) }}
        cerrar={() => setEligiendo(null)} alElegir={(decision) => {
          if (!eligiendo) return;
          const slot = eligiendo.comida.slot;
          cambiar((d) => ({ ...d, decisiones: decidir(d.decisiones, fecha, slot, decision) }));
          setEligiendo(null);
        }} />
    </div>
  );
}

/** Una comida del día. Mantener pulsada abre las opciones para cambiarla. */
function TarjetaComida({ c, logro, esFuturo, mult, alCambiar, alComer, alDesmarcar }: {
  c: ComidaDecidida; logro: ReturnType<typeof logroDe>; esFuturo: boolean; mult: number;
  alCambiar: (m: Modo) => void; alComer: () => void; alDesmarcar: (logroId: string) => void;
}) {
  const pulsar = usePulsacionLarga(() => alCambiar("inicio"));
  const puntos = Math.round((c.bonus ? PUNTOS.comida : PUNTOS.comidaOtra) * mult);
  const tipo = TEXTO_DECISION[c.decision.tipo];
  const cat = c.libre ? null : categoriaDe(c.partes[0].template);
  return (
    <article className="comida" data-hecha={Boolean(logro)} data-decision={c.decision.tipo} {...pulsar}>
      <div className="comida__hora"><span className="etiqueta">{c.time}</span></div>
      <div className="comida__cuerpo">
        <p className="comida__slot">{slotLabel(c.slot)}{cat === "batch" || cat === "congelador" ? <em>{CATEGORIAS[cat].nombre.toLowerCase()}</em> : null}</p>
        <div className="fila fila--envuelve fila--izq">
          <Pildora color={tipo.color}>{tipo.corto}{c.ajustada ? " · ajustada hoy" : ""}</Pildora>
          <Pildora color={c.bonus ? "menta" : "papel"}>+{puntos}{c.bonus ? "" : " · sin bonus"}</Pildora>
        </div>
        <h3 className="comida__nombre">{c.libre ? c.template.name : c.nombre}</h3>
        {c.partes.length > 1 ? (
          <ul className="partes">
            {c.partes.map((x) => <li key={x.rol}><b>{x.grams} g</b> {x.template.shortName.toLowerCase()}{x.rol === "acompanamiento" ? <small className="nota"> · acompañamiento</small> : null}</li>)}
          </ul>
        ) : null}
        {c.libre && !c.items.length && c.decision.tipo !== "cheat" ? (
          <p className="comida__racion">Sin apuntar · cuenta como <b className="frambuesa">~{c.kcal}</b> kcal</p>
        ) : c.decision.tipo === "cheat" ? (
          <p className="comida__racion">Sin pesar · <b>~{c.kcal}</b> kcal aproximadas</p>
        ) : (
          <p className="comida__racion">{c.partes.length > 1 ? null : <><b>{c.grams} g</b> · </>}{c.kcal} kcal · {c.proteinG} g proteína · {c.fibreG} g fibra</p>
        )}
        {c.addOn ? <p className="nota">+ {c.addOn}</p> : null}
        {c.learningNote ? <p className="nota nota--menta">{c.learningNote}</p> : null}
        {c.scenarioNote ? <p className="nota nota--mantequilla">{c.scenarioNote}</p> : null}
        {c.libre && c.items.length ? (
          <ul className="lista-bujo lista-bujo--peque">{c.items.map((i, k) => <li key={k}>{i.gramos} g {i.nombre} · {Math.round((i.n.kcal * i.gramos) / 100)} kcal</li>)}</ul>
        ) : c.libre && c.decision.tipo === "otra" ? (
          <button type="button" className="enlace enlace--izq" onClick={() => alCambiar("otra")}>Apuntar qué y cuánto</button>
        ) : null}
        {!c.libre ? (
          <details className="receta">
            <summary>{c.ajustada ? "Lo que comes hoy" : "Ingredientes y preparación"}</summary>
            {c.partes.map((x) => (
              <div key={x.rol}>
                {c.partes.length > 1 ? <p className="cuerpo-fuerte">{x.template.shortName}</p> : null}
                <ul>{(x.items ? x.items.map((i) => `${i.gramos} g ${i.nombre}`) : x.template.ingredients).map((i) => <li key={i}>{i}</li>)}</ul>
                {x.template.instructions ? <p>{x.template.instructions}</p> : null}
              </div>
            ))}
          </details>
        ) : null}
        {logro ? (
          <div className="hecho">
            <span className="hecho__sello">¡Hecho! +{logro.puntos}</span>
            <button type="button" className="enlace" onClick={() => alDesmarcar(logro.id)}>desmarcar</button>
          </div>
        ) : (
          <div className="fila fila--envuelve fila--izq">
            {!esFuturo ? <Boton variante="menta" onClick={alComer}>¡Me lo he comido!</Boton> : null}
            <Boton variante="papel" onClick={() => alCambiar("inicio")}>Cambiar</Boton>
          </div>
        )}
      </div>
    </article>
  );
}

const CANTIDADES = [{ v: 100, t: "Todo" }, { v: 75, t: "Casi todo" }, { v: 50, t: "La mitad" }, { v: 25, t: "Un poquito" }];
const HAMBRE = [{ v: 1, t: "Llena" }, { v: 2, t: "Bien" }, { v: 3, t: "Normal" }, { v: 4, t: "Con hambre" }, { v: 5, t: "Mucha hambre" }];
const RICO = [{ v: 1, t: "No repetir" }, { v: 2, t: "Meh" }, { v: 3, t: "Bien" }, { v: 4, t: "Rico" }, { v: 5, t: "¡Riquísimo!" }];

type Marcado = Omit<DetalleComida, "registrar">;

function MarcarComida({ comida, cerrar, alGuardar }: { comida: ComidaDecidida | null; cerrar: () => void; alGuardar: (x: Marcado) => void }) {
  return (
    <Hoja abierta={Boolean(comida)} cerrar={cerrar} titulo={comida ? `${slotLabel(comida.slot)}: ${comida.libre ? comida.template.shortName : comida.nombre}` : ""}>
      {comida ? <FormComida key={`${comida.slot}-${comida.template.id}`} gramos={comida.partes[0].grams} libre={comida.libre || comida.ajustada} alGuardar={alGuardar} /> : null}
    </Hoja>
  );
}

function FormComida({ gramos, libre, alGuardar }: { gramos: number; libre: boolean; alGuardar: (x: Marcado) => void }) {
  const [comido, setComido] = useState(100);
  const [hambre, setHambre] = useState(2);
  const [rico, setRico] = useState(4);
  const [servido, setServido] = useState(String(gramos));
  const [nota, setNota] = useState("");
  const [detalle, setDetalle] = useState(false);
  return (
    <>
      <p className="cuerpo">{libre ? "¡Que aproveche! Aquí no hay que pesar nada: solo cobra tus huellitas." : "Cuenta aunque no te lo termines. Esto sirve para ajustar las raciones poco a poco."}</p>
      {libre ? null : <div className="campo"><span className="etiqueta">¿Cuánto te has comido?</span><Pastillas valor={comido} opciones={CANTIDADES} alCambiar={setComido} /></div>}
      <div className="campo"><span className="etiqueta">¿Y después?</span><Pastillas valor={hambre} opciones={HAMBRE} alCambiar={setHambre} /></div>
      <div className="campo"><span className="etiqueta">¿Qué tal estaba?</span><Pastillas valor={rico} opciones={RICO} alCambiar={setRico} /></div>
      {libre ? null : detalle ? (
        <>
          <Campo etiqueta="Cantidad servida (g)"><input className="entrada" type="number" inputMode="numeric" min={1} max={2000} value={servido} onChange={(e) => setServido(e.target.value)} /></Campo>
          <Campo etiqueta="Nota (opcional)"><textarea className="entrada" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: demasiada pasta, la salsa sí gustó…" /></Campo>
        </>
      ) : <button type="button" className="enlace" onClick={() => setDetalle(true)}>Añadir gramos servidos o una nota</button>}
      {libre ? null : <p className="nota nota--menta">Una comida que no se termina no cambia nada. Dos de las tres últimas raciones claramente grandes activan un ajuste pequeño del 5 %.</p>}
      <div className="hoja__acciones">
        <Boton onClick={() => alGuardar({ servido: Number(servido) || gramos, comido, hambre, rico, nota })} className="ancho">Guardar y cobrar huellitas</Boton>
      </div>
    </>
  );
}
