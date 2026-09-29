/* Piezas pequeñas reutilizables de la interfaz. */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Variante = "primario" | "secundario" | "rali" | "basura" | "peligro";

export function Boton({ children, variante = "primario", onClick, disabled, icono, grande, ancho }: {
  children: ReactNode; variante?: Variante; onClick?: () => void; disabled?: boolean; icono?: ReactNode; grande?: boolean; ancho?: boolean;
}) {
  const clase = ["boton", `boton--${variante}`, grande ? "boton--grande" : "", ancho ? "boton--ancho" : ""].filter(Boolean).join(" ");
  return <button type="button" className={clase} onClick={onClick} disabled={disabled}>{icono}<span>{children}</span></button>;
}

/** Hoja que sube desde abajo (modal). */
export function Hoja({ abierta, cerrar, titulo, children }: { abierta: boolean; cerrar: () => void; titulo: string; children: ReactNode }) {
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", tecla); document.body.style.overflow = ""; };
  }, [abierta, cerrar]);
  if (!abierta) return null;
  return (
    <div className="hoja-fondo" onClick={cerrar}>
      <section className="hoja" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <span className="hoja__asa" />
        <header className="hoja__cab">
          <h2>{titulo}</h2>
          <button type="button" className="hoja__cerrar" onClick={cerrar} aria-label="Cerrar">×</button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function Confirmar({ abierta, titulo, texto, si, alConfirmar, cerrar }: {
  abierta: boolean; titulo: string; texto: string; si: string; alConfirmar: () => void; cerrar: () => void;
}) {
  return (
    <Hoja abierta={abierta} cerrar={cerrar} titulo={titulo}>
      <p>{texto}</p>
      <div className="acciones">
        <Boton variante="peligro" ancho onClick={alConfirmar}>{si}</Boton>
        <Boton variante="secundario" ancho onClick={cerrar}>Mejor no</Boton>
      </div>
    </Hoja>
  );
}

export function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return <label className="campo"><span>{etiqueta}</span>{children}</label>;
}

export function Segmento<T extends string>({ valor, opciones, alCambiar, etiqueta }: { valor: T; opciones: { v: T; t: string }[]; alCambiar: (v: T) => void; etiqueta: string }) {
  return (
    <div className="segmento" role="tablist" aria-label={etiqueta}>
      {opciones.map((o) => <button key={o.v} type="button" role="tab" aria-selected={valor === o.v} onClick={() => alCambiar(o.v)}>{o.t}</button>)}
    </div>
  );
}

/** Selector "− 4 raciones +". */
export function Paso({ valor, min, max, alCambiar, texto }: { valor: number; min: number; max: number; alCambiar: (v: number) => void; texto: (v: number) => string }) {
  return (
    <span className="paso">
      <button type="button" aria-label="Menos" disabled={valor <= min} onClick={() => alCambiar(valor - 1)}>−</button>
      <span aria-live="polite">{texto(valor)}</span>
      <button type="button" aria-label="Más" disabled={valor >= max} onClick={() => alCambiar(valor + 1)}>+</button>
    </span>
  );
}

export function Medidor({ valor, max }: { valor: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (valor / max) * 100) : 0;
  return <div className="medidor" data-pasado={valor > max * 1.05} role="presentation"><i style={{ width: `${pct}%` }} /></div>;
}

export function Interruptor({ activo, alCambiar, etiqueta }: { activo: boolean; alCambiar: (v: boolean) => void; etiqueta: string }) {
  return <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} className="interruptor" onClick={() => alCambiar(!activo)}><i /></button>;
}

/* ---------- aviso flotante con "deshacer" ---------- */

export interface Aviso { texto: string; deshacer?: () => void }
const Ctx = createContext<(a: Aviso) => void>(() => undefined);
export const useAvisar = () => useContext(Ctx);

export function Avisos({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const t = useRef<number | undefined>(undefined);
  const avisar = useCallback((a: Aviso) => {
    setAviso(a);
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setAviso(null), a.deshacer ? 6000 : 3000);
  }, []);
  return (
    <Ctx.Provider value={avisar}>
      {children}
      {aviso ? (
        <div className="toast" role="status">
          <span>{aviso.texto}</span>
          {aviso.deshacer ? <button type="button" onClick={() => { aviso.deshacer?.(); setAviso(null); }}>Deshacer</button> : null}
        </div>
      ) : null}
    </Ctx.Provider>
  );
}
