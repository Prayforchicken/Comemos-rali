import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { esNativo } from "./avisos/notificaciones";
import "./estilos-sistema.css";
import "./estilos.css";
import "./estilos-pro.css";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

// La PWA usa service worker para abrir sin conexión; dentro de la APK no hace falta.
if (!esNativo() && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => undefined));
}
