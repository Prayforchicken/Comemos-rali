import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { esNativo } from "./avisos/notificaciones";
import "./estilos.css";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

// La PWA usa service worker para abrir sin conexión; dentro de la APK no hace falta.
if (!esNativo() && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => undefined));
}
