/* Tienda de chuches: se pagan con huellitas. Se muestra al final de la pantalla Mascotas. */
import type { PantallaProps } from "../App";
import { Boton, Huellitas, IconoChuche, IconoHuellita, Seccion } from "../componentes/base";
import { usePegatina } from "../componentes/Pegatinas";
import { comprar } from "../juego/motor";
import { EFECTO_CHUCHE } from "../juego/reglas";
import type { ChucheId } from "../juego/tipos";
import { CHUCHES } from "../sprites/chuches.js";

const QUIEN: Record<string, string> = { gatito: "gatito", rata: "ratita", mapache: "mapache", urraca: "urraca", cuervo: "cuervo" };

export function Tienda({ datos, cambiar }: PantallaProps) {
  const { juego } = datos;
  const pegatina = usePegatina();
  return (
    <div className="pila">
      <header className="cabecera" id="tienda">
        <h2 className="subtitulo">Tienda de <span className="rp-subrayado">chuches</span></h2>
        <Huellitas n={juego.huellitas} />
      </header>
      <div className="tienda">
        {(Object.keys(CHUCHES) as ChucheId[]).map((c) => {
          const info = CHUCHES[c];
          const falta = info.precio - juego.huellitas;
          return (
            <article key={c} className="rp-tienda__item tienda__item">
              {info.favorito ? <span className="rp-tienda__fav">♥ {QUIEN[info.favorito]}</span> : null}
              <IconoChuche id={c} tam={60} />
              <b>{info.nombre}</b>
              <span className="nota">+{EFECTO_CHUCHE[c].hambre} tripita · tienes {juego.inventario[c] ?? 0}</span>
              <Boton variante="mantequilla" disabled={falta > 0} icono={<IconoHuellita tam={20} />} onClick={() => {
                const j = comprar(juego, c);
                if (!j) return;
                cambiar((d) => ({ ...d, juego: comprar(d.juego, c) ?? d.juego }));
                pegatina({ motivo: `${info.nombre} a la mochila` });
              }}>{info.precio}</Boton>
              {falta > 0 ? <span className="nota">te faltan {falta}</span> : null}
            </article>
          );
        })}
      </div>
      <Seccion titulo="Para que cuadre" washi="menta">
        <p className="cuerpo">Cada animalito come unas dos chuches al día. Con tres comidas del plan ya te sobra para mimarlo; lo demás es para caprichos o para ahorrar.</p>
      </Seccion>
    </div>
  );
}
