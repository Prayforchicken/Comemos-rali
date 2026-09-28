/* Primera vez: adoptar el gatito. */
import type { PantallaProps } from "../App";
import { Washi } from "../componentes/base";
import { Personalizar } from "../componentes/Personalizar";
import { adoptar } from "../juego/motor";

export function Bienvenida({ cambiar }: PantallaProps) {
  return (
    <main className="contenido bienvenida">
      <Washi patron="rayas" color="rosa">Comemos · Rali</Washi>
      <h1 className="titulo">Un gatito <span className="rp-subrayado">te ha elegido</span></h1>
      <p className="cuerpo">
        Cada vez que comas lo que toca en tu plan o vayas al gimnasio ganarás huellitas. Con ellas le compras chuches.
        Si un día no sale, no pasa nada: aquí nunca se pierde nada y nadie se pone malito.
      </p>
      <Personalizar
        especie="gatito"
        textoBoton="¡Adoptar!"
        alGuardar={(a) => cambiar((d) => ({ ...d, juego: adoptar(d.juego, "gatito", a.nombre, a.pelaje, a.accesorio) }))}
      />
    </main>
  );
}
