/* Iconos de chuches y de la huellita (moneda). */
import { TINTA } from './mascotas.js';
const T = TINTA;
  const s = (d, fill, sw = 2.5) => `<path d="${d}" fill="${fill}" stroke="${T}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const svg = (inner, tam, vb = 64, label = '') => `<svg viewBox="0 0 ${vb} ${vb}" width="${tam}" height="${tam}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

  /* ---------- chuches ---------- */
  const CHUCHES = {
    caramelo:  { nombre: 'Caramelo',  precio: 5,  favorito: null },
    piruleta:  { nombre: 'Piruleta',  precio: 8,  favorito: null },
    pescadito: { nombre: 'Pescadito', precio: 10, favorito: 'gatito' },
    queso:     { nombre: 'Quesito',   precio: 10, favorito: 'rata' },
    galleta:   { nombre: 'Galleta',   precio: 10, favorito: 'mapache' },
    brillito:  { nombre: 'Brillito',  precio: 12, favorito: 'urraca' },
    nuez:      { nombre: 'Nuececita', precio: 12, favorito: 'cuervo' },
  };
  function chuche(tipo = 'caramelo', tam = 56) {
    let i = '';
    switch (tipo) {
      case 'caramelo':
        i = s('M18 32 L6 22 L8 42 Z', '#F7B3C4') + s('M46 32 L58 22 L56 42 Z', '#F7B3C4') +
          `<ellipse cx="32" cy="32" rx="16" ry="13" fill="#FBE5A2" stroke="${T}" stroke-width="2.5"/>` +
          `<path d="M24 22 Q28 32 24 42 M32 19 Q36 32 32 45 M40 22 Q44 32 40 42" stroke="#F28AA8" stroke-width="3" fill="none" stroke-linecap="round"/>` +
          `<ellipse cx="32" cy="32" rx="16" ry="13" fill="none" stroke="${T}" stroke-width="2.5"/><circle cx="26" cy="27" r="2.4" fill="#fff"/>`;
        break;
      case 'piruleta':
        i = `<rect x="29.5" y="34" width="5" height="26" rx="2.5" fill="#FFFFFF" stroke="${T}" stroke-width="2.5"/>` +
          `<circle cx="32" cy="24" r="18" fill="#D8CCF2" stroke="${T}" stroke-width="2.5"/>` +
          `<path d="M32 24 m0 -3 a3 3 0 1 1 -3 3 a6 6 0 1 1 6 -6 a9 9 0 1 1 -9 9 a12 12 0 1 1 12 -12" fill="none" stroke="#F28AA8" stroke-width="3.2" stroke-linecap="round"/>` +
          `<path d="M26 58 Q32 52 38 58" fill="#BFE6D6" stroke="${T}" stroke-width="2"/>`;
        break;
      case 'pescadito':
        i = s('M10 32 Q22 14 42 24 L56 14 L54 32 L56 50 L42 40 Q22 50 10 32 Z', '#FDD3B8') +
          `<circle cx="20" cy="29" r="2.8" fill="${T}"/><circle cx="19" cy="28" r="1" fill="#fff"/>` +
          `<path d="M28 26 Q32 32 28 38 M34 25 Q38 32 34 39" stroke="#E9A673" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
          `<ellipse cx="17" cy="35" rx="3" ry="1.8" fill="#F59DB5" opacity=".7"/>`;
        break;
      case 'queso':
        i = s('M8 42 L50 18 Q58 24 58 34 L58 50 L8 50 Z', '#FBE5A2') + s('M8 42 L58 34', 'none', 2.2) +
          `<ellipse cx="24" cy="46" rx="4" ry="2.6" fill="#EDD07A"/><ellipse cx="44" cy="44" rx="5" ry="3.2" fill="#EDD07A"/><ellipse cx="46" cy="30" rx="3.4" ry="2.4" fill="#EDD07A"/>` +
          `<path d="M50 18 Q54 12 60 14" stroke="${T}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        break;
      case 'galleta':
        i = `<circle cx="32" cy="32" r="22" fill="#EFC99E" stroke="${T}" stroke-width="2.5"/>` +
          `<circle cx="32" cy="32" r="16" fill="none" stroke="#DDAE7C" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>` +
          [[24, 24], [38, 22], [42, 36], [28, 40], [34, 31], [20, 34]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.2" ry="2.6" fill="#7A5A55"/>`).join('');
        break;
      case 'brillito':
        i = s('M14 24 L24 12 L40 12 L50 24 L32 54 Z', '#C6E2F5') + s('M14 24 L50 24 M24 12 L28 24 L32 54 L36 24 L40 12', 'none', 2) +
          `<path d="M20 22 L25 16" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` +
          `<path transform="translate(52 12) scale(.7)" d="M0 -8 Q1.5 -1.5 8 0 Q1.5 1.5 0 8 Q-1.5 1.5 -8 0 Q-1.5 -1.5 0 -8Z" fill="#FBE5A2" stroke="${T}" stroke-width="2"/>`;
        break;
      case 'nuez':
        i = s('M32 8 Q52 10 54 32 Q54 54 32 56 Q10 54 10 32 Q12 10 32 8 Z', '#D9A774') +
          `<path d="M32 10 Q28 32 32 54" stroke="${T}" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
          `<path d="M20 20 Q26 26 20 32 Q14 38 20 44 M44 20 Q38 26 44 32 Q50 38 44 44" stroke="#B07E4E" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
          `<circle cx="22" cy="16" r="2.2" fill="#fff" opacity=".8"/>`;
        break;
    }
    return svg(i, tam, 64, CHUCHES[tipo] ? CHUCHES[tipo].nombre : tipo);
  }

  /* ---------- huellita (la moneda) ---------- */
  function huellitaIcono(tam = 22) {
    return svg(`<circle cx="16" cy="16" r="14" fill="#FBE5A2" stroke="${T}" stroke-width="2.2"/>` +
      `<g fill="${T}"><ellipse cx="16" cy="19.5" rx="5.2" ry="4.2"/><circle cx="9.8" cy="13.4" r="2.2"/><circle cx="13.6" cy="10" r="2.2"/><circle cx="18.4" cy="10" r="2.2"/><circle cx="22.2" cy="13.4" r="2.2"/></g>`, tam, 32, 'huellitas');
  }

  /* ---------- regalo (chuche para Rali que traen los animalitos) ---------- */
  function regaloIcono(tam = 56) {
    return svg(
      s('M12 28 H52 V54 Q52 57 49 57 H15 Q12 57 12 54 Z', '#F7B3C4') +
      s('M8 20 H56 V30 H8 Z', '#FCE1E8') +
      s('M28 20 H36 V57 H28 Z', '#FBE5A2', 2.2) +
      s('M32 20 Q20 4 14 12 Q10 20 32 20 Z', '#FBE5A2', 2.2) + s('M32 20 Q44 4 50 12 Q54 20 32 20 Z', '#FBE5A2', 2.2) +
      `<circle cx="20" cy="40" r="2" fill="#fff"/><circle cx="44" cy="46" r="2" fill="#fff"/><circle cx="18" cy="50" r="1.6" fill="#fff"/>`,
      tam, 64, 'regalo');
  }

export { chuche, CHUCHES, huellitaIcono, regaloIcono };
