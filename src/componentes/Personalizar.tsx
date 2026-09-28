/* Editor de mascota: nombre, pelaje y accesorio, con vista previa en vivo. */
import { useState } from "react";
import { PELAJES } from "../sprites/mascotas.js";
import type { Accesorio, Especie } from "../juego/tipos";
import { Boton, Sprite } from "./base";

const ACCESORIOS: { id: Accesorio; nombre: string }[] = [
  { id: "ninguno", nombre: "Nada" }, { id: "lazo", nombre: "Lazo" }, { id: "flor", nombre: "Flor" },
  { id: "gorro", nombre: "Gorrito" }, { id: "gafas", nombre: "Gafas" }, { id: "bufanda", nombre: "Bufanda" },
];

export interface Aspecto { nombre: string; pelaje: string; accesorio: Accesorio }

export function Personalizar({ especie, inicial, textoBoton, alGuardar }: {
  especie: Especie; inicial?: Partial<Aspecto>; textoBoton: string; alGuardar: (a: Aspecto) => void;
}) {
  const pelajes = PELAJES[especie];
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [pelaje, setPelaje] = useState(inicial?.pelaje ?? Object.keys(pelajes)[0]);
  const [accesorio, setAccesorio] = useState<Accesorio>(inicial?.accesorio ?? "ninguno");
  return (
    <div className="personalizar">
      <div className="personalizar__vista">
        <Sprite m={{ especie, pelaje, accesorio, nombre }} animo="feliz" tam={190} />
      </div>
      <label className="campo">
        <span className="etiqueta">Nombre</span>
        <input id={`nombre-${especie}`} className="entrada" value={nombre} maxLength={16} placeholder="¿Cómo se llama?" onChange={(e) => setNombre(e.target.value)} />
      </label>
      <div className="campo">
        <span className="etiqueta">Pelaje</span>
        <div className="opciones">
          {Object.entries(pelajes).map(([id, p]) => (
            <button key={id} type="button" className="opcion" data-activa={pelaje === id} onClick={() => setPelaje(id)}>
              <i className="muestra" style={{ background: p.cuerpo, boxShadow: `inset -6px -6px 0 ${p.sombra}` }} />{p.nombre}
            </button>
          ))}
        </div>
      </div>
      <div className="campo">
        <span className="etiqueta">Accesorio</span>
        <div className="opciones">
          {ACCESORIOS.map((a) => (
            <button key={a.id} type="button" className="opcion" data-activa={accesorio === a.id} onClick={() => setAccesorio(a.id)}>{a.nombre}</button>
          ))}
        </div>
      </div>
      <Boton onClick={() => alGuardar({ nombre: nombre.trim() || "Sin nombre", pelaje, accesorio })} className="ancho">{textoBoton}</Boton>
    </div>
  );
}
