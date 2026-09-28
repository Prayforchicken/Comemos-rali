/* Mi día: diario personal de emociones y de lo que ha pasado. No da ni quita huellitas. */
import { useState } from "react";
import type { PantallaProps } from "../App";
import { shiftIsoDate, todayInTimezone } from "../comemos/engine";
import { Boton, Campo, Confirmar, Hoja, Pildora, Seccion, Sprite } from "../componentes/base";
import { usePegatina } from "../componentes/Pegatinas";
import { EMOCIONES, NIVELES, type EntradaDiario } from "../diario/tipos";
import { animoDe } from "../juego/motor";
import type { Animo } from "../juego/tipos";
import { fechaBonita } from "./Hoy";

const nuevoId = () => `diario-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const ANIMO_NIVEL: Animo[] = ["triste", "sucio", "contento", "contento", "feliz"];
const colorEmocion = (id: string) => EMOCIONES.find((e) => e.id === id)?.color ?? "papel";
const textoEmocion = (id: string) => EMOCIONES.find((e) => e.id === id)?.t ?? id;

function Corazones({ n, tam = 18 }: { n: number; tam?: number }) {
  return (
    <span className="corazones" aria-label={`${n} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" width={tam} height={tam} aria-hidden="true">
          <path d="M12 8 C12 3 3 3 3 9 C3 14 9 17 12 20 C15 17 21 14 21 9 C21 3 12 3 12 8Z" fill={i < n ? "var(--rosa)" : "none"} stroke="var(--tinta)" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

export function MiDia({ datos, cambiar, fecha, setFecha, ahora, sueno }: PantallaProps) {
  const pegatina = usePegatina();
  const hoy = todayInTimezone(datos.plan.settings.timezone);
  const entradas = datos.diario[fecha] ?? [];
  const [editando, setEditando] = useState<EntradaDiario | null>(null);
  const [borrando, setBorrando] = useState<EntradaDiario | null>(null);
  const mascota = datos.juego.mascotas.find((m) => m.id === datos.juego.activaId) ?? datos.juego.mascotas[0];
  const semana = Array.from({ length: 7 }, (_, i) => shiftIsoDate(fecha, i - 6));

  const guardar = (e: EntradaDiario) => {
    cambiar((d) => {
      const lista = d.diario[fecha] ?? [];
      const nueva = lista.some((x) => x.id === e.id) ? lista.map((x) => (x.id === e.id ? e : x)) : [...lista, e];
      return { ...d, diario: { ...d.diario, [fecha]: nueva } };
    });
    pegatina({ motivo: mascota ? `${mascota.nombre} lo ha leído` : "Guardado", extra: "Gracias por contármelo 💕" });
  };
  const borrar = (e: EntradaDiario) => cambiar((d) => {
    const lista = (d.diario[fecha] ?? []).filter((x) => x.id !== e.id);
    const diario = { ...d.diario };
    if (lista.length) diario[fecha] = lista; else delete diario[fecha];
    return { ...d, diario };
  });

  return (
    <>
      <div className="navegador-fecha navegador-fecha--centro">
        <button type="button" className="flecha" aria-label="Día anterior" onClick={() => setFecha(shiftIsoDate(fecha, -1))}>‹</button>
        <button type="button" className="fecha" onClick={() => setFecha(hoy)}><span className="subtitulo">{fecha === hoy ? "Hoy" : fechaBonita(fecha)}</span></button>
        <button type="button" className="flecha" aria-label="Día siguiente" onClick={() => setFecha(shiftIsoDate(fecha, 1))}>›</button>
      </div>

      <Formulario key={`${fecha}-${entradas.length}`} mascota={mascota ? { ...mascota, animo: animoDe(mascota, ahora, sueno) } : null} alGuardar={(e) => guardar(e)} />

      <Seccion titulo={fecha === hoy ? "Lo de hoy" : "Lo de ese día"} washi="rosa" derecha={entradas.length ? <Pildora color="rosa">{entradas.length}</Pildora> : null}>
        {entradas.length ? entradas.map((e) => (
          <article key={e.id} className="entrada-diario">
            <div className="fila">
              <span className="etiqueta">{hora(e.creada)}</span>
              <Corazones n={e.nivel} />
            </div>
            {e.emociones.length ? <div className="chips">{e.emociones.map((x) => <Pildora key={x} color={colorEmocion(x)}>{textoEmocion(x)}</Pildora>)}</div> : null}
            {e.texto ? <p className="cuerpo entrada-diario__texto">{e.texto}</p> : null}
            <div className="regla__acciones">
              <button type="button" className="enlace" onClick={() => setEditando(e)}>Editar</button>
              <button type="button" className="enlace frambuesa" onClick={() => setBorrando(e)}>Borrar</button>
            </div>
          </article>
        )) : <p className="nota">Aún no has escrito nada este día. Puedes apuntar varias cosas a lo largo del día.</p>}
      </Seccion>

      <Seccion titulo="Tu semana" washi="lavanda">
        <div className="semana-animo">
          {semana.map((d) => {
            const l = datos.diario[d] ?? [];
            const media = l.length ? Math.round(l.reduce((s, x) => s + x.nivel, 0) / l.length) : 0;
            return (
              <button key={d} type="button" className="semana-animo__dia" data-activo={d === fecha} onClick={() => setFecha(d)}>
                <span className="nota">{["L", "M", "X", "J", "V", "S", "D"][(new Date(`${d}T12:00:00`).getDay() + 6) % 7]}</span>
                <i data-nivel={media} />
                <small>{l.length || ""}</small>
              </button>
            );
          })}
        </div>
        <p className="nota">El color es la media de cómo te sentiste. Solo lo ves tú: se guarda en el móvil y en tus copias de seguridad.</p>
      </Seccion>

      <Hoja abierta={Boolean(editando)} cerrar={() => setEditando(null)} titulo="Editar apunte">
        {editando ? <Formulario key={editando.id} inicial={editando} mascota={null} alGuardar={(e) => { guardar(e); setEditando(null); }} /> : null}
      </Hoja>
      <Confirmar abierta={Boolean(borrando)} cerrar={() => setBorrando(null)} titulo="¿Borrar este apunte?" texto="No se puede recuperar (salvo desde una copia de seguridad)." si="Borrar" alConfirmar={() => { if (borrando) borrar(borrando); setBorrando(null); }} />
    </>
  );
}

function Formulario({ inicial, mascota, alGuardar }: {
  inicial?: EntradaDiario;
  mascota: (Parameters<typeof Sprite>[0]["m"] & { animo: Animo }) | null;
  alGuardar: (e: EntradaDiario) => void;
}) {
  const [nivel, setNivel] = useState(inicial?.nivel ?? 0);
  const [emociones, setEmociones] = useState<string[]>(inicial?.emociones ?? []);
  const [texto, setTexto] = useState(inicial?.texto ?? "");
  const listo = nivel > 0 || emociones.length > 0 || texto.trim();
  return (
    <section className="diario-form">
      {mascota ? (
        <div className="diario-form__cab">
          <Sprite m={mascota} animo={nivel ? ANIMO_NIVEL[nivel - 1] : mascota.animo} tam={84} />
          <p className="subtitulo">¿Cómo estás?</p>
        </div>
      ) : null}
      <div className="niveles" role="radiogroup" aria-label="Cómo te sientes">
        {NIVELES.map((t, i) => (
          <button key={t} type="button" role="radio" aria-checked={nivel === i + 1} className="nivel" data-activa={nivel === i + 1} data-nivel={i + 1} onClick={() => setNivel(i + 1)}>
            <Corazones n={i + 1} tam={11} /><span>{t}</span>
          </button>
        ))}
      </div>
      <div className="campo">
        <span className="etiqueta">Me siento…</span>
        <div className="opciones">
          {EMOCIONES.map((e) => {
            const on = emociones.includes(e.id);
            return <button key={e.id} type="button" className="opcion opcion--emocion" data-activa={on} style={{ ["--op" as string]: `var(--${e.color})` }} onClick={() => setEmociones(on ? emociones.filter((x) => x !== e.id) : [...emociones, e.id])}>{e.t}</button>;
          })}
        </div>
      </div>
      <Campo etiqueta="¿Qué ha pasado?"><textarea className="entrada" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Lo bueno, lo malo, lo que quieras recordar…" /></Campo>
      <Boton className="ancho" disabled={!listo} onClick={() => {
        alGuardar({ id: inicial?.id ?? nuevoId(), creada: inicial?.creada ?? new Date().toISOString(), nivel: nivel || 3, emociones, texto: texto.trim() });
        if (!inicial) { setNivel(0); setEmociones([]); setTexto(""); }
      }}>{inicial ? "Guardar cambios" : "Guardar en mi diario"}</Boton>
    </section>
  );
}
