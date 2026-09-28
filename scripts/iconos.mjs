// Genera los iconos de la PWA y de la APK a partir del sprite del gatito.
// Uso: npm run iconos
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { mascota } from "../src/sprites/mascotas.js";

const sprite = mascota({ especie: "gatito", animo: "feliz", tam: 200 })
  .replace(/<svg[^>]*>/, "").replace(/<\/svg>$/, "")
  .replace(/<g font-family[\s\S]*?<\/g>/g, ""); // sin letras sueltas

// Fondo rosa con puntitos de libreta y el gatito centrado
const icono = (tamGato, fondo = true) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${fondo ? `<rect width="512" height="512" fill="#F7B3C4"/>
  <defs><pattern id="p" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="16" cy="16" r="3" fill="#FCE1E8"/></pattern></defs>
  <rect width="512" height="512" fill="url(#p)"/>` : ""}
  <g transform="translate(${256 - tamGato / 2} ${256 - tamGato / 2 + 10}) scale(${tamGato / 200})">${sprite}</g></svg>`;

mkdirSync("public", { recursive: true });
mkdirSync("resources", { recursive: true });
await sharp(Buffer.from(icono(400))).resize(512).png().toFile("public/icon-512.png");
await sharp(Buffer.from(icono(400))).resize(192).png().toFile("public/icon-192.png");
await sharp(Buffer.from(icono(300))).resize(512).png().toFile("public/icon-maskable-512.png");
// Para @capacitor/assets (icono adaptativo de Android)
await sharp(Buffer.from(icono(560, false).replace('viewBox="0 0 512 512"', 'viewBox="-256 -256 1024 1024"'))).resize(1024).png().toFile("resources/icon-foreground.png");
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#F7B3C4" } }).png().toFile("resources/icon-background.png");
await sharp(Buffer.from(icono(400))).resize(1024).png().toFile("resources/icon-only.png");
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732"><rect width="2732" height="2732" fill="#FFF8F5"/><g transform="translate(1066 1066) scale(3)">${sprite}</g></svg>`)).png().toFile("resources/splash.png");
writeFileSync("resources/LEEME.txt", "Iconos generados con `npm run iconos`. En la compilación de la APK se convierten con @capacitor/assets.\n");
console.log("iconos listos");
