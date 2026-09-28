/* Recetario: recetas propias (con categoría: batch, acompañamiento, congelador…),
   grupos de cheat meal y alimentos guardados. Se muestra dentro de la pestaña Menú. */
import { useState } from "react";
import type { PantallaProps } from "../App";
import { BASE } from "../alimentos/base";
import { aPlantilla, dividir, totales } from "../alimentos/nutricion";
import type { Alimento, Categoria, RecetaPropia } from "../alimentos/tipos";
import { slotLabel } from "../comemos/engine";
import type { MealSlot } from "../comemos/models";
import { Buscador, ListaItems } from "../componentes/Buscador";
import { Boton, Campo, Confirmar, Hoja, Pastillas, Pildora, Seccion } from "../componentes/base";
import { usePegatina } from "../componentes/Pegatinas";
import { SLOTS } from "../decisiones/decisiones";
import { CATEGORIAS, ORDEN_CATEGORIAS, type GrupoCheat } from "../menu/menu";

/* ---------------- recetas propias ---------------- */

const MOMENTOS: { v: MealSlot; t: string }[] = SLOTS.map((s) => ({ v: s, t: slotLabel(s) }));
const nuevaReceta = (categoria: Categoria = "batch"): RecetaPropia => ({
  id: `receta-${Date.now().toString(36)}`, nombre: "", categoria, raciones: categoria === "batch" ? 4 : categoria === "acompanamiento" ? 3 : 1,
  momentos: categoria === "desayuno" ? ["breakfast", "snack"] : ["lunch", "dinner"], items: [], pasos: "", creada: new Date().toISOString(),
});

export function Recetas({ datos, cambiar }: PantallaProps) {
  const pegatina = usePegatina();
  const [editando, setEditando] = useState<RecetaPropia | null>(null);
  const [borrando, setBorrando] = useState<RecetaPropia | null>(null);
  const lista = Object.values(datos.recetas).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const guardar = (r: RecetaPropia) => {
    cambiar((d) => {
      const tpl = aPlantilla(r);
      const plantillas = d.plan.mealTemplates.some((t) => t.id === r.id) ? d.plan.mealTemplates.map((t) => (t.id === r.id ? tpl : t)) : [...d.plan.mealTemplates, tpl];
      return { ...d, recetas: { ...d.recetas, [r.id]: r }, plan: { ...d.plan, mealTemplates: plantillas } };
    });
    setEditando(null);
    pegatina({ motivo: "Receta guardada", extra: "Ya la puedes poner en el menú o elegirla en cualquier comida" });
  };
  const borrar = (r: RecetaPropia) => {
    cambiar((d) => {
      const recetas = { ...d.recetas };
      delete recetas[r.id];
      return { ...d, recetas, plan: { ...d.plan, mealTemplates: d.plan.mealTemplates.filter((t) => t.id !== r.id) } };
    });
    setBorrando(null);
  };

  return (
    <>
      <Boton onClick={() => setEditando(nuevaReceta())}>+ Nueva receta</Boton>
      {lista.length ? ORDEN_CATEGORIAS.map((cat) => {
        const deCat = lista.filter((r) => (r.categoria ?? "rapida") === cat);
        if (!deCat.length) return null;
        return (
          <div key={cat} className="pila pila--apretada">
            <h3 className="etiqueta"><Pildora color={CATEGORIAS[cat].color}>{CATEGORIAS[cat].plural}</Pildora></h3>
            {deCat.map((r) => {
              const x = dividir(totales(r.items), r.raciones);
              return (
                <article key={r.id} className="receta-propia">
                  <div className="fila">
                    <h3 className="subtitulo">{r.nombre}</h3>
                    <Pildora color="lavanda">{r.raciones} {r.raciones === 1 ? "ración" : "raciones"}</Pildora>
                  </div>
                  <dl className="macros macros--5">
                    <div><dt>kcal</dt><dd>{x.kcal}</dd></div>
                    <div><dt>Prot.</dt><dd>{Math.round(x.proteina)}</dd></div>
                    <div><dt>Carbos</dt><dd>{Math.round(x.carbos)}</dd></div>
                    <div><dt>Grasa</dt><dd>{Math.round(x.grasa)}</dd></div>
                    <div><dt>Fibra</dt><dd>{Math.round(x.fibra)}</dd></div>
                  </dl>
                  <p className="nota">Por ración · {x.gramos} g · {r.items.length} ingredientes · {r.momentos.map((m) => slotLabel(m).toLowerCase()).join(", ")}</p>
                  <div className="regla__acciones">
                    <button type="button" className="enlace" onClick={() => setEditando(structuredClone(r))}>Editar</button>
                    <button type="button" className="enlace frambuesa" onClick={() => setBorrando(r)}>Borrar</button>
                  </div>
                </article>
              );
            })}
          </div>
        );
      }) : (
        <div className="vacio">
          <p className="subtitulo">Tu recetario está vacío</p>
          <p className="nota">Crea una receta con sus ingredientes y gramos. La app calcula cada ración y la podrás poner en el menú.</p>
        </div>
      )}

      <Hoja abierta={Boolean(editando)} cerrar={() => setEditando(null)} titulo={editando && datos.recetas[editando.id] ? "Editar receta" : "Nueva receta"}>
        {editando ? <EditorReceta key={editando.id} inicial={editando} datos={datos}
          alGuardarAlimento={(a) => cambiar((d) => ({ ...d, alimentos: { ...d.alimentos, [a.id]: a } }))} alGuardar={guardar} /> : null}
      </Hoja>
      <Confirmar abierta={Boolean(borrando)} cerrar={() => setBorrando(null)} titulo={`¿Borrar “${borrando?.nombre ?? ""}”?`}
        texto="Las comidas y el menú que la usaban vuelven a lo que tocaba en el plan." si="Borrar receta" alConfirmar={() => borrando && borrar(borrando)} />
    </>
  );
}

function EditorReceta({ inicial, datos, alGuardar, alGuardarAlimento }: { inicial: RecetaPropia; datos: PantallaProps["datos"]; alGuardar: (r: RecetaPropia) => void; alGuardarAlimento: (a: Alimento) => void }) {
  const [r, setR] = useState(inicial);
  const [buscando, setBuscando] = useState(!inicial.items.length);
  const valido = r.nombre.trim() && r.items.length && r.raciones >= 1;
  const categoria = r.categoria ?? "rapida";
  return (
    <>
      <Campo etiqueta="Nombre"><input className="entrada" value={r.nombre} onChange={(e) => setR({ ...r, nombre: e.target.value })} placeholder="Ej.: Curry de garbanzos" /></Campo>
      <div className="campo">
        <span className="nota">Tipo de receta</span>
        <Pastillas valor={categoria} opciones={ORDEN_CATEGORIAS.map((c) => ({ v: c, t: CATEGORIAS[c].nombre }))} alCambiar={(c) => setR({ ...r, categoria: c })} />
        <p className="nota">{CATEGORIAS[categoria].texto}</p>
      </div>
      <div className="rejilla">
        <Campo etiqueta="Raciones que salen"><input className="entrada" type="number" min={1} max={20} value={r.raciones} onChange={(e) => setR({ ...r, raciones: Math.max(1, Number(e.target.value) || 1) })} /></Campo>
      </div>
      <div className="campo">
        <span className="nota">Para qué comidas</span>
        <div className="opciones">
          {MOMENTOS.map((m) => {
            const on = r.momentos.includes(m.v);
            return <button key={m.v} type="button" className="opcion" data-activa={on} onClick={() => setR({ ...r, momentos: on ? r.momentos.filter((x) => x !== m.v) : [...r.momentos, m.v] })}>{m.t}</button>;
          })}
        </div>
      </div>
      <span className="etiqueta">Ingredientes (toda la receta)</span>
      <ListaItems items={r.items} cambiar={(items) => setR({ ...r, items })} divisor={r.raciones} etiquetaTotal="Por ración" />
      {buscando ? (
        <Buscador guardados={datos.alimentos} recetas={datos.recetas} sinRecetas alGuardarAlimento={alGuardarAlimento}
          alAnadir={(i) => { setR((x) => ({ ...x, items: [...x.items, i] })); setBuscando(false); }} />
      ) : <Boton variante="papel" onClick={() => setBuscando(true)}>+ Ingrediente</Boton>}
      <Campo etiqueta="Pasos (opcional)"><textarea className="entrada" rows={3} value={r.pasos} onChange={(e) => setR({ ...r, pasos: e.target.value })} /></Campo>
      <div className="hoja__acciones"><Boton className="ancho" disabled={!valido} onClick={() => alGuardar({ ...r, nombre: r.nombre.trim() })}>Guardar receta</Boton></div>
    </>
  );
}

/* ---------------- cheat meals ---------------- */

export function Cheats({ datos, cambiar }: PantallaProps) {
  const [editando, setEditando] = useState<GrupoCheat | null>(null);
  const guardar = (g: GrupoCheat) => {
    cambiar((d) => ({ ...d, cheats: d.cheats.some((x) => x.id === g.id) ? d.cheats.map((x) => (x.id === g.id ? g : x)) : [...d.cheats, g] }));
    setEditando(null);
  };
  return (
    <Seccion titulo="Cheat meals" washi="rosa" derecha={<Boton variante="papel" onClick={() => setEditando({ id: `cheat-${Date.now().toString(36)}`, nombre: "", kcal: 800, proteina: 25, fibra: 5 })}>+ Añadir</Boton>}>
      <p className="nota">Comida divertida, sin pesar: todas las pizzas van a “Pizza” y listo. Cuentan con unas calorías aproximadas y dan +8 huellitas.</p>
      <div className="opciones">
        {datos.cheats.map((g) => (
          <button key={g.id} type="button" className="opcion" onClick={() => setEditando(g)}>{g.nombre} · ~{g.kcal} kcal</button>
        ))}
      </div>
      <Hoja abierta={Boolean(editando)} cerrar={() => setEditando(null)} titulo={editando && datos.cheats.some((x) => x.id === editando.id) ? "Editar cheat meal" : "Nuevo cheat meal"}>
        {editando ? <EditorCheat key={editando.id} inicial={editando} alGuardar={guardar}
          alBorrar={datos.cheats.some((x) => x.id === editando.id) ? () => { cambiar((d) => ({ ...d, cheats: d.cheats.filter((x) => x.id !== editando.id) })); setEditando(null); } : undefined} /> : null}
      </Hoja>
    </Seccion>
  );
}

function EditorCheat({ inicial, alGuardar, alBorrar }: { inicial: GrupoCheat; alGuardar: (g: GrupoCheat) => void; alBorrar?: () => void }) {
  const [g, setG] = useState(inicial);
  const num = (k: "kcal" | "proteina" | "fibra") => (e: React.ChangeEvent<HTMLInputElement>) => setG({ ...g, [k]: Math.max(0, Number(e.target.value) || 0) });
  return (
    <>
      <Campo etiqueta="Nombre"><input className="entrada" value={g.nombre} maxLength={30} placeholder="Ej.: Pizza" onChange={(e) => setG({ ...g, nombre: e.target.value })} /></Campo>
      <div className="rejilla">
        <Campo etiqueta="kcal aproximadas"><input className="entrada" type="number" step={50} value={g.kcal} onChange={num("kcal")} /></Campo>
        <Campo etiqueta="Proteína (g)"><input className="entrada" type="number" value={g.proteina} onChange={num("proteina")} /></Campo>
        <Campo etiqueta="Fibra (g)"><input className="entrada" type="number" value={g.fibra} onChange={num("fibra")} /></Campo>
      </div>
      <p className="nota">Un número redondo vale. Es para que el día cuadre más o menos, no para contar al miligramo.</p>
      <div className="hoja__acciones">
        <Boton className="ancho" disabled={!g.nombre.trim()} onClick={() => alGuardar({ ...g, nombre: g.nombre.trim() })}>Guardar</Boton>
        {alBorrar ? <button type="button" className="enlace frambuesa" onClick={alBorrar}>Borrar este grupo</button> : null}
      </div>
    </>
  );
}

/* ---------------- alimentos guardados ---------------- */

export function Alimentos({ datos, cambiar }: PantallaProps) {
  const [borrando, setBorrando] = useState<Alimento | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const lista = Object.values(datos.alimentos).sort((a, b) => a.nombre.localeCompare(b.nombre));
  return (
    <>
      <p className="nota">Aquí quedan los alimentos de wger que usas y los que creas a mano, para tenerlos también sin internet. Además hay {BASE.length} alimentos comunes en la base local.</p>
      <Boton variante="papel" onClick={() => setNuevo(true)}>Buscar o crear alimento</Boton>
      {lista.length ? (
        <Seccion titulo="Mis alimentos" washi="cielo" derecha={<Pildora color="cielo">{lista.length}</Pildora>}>
          {lista.map((a) => (
            <div key={a.id} className="alimento-guardado">
              <span><b>{a.nombre}</b><small className="nota">{a.n.kcal} kcal · P {Math.round(a.n.proteina)} · C {Math.round(a.n.carbos)} · G {Math.round(a.n.grasa)} · F {Math.round(a.n.fibra)} (100 g)</small></span>
              <Pildora color={a.fuente === "wger" ? "cielo" : "rosa"}>{a.fuente === "wger" ? "wger" : "tuyo"}</Pildora>
              <button type="button" className="item__quitar" aria-label={`Quitar ${a.nombre}`} onClick={() => setBorrando(a)}>×</button>
            </div>
          ))}
        </Seccion>
      ) : null}
      <Hoja abierta={nuevo} cerrar={() => setNuevo(false)} titulo="Buscar o crear">
        {nuevo ? <Buscador guardados={datos.alimentos} recetas={datos.recetas} sinRecetas
          alGuardarAlimento={(a) => cambiar((d) => ({ ...d, alimentos: { ...d.alimentos, [a.id]: a } }))}
          alAnadir={(i) => { const a = [...BASE, ...lista].find((x) => x.id === i.alimentoId); if (a && !datos.alimentos[a.id]) cambiar((d) => ({ ...d, alimentos: { ...d.alimentos, [a.id]: a } })); setNuevo(false); }} /> : null}
      </Hoja>
      <Confirmar abierta={Boolean(borrando)} cerrar={() => setBorrando(null)} titulo={`¿Quitar “${borrando?.nombre ?? ""}”?`}
        texto="Solo se quita de tu lista. Las comidas y recetas donde ya está guardan sus valores." si="Quitar"
        alConfirmar={() => { const id = borrando?.id; cambiar((d) => { const a = { ...d.alimentos }; if (id) delete a[id]; return { ...d, alimentos: a }; }); setBorrando(null); }} />
    </>
  );
}
