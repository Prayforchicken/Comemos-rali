/* Mantener pulsado (medio segundo) sin mover el dedo. No salta si se empieza sobre un botón o un campo. */
import { useRef } from "react";
import type { PointerEvent as PE } from "react";

export function usePulsacionLarga(alPulsar: () => void, ms = 500) {
  const temporizador = useRef<number | undefined>(undefined);
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const cancelar = () => { window.clearTimeout(temporizador.current); temporizador.current = undefined; inicio.current = null; };
  return {
    onPointerDown: (e: PE<HTMLElement>) => {
      if ((e.target as HTMLElement).closest("button, a, input, select, textarea, summary, label")) return;
      inicio.current = { x: e.clientX, y: e.clientY };
      temporizador.current = window.setTimeout(() => {
        temporizador.current = undefined;
        try { navigator.vibrate?.(15); } catch { /* sin vibración */ }
        alPulsar();
      }, ms);
    },
    onPointerMove: (e: PE<HTMLElement>) => {
      if (inicio.current && Math.hypot(e.clientX - inicio.current.x, e.clientY - inicio.current.y) > 10) cancelar();
    },
    onPointerUp: cancelar,
    onPointerLeave: cancelar,
    onPointerCancel: cancelar,
    // Evita el menú del navegador al mantener pulsado en el móvil.
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}
