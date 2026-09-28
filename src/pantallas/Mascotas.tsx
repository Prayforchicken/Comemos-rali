/* Mascotas: cuidar, dar chuches, cambiar nombre y aspecto, adoptar a quien llega (al azar)
   y las chuches para Rali que traen los animalitos bien cuidados. */
import { useEffect, useRef, useState } from "react";
import type { PantallaProps } from "../App";
import { Boton, Campo, Confirmar, Hoja, Huellitas, IconoChuche, Necesidades, Seccion, Sprite, Svg, Washi } from "../componentes/base";
import { usePegatina } from "../componentes/Pegatinas";
import { Personalizar } from "../componentes/Personalizar";
import {
  adoptar, animoDe, banar, canjear, cuidadoBien, darChuche, despedir, editarMascota, marcarEntregado, mimar, porAdoptar,
  progresoRegalo, regalosGuardados, siguienteLlegada, TEXTO_ANIMO, verRegalos,
} from "../juego/motor";
import { HORAS_REGALO, multiplicador } from "../juego/reglas";
import type { ChucheId, Especie, Regalo } from "../juego/tipos";
import { CHUCHES, regaloIcono } from "../sprites/chuches.js";
import { fechaCorta } from "./Hoy";
import { Tienda } from "./Tienda";

const UNA: Record<Especie, string> = { gatito: "Un gatito", rata: "Una ratita", mapache: "Un mapache", urraca: "Una urraca" };
const CINTA: Record<Especie, string> = { gatito: "rosa", rata: "lavanda", mapache: "menta", urraca: "cielo" };

/** Texto para avisar a Adrián de que hay que ir a por algo rico. */
async function avisarAdrian(r: Regalo) {
  const texto = `🍬 Rali ha canjeado una chuche que le trajo ${r.quien}. ¡Toca ir a comprarle algo rico!`;
  try {
    if (navigator.share) { await navigator.share({ title: "Chuche canjeada", text: texto }); return "compartido"; }
  } catch { /* cancelado: probamos a copiar */ }
  try { await navigator.clipboard.writeText(texto); return "copiado"; } catch { return "nada"; }
}

export function Mascotas(props: PantallaProps) {
  const { datos, cambiar, ahora, sueno } = props;
  const { juego } = datos;
  const pegatina = usePegatina();
  const m = juego.mascotas.find((x) => x.id === juego.activaId) ?? juego.mascotas[0];
  const [hoja, setHoja] = useState<null | "chuches" | "aspecto" | "nombre" | { adoptar: Especie }>(null);
  const [nombre, setNombre] = useState(m.nombre);
  const [corazones, setCorazones] = useState(0);
  const [canjeando, setCanjeando] = useState<Regalo | null>(null);
  const [recienCanjeado, setRecienCanjeado] = useState<Regalo | null>(null);
  const animo = animoDe(m, ahora, sueno);
  const esperan = porAdoptar(juego);
  const siguiente = siguienteLlegada(juego);
  const inventario = (Object.keys(CHUCHES) as ChucheId[]).filter((c) => (juego.inventario[c] ?? 0) > 0);
  const guardados = regalosGuardados(juego);
  const canjeados = juego.regalos.filter((r) => r.canjeado).slice(-6).reverse();

  // Los regalos nuevos se marcan como vistos al entrar (quedan resaltados mientras sigas aquí).
  const nuevos = useRef(new Set(juego.regalos.filter((r) => !r.visto).map((r) => r.id)));
  useEffect(() => { if (nuevos.current.size) cambiar((d) => ({ ...d, juego: verRegalos(d.juego) })); }, [cambiar]);
  useEffect(() => setNombre(m.nombre), [m.id, m.nombre]);

  const mimo = () => { cambiar((d) => ({ ...d, juego: mimar(d.juego, m.id) })); setCorazones((c) => c + 1); };
  const progreso = progresoRegalo(m);

  return (
    <div className="pila">
      <header className="cabecera">
        <h1 className="titulo">Mis <span className="rp-subrayado">animalitos</span></h1>
        <Huellitas n={juego.huellitas} />
      </header>

      <article className="rp-card rp-card--grande">
        <Washi patron="puntos" color={CINTA[m.especie]} />
        <button type="button" className="rp-card__pet acariciar" onClick={mimo} aria-label={`Acariciar a ${m.nombre}`}>
          <Sprite m={m} animo={animo} tam={210} />
          {corazones > 0 ? <span key={corazones} className="corazon-sube" aria-hidden="true">♥</span> : null}
        </button>
        <header className="rp-card__head">
          <button type="button" className="nombre-editable" onClick={() => setHoja("nombre")} aria-label={`Cambiar el nombre de ${m.nombre}`}>
            <span className="subtitulo">{m.nombre}</span><span className="lapiz" aria-hidden="true">✎</span>
          </button>
          <span className={`rp-chip rp-chip--${animo}`}>{TEXTO_ANIMO[animo]}</span>
        </header>
        <Necesidades n={m.necesidades} />
        <div className="regalo-progreso">
          <Svg html={regaloIcono(34)} />
          <div>
            <p className="nota"><b>Próximo regalo de {m.nombre}</b> · {cuidadoBien(m) ? "¡lo estás cuidando genial!" : "sube todo a 3 puntitos o más"}</p>
            <div className="rp-unlock__bar" style={{ ["--relleno" as string]: "var(--mantequilla)" }}><i style={{ width: `${Math.round(progreso * 100)}%` }} /></div>
          </div>
        </div>
        <div className="acciones">
          <Boton onClick={() => setHoja("chuches")} icono={<IconoChuche id="caramelo" tam={26} />}>Chuche</Boton>
          <Boton variante="menta" onClick={() => { cambiar((d) => ({ ...d, juego: banar(d.juego, m.id) })); pegatina({ motivo: `¡${m.nombre} huele a flores!` }); }}>Bañar</Boton>
          <Boton variante="papel" onClick={mimo}>Mimo</Boton>
        </div>
        <div className="fila fila--centro">
          <button type="button" className="enlace" onClick={() => setHoja("nombre")}>Cambiar nombre</button>
          <button type="button" className="enlace" onClick={() => setHoja("aspecto")}>Cambiar aspecto</button>
        </div>
      </article>

      {juego.mascotas.length > 1 ? (
        <div className="carrusel" role="list">
          {juego.mascotas.map((x) => (
            <button key={x.id} type="button" role="listitem" className="miniatura" data-activa={x.id === m.id} onClick={() => cambiar((d) => ({ ...d, juego: { ...d.juego, activaId: x.id } }))}>
              <Sprite m={x} animo={animoDe(x, ahora, sueno)} tam={72} />
              <span>{x.nombre}</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* ---------- chuches para Rali ---------- */}
      <Seccion titulo="Chuches para ti" washi="mantequilla" derecha={guardados.length ? <span className="pildora" style={{ ["--pildora" as string]: "var(--mantequilla)" }}>{guardados.length}</span> : null}>
        {guardados.length ? (
          <div className="regalos">
            {guardados.map((r) => (
              <div key={r.id} className="regalo" data-nuevo={nuevos.current.has(r.id)}>
                {nuevos.current.has(r.id) ? <Washi patron="rayas" color="rosa">¡nuevo!</Washi> : null}
                <Svg html={regaloIcono(58)} />
                <span className="nota">de <b>{r.quien}</b> · {fechaCorta(r.traido.slice(0, 10))}</span>
                <Boton variante="mantequilla" onClick={() => setCanjeando(r)}>Canjear</Boton>
              </div>
            ))}
          </div>
        ) : (
          <p className="nota">Si mantienes a tus animalitos bien cuidados (todo a 3 puntitos o más) durante unas {HORAS_REGALO} horas, te traen una chuche. Al canjearla, Adrián irá a comprarte algo rico.</p>
        )}
        {canjeados.length ? (
          <ul className="canjeados">
            {canjeados.map((r) => (
              <li key={r.id}>
                <span className="nota">Canjeada el {fechaCorta(r.canjeado!.slice(0, 10))} · de {r.quien}</span>
                <label className="casilla casilla--peque">
                  <input type="checkbox" checked={Boolean(r.entregado)} onChange={(e) => cambiar((d) => ({ ...d, juego: marcarEntregado(d.juego, r.id, e.target.checked) }))} />
                  <span>{r.entregado ? "¡Adrián ya lo trajo!" : "Pendiente de Adrián"}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}
      </Seccion>

      {/* ---------- llegadas (al azar) ---------- */}
      {esperan.map((e, i) => (
        <article key={`${e}-${i}`} className="adopcion">
          <Washi patron="rayas" color="mantequilla">¡sorpresa!</Washi>
          <Sprite m={{ especie: e, pelaje: "", accesorio: "ninguno", nombre: "" }} animo="contento" tam={110} />
          <div>
            <p className="subtitulo">{UNA[e]} ha llegado a casa</p>
            <p className="nota">Quiere quedarse contigo. Cada animalito más sube tu bonus de huellitas.</p>
            <div className="fila fila--envuelve">
              <Boton variante="mantequilla" onClick={() => setHoja({ adoptar: e })}>Adoptar</Boton>
              <button type="button" className="enlace" onClick={() => cambiar((d) => ({ ...d, juego: despedir(d.juego, e) }))}>Ahora no</button>
            </div>
          </div>
        </article>
      ))}

      <div className="rp-unlock">
        <div className="misterio" aria-hidden="true">?</div>
        <div className="rp-unlock__txt">
          <p className="etiqueta">Alguien se asoma…</p>
          <div className="rp-unlock__bar" role="progressbar" aria-valuenow={juego.ganadasTotal} aria-valuemax={siguiente.meta}>
            <i style={{ width: `${Math.min(100, ((juego.ganadasTotal - siguiente.desde) / Math.max(1, siguiente.meta - siguiente.desde)) * 100)}%` }} />
          </div>
          <p className="nota"><Huellitas n={juego.ganadasTotal} /> ganadas en total · faltan <b>{siguiente.falta}</b>. No se sabe quién será.</p>
        </div>
      </div>

      <Tienda {...props} />

      <Seccion titulo="Cómo funciona" washi="lavanda">
        <ul className="lista-bujo">
          <li>Comer <b>lo del plan</b> da +10 huellitas; cualquier otra cosa, +8. El gimnasio +25 y el agua +5.</li>
          <li>Con las huellitas compras chuches para tus animalitos en la tienda.</li>
          <li>Cada cierto número de huellitas ganadas llega un animalito <b>al azar</b>. Gastar huellitas no lo retrasa.</li>
          <li>Cada animalito sube el bonus: ahora es <b>x{multiplicador(juego.mascotas.length).toLocaleString("es-ES")}</b> (máximo x2).</li>
          <li>Si los cuidas bien mucho tiempo te traen <b>chuches para ti</b>. Al canjearlas, Adrián te compra algo rico.</li>
          <li>Nadie se pone malito. Como mucho, se ponen gruñones hasta que les das un mimo.</li>
        </ul>
      </Seccion>

      {/* ---------- hojas ---------- */}
      <Hoja abierta={hoja === "chuches"} cerrar={() => setHoja(null)} titulo={`Chuches para ${m.nombre}`}>
        {inventario.length ? (
          <div className="rp-tienda">
            {inventario.map((c) => (
              <button key={c} type="button" className="rp-tienda__item" onClick={() => {
                if (!darChuche(juego, m.id, c)) return;
                cambiar((d) => ({ ...d, juego: darChuche(d.juego, m.id, c) ?? d.juego }));
                setHoja(null);
                pegatina({ motivo: CHUCHES[c].favorito === m.especie ? `¡Su favorita! ${m.nombre} está encantado` : `${m.nombre}: ñam ñam` });
              }}>
                {CHUCHES[c].favorito === m.especie ? <span className="rp-tienda__fav">♥ favorita</span> : null}
                <IconoChuche id={c} tam={52} />
                <b>{CHUCHES[c].nombre}</b>
                <span className="nota">tienes {juego.inventario[c]}</span>
              </button>
            ))}
          </div>
        ) : <p className="cuerpo">No te quedan chuches.</p>}
        <Boton variante="mantequilla" onClick={() => { setHoja(null); setTimeout(() => document.getElementById("tienda")?.scrollIntoView({ behavior: "smooth" }), 50); }}>Ir a la tienda</Boton>
      </Hoja>

      <Hoja abierta={hoja === "nombre"} cerrar={() => setHoja(null)} titulo="¿Cómo se llama?">
        <Campo etiqueta="Nombre"><input className="entrada" value={nombre} maxLength={16} autoFocus onChange={(e) => setNombre(e.target.value)} /></Campo>
        <div className="hoja__acciones">
          <Boton className="ancho" disabled={!nombre.trim()} onClick={() => {
            cambiar((d) => ({ ...d, juego: editarMascota(d.juego, m.id, { nombre: nombre.trim() }) }));
            setHoja(null); pegatina({ motivo: `¡Hola, ${nombre.trim()}!` });
          }}>Guardar nombre</Boton>
        </div>
      </Hoja>

      <Hoja abierta={hoja === "aspecto"} cerrar={() => setHoja(null)} titulo="Personalizar">
        <Personalizar key={m.id} especie={m.especie} inicial={m} textoBoton="Guardar" alGuardar={(a) => { cambiar((d) => ({ ...d, juego: editarMascota(d.juego, m.id, a) })); setHoja(null); }} />
      </Hoja>

      <Hoja abierta={typeof hoja === "object" && hoja !== null} cerrar={() => setHoja(null)} titulo="¡Bienvenida a casa!">
        {typeof hoja === "object" && hoja !== null ? (
          <Personalizar key={hoja.adoptar} especie={hoja.adoptar} textoBoton="¡Adoptar!" alGuardar={(a) => {
            cambiar((d) => ({ ...d, juego: adoptar(d.juego, hoja.adoptar, a.nombre, a.pelaje, a.accesorio) }));
            setHoja(null);
            pegatina({ motivo: `¡${a.nombre} ya vive contigo!`, extra: `Bonus x${multiplicador(juego.mascotas.length + 1).toLocaleString("es-ES")} desde ahora` });
          }} />
        ) : null}
      </Hoja>

      <Confirmar abierta={Boolean(canjeando)} cerrar={() => setCanjeando(null)} titulo="¿Canjear esta chuche?"
        texto={`Se gasta al canjearla. ${canjeando?.quien ?? ""} te la trajo con cariño: Adrián irá a comprarte algo rico.`} si="¡Canjear!"
        alConfirmar={() => { if (!canjeando) return; const r = canjeando; cambiar((d) => ({ ...d, juego: canjear(d.juego, r.id) })); setCanjeando(null); setRecienCanjeado(r); }} />

      <Hoja abierta={Boolean(recienCanjeado)} cerrar={() => setRecienCanjeado(null)} titulo="¡Canjeada!">
        <div className="centro"><Svg html={regaloIcono(96)} /></div>
        <p className="cuerpo centro">Adrián irá a comprarte algo rico. ¿Se lo dices?</p>
        <div className="hoja__acciones">
          <Boton variante="mantequilla" className="ancho" onClick={async () => {
            if (!recienCanjeado) return;
            const r = await avisarAdrian(recienCanjeado);
            setRecienCanjeado(null);
            pegatina({ motivo: r === "copiado" ? "Mensaje copiado" : r === "compartido" ? "¡Avisado!" : "Díselo tú misma 💕", extra: r === "copiado" ? "Pégaselo a Adrián por WhatsApp" : undefined });
          }}>Avisar a Adrián</Boton>
          <button type="button" className="enlace" onClick={() => setRecienCanjeado(null)}>Ya se lo digo yo</button>
        </div>
      </Hoja>
    </div>
  );
}
