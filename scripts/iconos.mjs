// Genera los iconos de la PWA y de la APK: un táper con su etiqueta, sobre azul cobalto.
// Uso: npm run iconos
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const COBALTO = "#2346D8", BLANCO = "#FFFFFF", CINTA = "#15181C", ESMALTE = "#ECEFEA";

// Táper dibujado en una caja de 512×512 (centrado).
const taper = `
  <rect x="96" y="176" width="320" height="44" rx="16" fill="${BLANCO}"/>
  <rect x="176" y="150" width="160" height="34" rx="12" fill="${BLANCO}"/>
  <rect x="120" y="232" width="272" height="150" rx="30" fill="${BLANCO}"/>
  <g transform="rotate(-4 256 300)">
    <rect x="160" y="280" width="192" height="40" rx="4" fill="${CINTA}"/>
    <rect x="178" y="296" width="44" height="8" rx="2" fill="${BLANCO}"/>
    <rect x="230" y="296" width="30" height="8" rx="2" fill="${BLANCO}"/>
    <rect x="268" y="296" width="64" height="8" rx="2" fill="${BLANCO}"/>
  </g>`;

const icono = (escala = 1, fondo = true) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${fondo ? `<rect width="512" height="512" fill="${COBALTO}"/>` : ""}
  <g transform="translate(256 266) scale(${escala}) translate(-256 -266)">${taper}</g></svg>`;

mkdirSync("public", { recursive: true });
mkdirSync("resources", { recursive: true });
await sharp(Buffer.from(icono(1))).resize(512).png().toFile("public/icon-512.png");
await sharp(Buffer.from(icono(1))).resize(192).png().toFile("public/icon-192.png");
await sharp(Buffer.from(icono(0.78))).resize(512).png().toFile("public/icon-maskable-512.png");
// Para @capacitor/assets (icono adaptativo de Android)
await sharp(Buffer.from(icono(0.62, false))).resize(1024).png().toFile("resources/icon-foreground.png");
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: COBALTO } }).png().toFile("resources/icon-background.png");
await sharp(Buffer.from(icono(1))).resize(1024).png().toFile("resources/icon-only.png");
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732"><rect width="2732" height="2732" fill="${ESMALTE}"/>
  <g transform="translate(1110 1110)"><rect width="512" height="512" rx="110" fill="${COBALTO}"/>${taper}</g></svg>`)).png().toFile("resources/splash.png");
writeFileSync("resources/LEEME.txt", "Iconos generados con `npm run iconos`. En la compilación de la APK se convierten con @capacitor/assets.\n");
console.log("iconos listos");
