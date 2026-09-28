/* Pegatinas de premio que aparecen arriba al ganar huellitas (y avisos suaves). */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { IconoHuellita, Washi } from "./base";

interface Pegatina { id: number; puntos?: number; motivo: string; extra?: string; deshacer?: () => void }
type Poner = (p: Omit<Pegatina, "id">) => void;
const Ctx = createContext<Poner>(() => undefined);
export const usePegatina = () => useContext(Ctx);

export function Pegatinas({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Pegatina[]>([]);
  const poner = useCallback<Poner>((p) => {
    const id = Date.now() + Math.random();
    setLista((l) => [...l.slice(-2), { ...p, id }]);
    setTimeout(() => setLista((l) => l.filter((x) => x.id !== id)), p.deshacer ? 5000 : 3200);
  }, []);
  return (
    <Ctx.Provider value={poner}>
      {children}
      <div className="pegatinas" aria-live="polite">
        {lista.map((p) => (
          <div key={p.id} className="rp-bonus pegatina-entra" role="status">
            <Washi patron="rayas" color="mantequilla" />
            {p.puntos ? <span className="rp-bonus__num"><IconoHuellita tam={30} /><b>+{p.puntos}</b></span> : null}
            <span className="rp-bonus__txt">
              <strong>{p.motivo}</strong>
              {p.extra ? <small>{p.extra}</small> : null}
            </span>
            {p.deshacer ? (
              <button type="button" className="enlace" onClick={() => { p.deshacer?.(); setLista((l) => l.filter((x) => x.id !== p.id)); }}>Deshacer</button>
            ) : null}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
