/* Mascotas: cuidar, dar chuches, personalizar y adoptar nuevas. */
import { useState } from "react";
import type { PantallaProps } from "../App";
import { Boton, Hoja, Huellitas, IconoChuche, Necesidades, Seccion, Sprite, Washi } from "../componentes/base";
import { usePegatina } from "../componentes/Pegatinas";
import { Personalizar } from "../componentes/Personalizar";
import { adoptar, animoDe, banar, darChuche, editarMascota, mimar, porAdoptar, siguienteDesbloqueo, TEXTO_ANIMO } from "../juego/motor";
import { multiplicador } from "../juego/reglas";
import type { ChucheId, Especie } from "../juego/tipos";
import { CHUCHES } from "../sprites/chuches.js";
import { Tienda } from "./Tienda";

const NOMBRE_ESPECIE: Record<Especie, string> = { gatito: "gatito", rata: "ratita", mapache: "mapache", urraca: "urraca" };
const CINTA: Record<Especie, string> = { gatito: "rosa", rata: "lavanda", mapache: "menta", urraca: "cielo" };

export function Mascotas(props: PantallaProps) {
  const { datos, cambiar, ahora, sueno } = props;
  const { juego } = datos;
  const pegatina = usePegatina();
  const m = juego.mascotas.find((x) => x.id === juego.activaId) ?? juego.mascotas[0];
  const [hoja, setHoja] = useState<null | "chuches" | "editar" | { adoptar: Especie }>(null);
  const [corazones, setCorazones] = useState(0);
  const animo = animoDe(m, ahora, sueno);
  const nuevas = porAdoptar(juego);
  const siguiente = siguienteDesbloqueo(juego);
  const inventario = (Object.keys(CHUCHES) as ChucheId[]).filter((c) => (juego.inventario[c] ?? 0) > 0);

  const mimo = () => { cambiar((d) => ({ ...d, juego: mimar(d.juego, m.id) })); setCorazones((c) => c + 1); };

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
          <h2 className="subtitulo">{m.nombre}</h2>
          <span className={`rp-chip rp-chip--${animo}`}>{TEXTO_ANIMO[animo]}</span>
        </header>
        <Necesidades n={m.necesidades} />
        <div className="acciones">
          <Boton onClick={() => setHoja("chuches")} icono={<IconoChuche id="caramelo" tam={26} />}>Chuche</Boton>
          <Boton variante="menta" onClick={() => { cambiar((d) => ({ ...d, juego: banar(d.juego, m.id) })); pegatina({ motivo: `¡${m.nombre} huele a flores!` }); }}>Bañar</Boton>
          <Boton variante="papel" onClick={mimo}>Mimo</Boton>
        </div>
        <button type="button" className="enlace" onClick={() => setHoja("editar")}>Cambiar nombre o aspecto</button>
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

      {nuevas.map((e) => (
        <article key={e} className="adopcion">
          <Washi patron="rayas" color="mantequilla">¡nuevo!</Washi>
          <Sprite m={{ especie: e, pelaje: "", accesorio: "ninguno", nombre: "" }} animo="contento" tam={110} />
          <div>
            <p className="subtitulo">Una {NOMBRE_ESPECIE[e]} quiere conocerte</p>
            <p className="nota">Con tus huellitas ganadas has abierto la puerta a alguien nuevo.</p>
            <Boton variante="mantequilla" onClick={() => setHoja({ adoptar: e })}>Adoptar</Boton>
          </div>
        </article>
      ))}

      {siguiente ? (
        <div className="rp-unlock">
          <div className="rp-unlock__sil">
            <Sprite m={{ especie: siguiente.especie, pelaje: "", accesorio: "ninguno", nombre: "" }} animo="contento" tam={96} />
            <span className="interrogante">?</span>
          </div>
          <div className="rp-unlock__txt">
            <p className="etiqueta">Alguien se asoma…</p>
            <div className="rp-unlock__bar" role="progressbar" aria-valuenow={juego.ganadasTotal} aria-valuemax={siguiente.meta}>
              <i style={{ width: `${Math.min(100, ((juego.ganadasTotal - siguiente.desde) / Math.max(1, siguiente.meta - siguiente.desde)) * 100)}%` }} />
            </div>
            <p className="nota"><Huellitas n={juego.ganadasTotal} /> ganadas en total · faltan <b>{siguiente.falta}</b></p>
          </div>
        </div>
      ) : null}

      <Tienda {...props} />

      <Seccion titulo="Cómo funciona" washi="lavanda">
        <ul className="lista-bujo">
          <li>Comer lo del plan, ir al gimnasio y beber tu agua dan huellitas.</li>
          <li>Cada animalito que adoptas sube el bonus: ahora mismo es <b>x{multiplicador(juego.mascotas.length).toLocaleString("es-ES")}</b>.</li>
          <li>Gastar huellitas en chuches no retrasa a los animalitos nuevos: cuentan las ganadas en total.</li>
          <li>Nadie se pone malito. Como mucho, se ponen gruñones hasta que les das un mimo.</li>
        </ul>
      </Seccion>

      <Hoja abierta={hoja === "chuches"} cerrar={() => setHoja(null)} titulo={`Chuches para ${m.nombre}`}>
        {inventario.length ? (
          <div className="rp-tienda">
            {inventario.map((c) => (
              <button key={c} type="button" className="rp-tienda__item" onClick={() => {
                const j = darChuche(juego, m.id, c);
                if (!j) return;
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
        ) : (
          <p className="cuerpo">No te quedan chuches.</p>
        )}
        <Boton variante="mantequilla" onClick={() => { setHoja(null); setTimeout(() => document.getElementById("tienda")?.scrollIntoView({ behavior: "smooth" }), 50); }}>Ir a la tienda</Boton>
      </Hoja>

      <Hoja abierta={hoja === "editar"} cerrar={() => setHoja(null)} titulo="Personalizar">
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
    </div>
  );
}
