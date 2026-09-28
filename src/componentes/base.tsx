/* Piezas pequeñas reutilizables. Replican los componentes del sistema de diseño. */
import { useEffect, type ReactNode } from "react";
import { chuche, huellitaIcono } from "../sprites/chuches.js";
import { mascota as dibujarMascota } from "../sprites/mascotas.js";
import type { Animo, ChucheId, Mascota, Necesidad, Necesidades as TNec } from "../juego/tipos";

/** Pinta un SVG generado como texto. */
export function Svg({ html, className }: { html: string; className?: string }) {
  return <span className={`svg ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Sprite({ m, animo, tam = 160 }: { m: Pick<Mascota, "especie" | "pelaje" | "accesorio" | "nombre">; animo: Animo; tam?: number }) {
  return <Svg className="sprite" html={dibujarMascota({ ...m, animo, tam })} />;
}

export const IconoChuche = ({ id, tam = 48 }: { id: ChucheId; tam?: number }) => <Svg html={chuche(id, tam)} />;
export const IconoHuellita = ({ tam = 22 }: { tam?: number }) => <Svg html={huellitaIcono(tam)} />;

export function Huellitas({ n, etiqueta }: { n: number; etiqueta?: string }) {
  return (
    <span className="rp-huellitas">
      <IconoHuellita />
      <b>{n}</b>
      {etiqueta ? <small>{etiqueta}</small> : null}
    </span>
  );
}

export function Washi({ patron = "rayas", color = "rosa", children }: { patron?: "rayas" | "puntos" | "cuadros"; color?: string; children?: ReactNode }) {
  return <span className={`rp-washi rp-washi--${patron}`} style={{ ["--washi" as string]: `var(--${color})` }}>{children}</span>;
}

export function Boton({ children, variante = "rosa", onClick, disabled, icono, className }: {
  children: ReactNode; variante?: "rosa" | "menta" | "mantequilla" | "papel" | "lavanda" | "cielo" | "melocoton"; onClick?: () => void; disabled?: boolean; icono?: ReactNode; className?: string;
}) {
  return (
    <button type="button" className={`rp-btn rp-btn--${variante} ${className ?? ""}`} onClick={onClick} disabled={disabled}>
      {icono}<span>{children}</span>
    </button>
  );
}

const NEC: Record<Necesidad, { nombre: string; bajo: string; color: string; ico: string }> = {
  hambre: { nombre: "Tripita", bajo: "le apetece comer", color: "var(--melocoton)", ico: "M3 11 H21 Q20 19 12 19 Q4 19 3 11Z" },
  limpieza: { nombre: "Baño", bajo: "quiere burbujas", color: "var(--cielo)", ico: "M3.5 13 a6.5 6.5 0 1 0 13 0 a6.5 6.5 0 1 0 -13 0 M13.7 7 a3.8 3.8 0 1 0 7.6 0 a3.8 3.8 0 1 0 -7.6 0" },
  mimos: { nombre: "Mimos", bajo: "te echa de menos", color: "var(--rosa)", ico: "M12 8 C12 3 3 3 3 9 C3 14 9 17 12 20 C15 17 21 14 21 9 C21 3 12 3 12 8Z" },
  energia: { nombre: "Siesta", bajo: "tiene sueñito", color: "var(--mantequilla)", ico: "M15 3 A9 9 0 1 0 21 15 A7 7 0 1 1 15 3Z" },
};

export function Necesidades({ n }: { n: TNec }) {
  return (
    <ul className="rp-nec">
      {(Object.keys(NEC) as Necesidad[]).map((k) => {
        const llenos = Math.round(n[k] / 20);
        return (
          <li key={k}>
            <span className="rp-nec__ico">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d={NEC[k].ico} fill={NEC[k].color} stroke="var(--tinta)" strokeWidth="1.8" strokeLinejoin="round" /></svg>
            </span>
            <span className="rp-nec__txt">{NEC[k].nombre}{llenos <= 1 ? <em>{NEC[k].bajo}</em> : null}</span>
            <span className="rp-nec__pips" aria-label={`${llenos} de 5`}>
              {Array.from({ length: 5 }, (_, i) => <i key={i} className={`rp-pip${i < llenos ? " is-on" : ""}`} style={{ ["--pip" as string]: NEC[k].color }} />)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Hoja que sube desde abajo (modal). */
export function Hoja({ abierta, cerrar, titulo, children }: { abierta: boolean; cerrar: () => void; titulo: string; children: ReactNode }) {
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta, cerrar]);
  if (!abierta) return null;
  return (
    <div className="hoja-fondo" onClick={cerrar}>
      <section className="hoja rp-papel" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <Washi patron="puntos" color="rosa" />
        <header className="hoja__cab">
          <h2 className="subtitulo">{titulo}</h2>
          <button type="button" className="hoja__cerrar" onClick={cerrar} aria-label="Cerrar">×</button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function Seccion({ titulo, washi = "rosa", children, derecha }: { titulo: string; washi?: string; children: ReactNode; derecha?: ReactNode }) {
  return (
    <section className="seccion">
      <header className="seccion__cab">
        <h2 className="etiqueta"><span className="rp-subrayado">{titulo}</span></h2>
        {derecha}
      </header>
      <div className="seccion__cuerpo" style={{ ["--cinta" as string]: `var(--${washi})` }}>{children}</div>
    </section>
  );
}

/* ---------- piezas añadidas para las pantallas completas (pro) ---------- */

/** Interruptor tipo pastilla. */
export function Interruptor({ activo, alCambiar, etiqueta }: { activo: boolean; alCambiar: (v: boolean) => void; etiqueta: string }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} className="interruptor" data-activo={activo} onClick={() => alCambiar(!activo)}>
      <i />
    </button>
  );
}

/** Campo con etiqueta pequeña encima. */
export function Campo({ etiqueta, children, ancho }: { etiqueta: string; children: ReactNode; ancho?: boolean }) {
  return (
    <label className={`campo${ancho ? " campo--ancho" : ""}`}>
      <span className="nota">{etiqueta}</span>
      {children}
    </label>
  );
}

/** Desplegable nativo con el aspecto del sistema. */
export function Selector<T extends string>({ valor, opciones, alCambiar, etiqueta }: {
  valor: T; opciones: { v: T; t: string }[]; alCambiar: (v: T) => void; etiqueta?: string;
}) {
  return (
    <span className="selector">
      <select className="entrada" value={valor} aria-label={etiqueta} onChange={(e) => alCambiar(e.target.value as T)}>
        {opciones.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
      </select>
    </span>
  );
}

/** Opciones en pastillas (una sola elegida). */
export function Pastillas<T extends string | number>({ valor, opciones, alCambiar }: { valor: T; opciones: { v: T; t: string }[]; alCambiar: (v: T) => void }) {
  return (
    <div className="opciones">
      {opciones.map((o) => <button key={String(o.v)} type="button" className="opcion" data-activa={valor === o.v} onClick={() => alCambiar(o.v)}>{o.t}</button>)}
    </div>
  );
}

/** Etiqueta pequeña (sustituye a los "badges"). */
export function Pildora({ children, color = "lavanda" }: { children: ReactNode; color?: string }) {
  return <span className="pildora" style={{ ["--pildora" as string]: `var(--${color})` }}>{children}</span>;
}

/** Hoja de confirmación para acciones que borran algo. */
export function Confirmar({ abierta, titulo, texto, si, alConfirmar, cerrar }: {
  abierta: boolean; titulo: string; texto: string; si: string; alConfirmar: () => void; cerrar: () => void;
}) {
  return (
    <Hoja abierta={abierta} cerrar={cerrar} titulo={titulo}>
      <p className="cuerpo">{texto}</p>
      <div className="hoja__acciones">
        <Boton variante="melocoton" onClick={alConfirmar} className="ancho">{si}</Boton>
        <button type="button" className="enlace" onClick={cerrar}>Mejor no</button>
      </div>
    </Hoja>
  );
}

/** Cabecera de pantalla: título con subrayado + texto corto opcional. */
export function Titulo({ antes, marcado, texto, derecha }: { antes?: string; marcado: string; texto?: string; derecha?: ReactNode }) {
  return (
    <header className="titulo-pantalla">
      <div className="cabecera">
        <h1 className="titulo">{antes ? `${antes} ` : ""}<span className="rp-subrayado">{marcado}</span></h1>
        {derecha}
      </div>
      {texto ? <p className="nota">{texto}</p> : null}
    </header>
  );
}
