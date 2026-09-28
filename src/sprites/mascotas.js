/* Generador de sprites de las mascotas. Copia de la fuente del sistema de diseño "Mascotas de Rali". */
/* ============================================================
   Mascotas de Rali · generador de sprites SVG  (v2 · estilo "monstruito de bolsillo")
   mascota({ especie, animo, pelaje, accesorio, tam }) -> string SVG
   especie:  'gatito' | 'rata' | 'mapache' | 'urraca' | 'cuervo'
   animo:    'feliz' | 'contento' | 'triste' | 'enfadado' | 'hambriento' | 'sucio' | 'dormido' | 'cansado'
   pelaje:   clave de PELAJES[especie]
   accesorio:'ninguno' | 'lazo' | 'flor' | 'gorro' | 'gafas' | 'bufanda'

   Reglas de estilo:
   - Silueta reconocible en negro (orejas, cola, penacho = firma de cada especie).
   - Contorno único grueso (4px) en ciruela oscuro. Sombreado cel de un solo tono abajo-derecha.
   - Ojos pequeños y ovalados con un brillo. La emoción la dan los párpados y la boca.
   - La urraca y el cuervo no tienen boca: se expresan solo con los ojos.
   - Nunca hay estado "muerto": lo peor es gruñón o sucio.
   ============================================================ */

  const OUT = '#3B2E40';            // contorno
  const OJO = '#2E2335';            // pupila
  const BOCA = '#C84B67';
  const LENGUA = '#F59DB5';
  const ROSA = '#F2A0B4';           // interior de orejas, narices

  const PELAJES = {
    gatito: {
      melocoton: { nombre: 'Melocotón', cuerpo: '#F6B98A', sombra: '#DE9563', marca: '#C8703F', panza: '#FFF1E0' },
      nata:      { nombre: 'Nata',      cuerpo: '#FBEBD8', sombra: '#E3C6A6', marca: '#D39B6A', panza: '#FFFFFF' },
      humo:      { nombre: 'Humo',      cuerpo: '#B9B3C9', sombra: '#968EAB', marca: '#6F6787', panza: '#EEEAF4' },
      fresita:   { nombre: 'Fresita',   cuerpo: '#F4A9BE', sombra: '#DD86A0', marca: '#B85C7C', panza: '#FFEFF3' },
      europeo:   { nombre: 'Europeo',   cuerpo: '#B98E68', sombra: '#977050', marca: '#6A4A35', panza: '#F6EADC', patron: 'atigrado' },
      manchitas: { nombre: 'Manchitas', cuerpo: '#FFFFFF', sombra: '#E6DDE2', marca: '#9A7560', panza: '#FFFFFF', patron: 'manchas' },
    },
    rata: {
      nube:   { nombre: 'Nube',   cuerpo: '#EDE6EA', sombra: '#CDBFC8', marca: '#F29AB0', panza: '#FFFFFF' },
      perla:  { nombre: 'Perla',  cuerpo: '#B8B4C2', sombra: '#958FA5', marca: '#F29AB0', panza: '#E9E6EF' },
      canela: { nombre: 'Canela', cuerpo: '#D9A37C', sombra: '#BA805A', marca: '#F29AB0', panza: '#F6E3D2' },
    },
    mapache: {
      clasico: { nombre: 'Clásico', cuerpo: '#A9A2B5', sombra: '#877F97', marca: '#4A4256', panza: '#EFEBF3' },
      lavanda: { nombre: 'Lavanda', cuerpo: '#B6A6DA', sombra: '#937EC0', marca: '#4F3F74', panza: '#F2EDFB' },
      menta:   { nombre: 'Menta',   cuerpo: '#97C7B6', sombra: '#72A592', marca: '#3E5F57', panza: '#EAF6F1' },
    },
    urraca: {
      clasica:    { nombre: 'Clásica',    cuerpo: '#2F2B3E', sombra: '#1E1B29', marca: '#5AA6D6', panza: '#FFFFFF' },
      medianoche: { nombre: 'Medianoche', cuerpo: '#352C52', sombra: '#221C38', marca: '#A48BE8', panza: '#FFFFFF' },
      aurora:     { nombre: 'Aurora',     cuerpo: '#2C3547', sombra: '#1C2332', marca: '#5CC9A8', panza: '#FFFFFF' },
    },
    // Cuervo: todo oscuro con un brillo de color en las plumas; la corneja es gris con capucha negra.
    cuervo: {
      noche:   { nombre: 'Noche',   cuerpo: '#34303F', sombra: '#211E29', marca: '#7C8CE8', panza: '#4A4558' },
      ciruela: { nombre: 'Ciruela', cuerpo: '#3A2F45', sombra: '#261E2E', marca: '#C58BE0', panza: '#52465E' },
      corneja: { nombre: 'Corneja', cuerpo: '#A29DAE', sombra: '#817B8F', marca: '#34303F', panza: '#C9C4D3' },
    },
  };

  /* ---------------- primitivas ---------------- */
  let n = 0;
  const id = () => 'rp' + (++n);
  const P = (d) => (a) => `<path d="${d}" ${a}/>`;
  const E = (cx, cy, rx, ry, rot = 0) => (a) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''} ${a}/>`;
  const trazo = (w = 4) => `fill="none" stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const plano = (shape, fill, w = 4) => shape(`fill="${fill}"`) + shape(trazo(w));
  const linea = (d, color = OUT, w = 3.5) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const espejo = (s) => `<g transform="translate(200 0) scale(-1 1)">${s}</g>`;
  const par = (s) => s + espejo(s);
  const recortado = (shape, inner) => { const i = id(); return `<clipPath id="${i}">${shape('')}</clipPath><g clip-path="url(#${i})">${inner}</g>`; };
  // sombreado cel: la forma en tono sombra y encima la misma forma desplazada arriba-izquierda en tono base
  const cel = (shape, fill, sombra, extra = '', dx = -6, dy = -7) =>
    recortado(shape, shape(`fill="${sombra}"`) + `<g transform="translate(${dx} ${dy})">${shape(`fill="${fill}"`)}</g>` + extra) + shape(trazo());
  const colaTrazo = (d, color, w) => linea(d, OUT, w + 8) + linea(d, color, w);

  /* ---------------- cara: ojos, párpados, boca ---------------- */
  function ojo(x, y, c, lado, animo) {
    const { rx, ry } = c;
    const claro = c.esclerotica;
    const tinta = claro ? '#FFFFFF' : OJO;
    if (animo === 'feliz') return linea(`M${x - rx - 2} ${y + 3} Q${x} ${y - ry - 4} ${x + rx + 2} ${y + 3}`, claro ? '#FFFFFF' : OUT, 4.5);
    if (animo === 'dormido') return linea(`M${x - rx - 2} ${y} Q${x} ${y + ry * .7} ${x + rx + 2} ${y}`, claro ? '#FFFFFF' : OUT, 4);
    const mira = animo === 'hambriento' ? -3 : animo === 'triste' ? 2 : 0;
    let s = '';
    let erx = rx, ery = ry;
    if (claro) {
      erx = rx + 4; ery = ry + 3;
      s += plano(E(x, y, erx, ery), '#FFFFFF', 3);
      s += E(x + lado * 1.5, y + mira + 1, rx * .72, ry * .8)(`fill="${OJO}"`);
    } else {
      s += E(x, y + mira * .3, rx, ry)(`fill="${OJO}"`);
      if (c.anillo) s += E(x, y + mira * .3, rx + 1.5, ry + 1.5)(`fill="none" stroke="${c.anillo}" stroke-width="2.5"`);
    }
    const hx = x - rx * .28 + (claro ? lado * 1.5 : 0), hy = y - ry * .38 + mira;
    s += `<circle cx="${hx}" cy="${hy}" r="${rx * (animo === 'hambriento' ? .55 : .42)}" fill="#fff"/>`;
    if (animo === 'hambriento') s += `<circle cx="${x + rx * .35}" cy="${y + ry * .35}" r="${rx * .2}" fill="#fff"/>`;
    // párpados
    const ext = x - lado * (erx + 4), int = x + lado * (erx + 4), top = y - ery - 9;
    let ye, yi;
    if (animo === 'triste') { ye = y - ery * .15; yi = y - ery * .95; }
    if (animo === 'enfadado') { ye = y - ery * 1.0; yi = y - ery * .05; }
    if (animo === 'sucio') { ye = y - ery * .25; yi = y - ery * .25; }
    if (animo === 'cansado') { ye = y + ery * .05; yi = y + ery * .05; }
    if (ye !== undefined) {
      s += `<path d="M${ext} ${top} L${int} ${top} L${int} ${yi} L${ext} ${ye} Z" fill="${c.piel}"/>`;
      s += linea(`M${ext + lado * 2} ${ye + (animo === 'sucio' ? 0 : 1)} L${int - lado * 2} ${yi}`, claro ? OUT : OUT, 3.5);
    }
    if (animo === 'triste' && !claro) s += '';
    return s;
  }

  function boca(mx, my, animo, estilo) {
    switch (animo) {
      case 'feliz':
        return plano(P(`M${mx - 10} ${my - 2} Q${mx} ${my + 17} ${mx + 10} ${my - 2} Q${mx} ${my + 1} ${mx - 10} ${my - 2}Z`), BOCA, 3) +
          E(mx, my + 8, 5, 3)(`fill="${LENGUA}"`);
      case 'contento':
        return estilo === 'gato'
          ? linea(`M${mx - 9} ${my} Q${mx - 4.5} ${my + 6} ${mx} ${my} Q${mx + 4.5} ${my + 6} ${mx + 9} ${my}`, OUT, 3.2)
          : linea(`M${mx - 8} ${my} Q${mx} ${my + 7} ${mx + 8} ${my}`, OUT, 3.2);
      case 'triste': return linea(`M${mx - 7} ${my + 4} Q${mx} ${my - 2} ${mx + 7} ${my + 4}`, OUT, 3.2);
      case 'enfadado':
        return plano(P(`M${mx - 11} ${my + 5} Q${mx} ${my - 7} ${mx + 11} ${my + 5} Z`), BOCA, 3) +
          plano(P(`M${mx + 2} ${my - 1} L${mx + 7} ${my + 1} L${mx + 5} ${my + 5} Z`), '#FFFFFF', 1.6);
      case 'hambriento':
        return plano(E(mx, my + 3, 6, 7), BOCA, 3) +
          plano(P(`M${mx + 9} ${my + 4} Q${mx + 12} ${my + 12} ${mx + 9} ${my + 16} Q${mx + 5} ${my + 12} ${mx + 9} ${my + 4}Z`), '#CFEAFB', 2);
      case 'sucio': return linea(`M${mx - 8} ${my + 2} q4 -4 8 0 q4 4 8 0`, OUT, 3);
      case 'dormido': return linea(`M${mx - 4} ${my + 2} L${mx + 4} ${my + 2}`, OUT, 3);
      case 'cansado': return plano(E(mx, my + 3, 4, 3.5), BOCA, 2.4);
    }
    return '';
  }

  function cara(c, animo) {
    let s = ojo(c.L[0], c.L[1], c, 1, animo) + ojo(c.R[0], c.R[1], c, -1, animo);
    if (animo === 'triste') {
      const [x, y] = c.L;
      s += plano(P(`M${x - 4} ${y + c.ry + 2} Q${x - 9} ${y + c.ry + 11} ${x - 4} ${y + c.ry + 14} Q${x + 1} ${y + c.ry + 11} ${x - 4} ${y + c.ry + 2}Z`), '#A9D4F2', 2);
    }
    if (c.boca) s += boca(c.boca[0], c.boca[1], animo, c.estiloBoca);
    return s;
  }

  /* ---------------- especies ---------------- */
  // Cada especie devuelve { detras, cuerpo, cabeza, delante, cara:{…}, anclas:{…} }

  /* Marcas del gatito según el patrón del pelaje (por defecto: rombo en la frente y bigotes pintados). */
  function marcasCabezaGato(p) {
    if (p.patron === 'manchas') {
      // Blanco con manchitas: una mancha grande en una oreja/ojo y dos pequeñas.
      return P('M98 42 Q146 36 168 64 Q172 80 150 80 Q130 80 120 70 Q108 58 98 42 Z')(`fill="${p.marca}"`) +
        E(58, 70, 7, 5.5, -20)(`fill="${p.marca}"`) + E(46, 84, 4, 3.2)(`fill="${p.marca}"`);
    }
    let s = plano(P('M100 55 L107 66 L100 77 L93 66 Z'), p.marca, 0) +
      par(linea('M38 92 L50 94', p.marca, 4.5) + linea('M40 102 L51 103', p.marca, 4.5));
    if (p.patron === 'atigrado') {
      // Gato común europeo: la "M" de la frente y rayas finas a los lados.
      s += linea('M84 58 L88 72 M116 58 L112 72', p.marca, 4) + linea('M70 64 L76 74 M130 64 L124 74', p.marca, 3.5) +
        par(linea('M146 88 L158 84', p.marca, 3.5));
    }
    return s;
  }
  function marcasCuerpoGato(p) {
    if (p.patron === 'manchas') return E(118, 162, 10, 8, 20)(`fill="${p.marca}"`) + E(80, 184, 5, 4)(`fill="${p.marca}"`);
    if (p.patron === 'atigrado') return par(linea('M70 162 L84 166 M70 176 L84 178', p.marca, 4));
    return '';
  }

  function gatito(p) {
    const cabeza = P('M100 48 C140 48 162 70 162 100 L174 108 L161 115 C152 140 128 148 100 148 C72 148 48 140 39 115 L26 108 L38 100 C38 70 60 48 100 48 Z');
    const tronco = P('M74 146 Q64 190 82 194 L118 194 Q136 190 126 146 Z');
    const oreja = P('M50 80 L42 18 L90 54 Z');
    return {
      detras:
        colaTrazo('M124 178 Q162 182 162 150 Q162 124 176 112', p.cuerpo, 11) +
        (p.patron === 'atigrado' ? linea('M154 172 L166 166 M160 148 L172 150 M162 130 L174 136', p.marca, 4) : '') +
        plano(E(178, 104, 9, 13, 28), p.marca) +
        par(cel(oreja, p.cuerpo, p.sombra) + P('M54 68 L49 34 L76 54 Z')(`fill="${ROSA}"`)),
      cuerpo:
        cel(tronco, p.cuerpo, p.sombra, marcasCuerpoGato(p) + E(100, 176, 15, 17)(`fill="${p.panza}"`)) +
        par(plano(E(79, 170, 8, 12, 8), p.panza)) +
        par(plano(E(86, 192, 13, 7), p.panza) + linea('M82 189 L82 193 M89 189 L89 193', OUT, 1.8)),
      cabeza:
        cel(cabeza, p.cuerpo, p.sombra,
          marcasCabezaGato(p) +
          E(100, 124, 23, 15)(`fill="${p.panza}"`)) +
        plano(P('M95 113 L105 113 L100 119 Z'), '#E77F9C', 2.5) +
        par(linea('M52 120 L30 116 M52 127 L32 131', OUT, 2.2)),
      delante: '',
      cara: { L: [76, 102], R: [124, 102], rx: 8.5, ry: 12, piel: p.cuerpo, boca: [100, 124], estiloBoca: 'gato' },
      anclas: { oreja: [58, 40, -20], oreja2: [142, 40, 20], top: [100, 50], cuello: 148, anchoCuello: 30, sucio: [[64, 74], [134, 128], [110, 178]] },
    };
  }

  function mapache(p) {
    const cabeza = P('M100 50 C140 50 160 70 162 96 L175 103 L163 110 L171 120 L156 123 C146 142 126 148 100 148 C74 148 54 142 44 123 L29 120 L37 110 L25 103 L38 96 C40 70 60 50 100 50 Z');
    const tronco = P('M74 146 Q64 190 82 194 L118 194 Q136 190 126 146 Z');
    const oreja = P('M48 78 Q36 38 58 30 Q78 32 88 58 Z');
    const cola = P('M118 180 Q154 198 176 170 Q196 138 180 104 Q170 92 158 102 Q170 132 150 152 Q138 164 118 166 Z');
    return {
      detras:
        cel(cola, p.cuerpo, p.sombra,
          linea('M156 186 Q166 172 162 160', p.marca, 9) + linea('M176 162 Q170 150 162 146', p.marca, 9) +
          linea('M186 132 Q176 128 168 126', p.marca, 9) + E(172, 102, 18, 14)(`fill="${p.marca}"`)) +
        par(cel(oreja, p.cuerpo, p.sombra) + P('M54 66 Q48 44 60 40 Q72 42 78 58 Z')(`fill="${p.panza}"`)),
      cuerpo:
        cel(tronco, p.cuerpo, p.sombra, E(100, 176, 16, 18)(`fill="${p.panza}"`)) +
        par(plano(E(79, 170, 8, 12, 8), p.marca)) +
        par(plano(E(86, 192, 13, 7), p.marca)),
      cabeza:
        cel(cabeza, p.cuerpo, p.sombra,
          P('M28 104 Q42 82 72 86 Q92 88 100 97 Q108 88 128 86 Q158 82 172 104 Q152 116 128 119 Q110 119 100 110 Q90 119 72 119 Q48 116 28 104 Z')(`fill="${p.marca}"`) +
          P('M100 56 Q107 70 100 88 Q93 70 100 56 Z')(`fill="${p.marca}"`) +
          E(100, 128, 24, 15)(`fill="${p.panza}"`)) +
        plano(E(100, 119, 7, 5), OJO, 2),
      delante: '',
      cara: { L: [76, 102], R: [124, 102], rx: 8, ry: 11, piel: p.marca, anillo: p.panza, boca: [100, 131], estiloBoca: 'normal' },
      anclas: { oreja: [56, 44, -20], oreja2: [144, 44, 20], top: [100, 52], cuello: 148, anchoCuello: 30, sucio: [[66, 70], [136, 132], [110, 180]] },
    };
  }

  // compactas: una bola-cabeza con extremidades alrededor
  function rata(p) {
    const bola = E(100, 132, 56, 52);
    return {
      detras:
        colaTrazo('M140 172 Q192 182 188 146 Q184 116 158 122 Q144 128 152 140 Q160 148 168 136', p.marca, 6) +
        par(cel(E(50, 88, 30, 30), p.cuerpo, p.sombra) + E(52, 90, 18, 18)(`fill="#F6B6C6"`)) +
        cel(P('M84 88 L90 62 L100 80 L108 58 L116 86 Z'), p.cuerpo, p.sombra),
      cuerpo: '',
      cabeza:
        cel(bola, p.cuerpo, p.sombra, E(100, 154, 36, 26)(`fill="${p.panza}"`)) +
        plano(E(100, 142, 17, 11), p.panza, 3) +
        plano(E(100, 136, 6, 5), p.marca, 2.5) +
        par(linea('M76 140 L54 134 M76 146 L55 149', OUT, 2.2)),
      delante:
        par(plano(E(83, 171, 8.5, 6.5), p.marca, 3) + linea('M80 168 L80 172 M86 168 L86 172', OUT, 1.4)) +
        par(plano(E(80, 190, 12, 6), p.marca, 3)),
      cara: { L: [80, 120], R: [120, 120], rx: 7.5, ry: 10.5, piel: p.cuerpo, boca: [100, 152], estiloBoca: 'gato', dientes: true },
      anclas: { oreja: [40, 66, -20], oreja2: [160, 66, 20], top: [100, 82], cuello: 176, anchoCuello: 34, sucio: [[70, 110], [136, 150], [120, 176]] },
    };
  }

  function urraca(p) {
    const bola = E(100, 132, 56, 52);
    const ala = P('M52 112 Q10 114 12 158 Q18 174 34 166 Q30 182 48 176 Q64 162 66 140 Z');
    const cola = P('M140 164 Q150 156 160 164 L166 236 L150 248 L134 236 Z');
    return {
      detras:
        `<g transform="rotate(-142 150 164)">` + cel(cola, p.cuerpo, p.sombra, P('M126 208 L174 208 L174 260 L126 260 Z')(`fill="${p.marca}"`)) + linea('M150 172 L150 240', p.marca, 2) + `</g>` +
        par(cel(ala, p.cuerpo, p.sombra,
          linea('M20 140 Q36 138 50 126', '#FFFFFF', 8) + E(20, 166, 18, 14)(`fill="${p.marca}"`))) +
        cel(P('M90 88 Q94 56 128 52 Q112 66 110 88 Z'), p.cuerpo, p.sombra),
      cuerpo: '',
      cabeza:
        cel(bola, p.cuerpo, p.sombra,
          P('M44 158 Q100 128 156 158 L156 200 L44 200 Z')(`fill="${p.panza}"`) +
          E(128, 176, 40, 20)(`fill="#DCD7E6"`) +
          linea('M60 110 Q72 90 96 86', p.marca, 5)) +
        plano(P('M89 128 Q100 120 111 128 L100 144 Z'), '#8D8AA0', 3) + linea('M94 128 Q100 125 106 128', '#C9C6D6', 2),
      delante:
        par(linea('M84 182 L84 194 M84 194 L76 199 M84 194 L84 201 M84 194 L92 199', OUT, 7) +
            linea('M84 182 L84 194 M84 194 L76 199 M84 194 L84 201 M84 194 L92 199', '#7C788F', 3.4)),
      cara: { L: [78, 118], R: [122, 118], rx: 7.5, ry: 9.5, piel: p.cuerpo, esclerotica: true, boca: null },
      anclas: { oreja: [66, 88, -20], oreja2: [138, 90, 20], top: [104, 84], cuello: 170, anchoCuello: 36, sucio: [[70, 106], [138, 148], [118, 172]] },
    };
  }

  function cuervo(p) {
    const bola = E(100, 132, 56, 52);
    const ala = P('M52 112 Q12 118 14 160 Q20 176 36 168 Q34 184 50 177 Q66 162 66 140 Z');
    const cola = P('M128 168 L174 146 L186 162 L182 180 L132 186 Z');
    const penacho = P('M90 88 Q80 62 96 52 Q98 70 102 84 Q106 58 124 56 Q112 72 112 88 Z');
    return {
      detras:
        cel(cola, p.cuerpo, p.sombra, linea('M136 176 L180 158 M138 182 L182 174', p.marca, 2.6)) +
        par(cel(ala, p.cuerpo, p.sombra, linea('M22 148 Q38 144 52 128', p.marca, 4.5) + linea('M20 162 Q34 160 46 150', p.marca, 3))) +
        cel(penacho, p.cuerpo, p.sombra),
      cuerpo: '',
      cabeza:
        cel(bola, p.cuerpo, p.sombra,
          P('M50 162 Q100 140 150 162 L150 200 L50 200 Z')(`fill="${p.panza}"`) +
          linea('M58 108 Q70 88 96 84', p.marca, 5) + linea('M142 150 Q150 136 148 122', p.marca, 3.5)) +
        // pico grande de cuervo, con la línea de la boca
        plano(P('M82 127 Q100 114 118 127 Q114 140 100 154 Q86 140 82 127 Z'), '#4E4959', 3.2) +
        linea('M87 131 Q100 127 113 131', '#9C98AC', 2.2) + E(94, 124, 3, 1.8, -15)(`fill="#8D899C"`),
      delante:
        par(linea('M84 182 L84 194 M84 194 L76 199 M84 194 L84 201 M84 194 L92 199', OUT, 7) +
            linea('M84 182 L84 194 M84 194 L76 199 M84 194 L84 201 M84 194 L92 199', '#6E6A80', 3.4)),
      cara: { L: [76, 114], R: [124, 114], rx: 7, ry: 9, piel: p.cuerpo, esclerotica: true, boca: null },
      anclas: { oreja: [70, 86, -20], oreja2: [132, 86, 20], top: [104, 70], cuello: 170, anchoCuello: 36, sucio: [[70, 106], [138, 148], [118, 172]] },
    };
  }

  const ESPECIES = { gatito, rata, mapache, urraca, cuervo };

  /* ---------------- extras de ánimo ---------------- */
  function extras(animo, a) {
    switch (animo) {
      case 'feliz':
        return plano(P('M164 26 L164 50 M164 26 L178 22 L178 44'), 'none', 4) +
          plano(E(160, 50, 5.5, 4.5, -20), '#F2A0B4', 3) + plano(E(174, 45, 5.5, 4.5, -20), '#F2A0B4', 3) +
          plano(P('M30 34 Q32 42 40 44 Q32 46 30 54 Q28 46 20 44 Q28 42 30 34Z'), '#FBE5A2', 2.5);
      case 'triste':
        return linea('M160 30 L160 46 M170 28 L170 50 M180 32 L180 44', '#8FB8DE', 3.5);
      case 'enfadado':
        return `<g transform="translate(166 40)">` + linea('M-12 -4 Q-4 -4 -4 -12 M4 -12 Q4 -4 12 -4 M12 4 Q4 4 4 12 M-4 12 Q-4 4 -12 4', OUT, 8) +
          linea('M-12 -4 Q-4 -4 -4 -12 M4 -12 Q4 -4 12 -4 M12 4 Q4 4 4 12 M-4 12 Q-4 4 -12 4', '#E8657E', 4) + `</g>`;
      case 'hambriento':
        return `<g transform="translate(160 34)">` +
          plano(E(-24, 32, 3.5, 3.5), '#FFFFFF', 2.5) + plano(E(-15, 22, 5, 5), '#FFFFFF', 2.5) + plano(E(8, 0, 26, 19), '#FFFFFF', 3) +
          `<g transform="translate(8 0)">` + plano(P('M-12 0 L-18 -7 L-18 7 Z M12 0 L18 -7 L18 7 Z'), '#F2A0B4', 2.2) +
          plano(E(0, 0, 11, 8), '#FBD68A', 2.4) + linea('M-4 -6 L-2 6 M3 -6 L5 6', '#E26F92', 2) + `</g></g>`;
      case 'sucio':
        return a.sucio.map(([x, y], i) => E(x, y, 8 - i, 5.5 - i * .5, 15)(`fill="#8C6B55" opacity=".55"`)).join('') +
          linea('M160 44 q6 -6 0 -12 q-6 -6 0 -12', '#8DB57A', 3.2) + linea('M174 52 q6 -6 0 -12 q-6 -6 0 -12', '#8DB57A', 3.2) +
          `<g transform="translate(34 44)">` + plano(E(-4, -4, 5, 3), '#E7F3FB', 1.6) + plano(E(4, -4, 5, 3), '#E7F3FB', 1.6) + `<circle r="3.2" fill="${OUT}"/></g>`;
      case 'cansado':
        // Sin pilas: una "z" pequeñita y una gota de sudor.
        return `<g font-family="Gaegu, 'Comic Sans MS', cursive" font-weight="700" fill="#D8CCF2" stroke="${OUT}" stroke-width="2.5" paint-order="stroke">` +
          `<text x="150" y="52" font-size="30">z</text></g>` +
          plano(P('M44 44 Q36 58 44 64 Q52 58 44 44 Z'), '#CFEAFB', 2.4);
      case 'dormido':
        return `<g font-family="Gaegu, 'Comic Sans MS', cursive" font-weight="700" fill="#D8CCF2" stroke="${OUT}" stroke-width="2.5" paint-order="stroke">` +
          `<text x="146" y="50" font-size="24">z</text><text x="162" y="34" font-size="34">Z</text></g>`;
    }
    return '';
  }

  /* ---------------- accesorios ---------------- */
  function accesorio(tipo, a, cfg) {
    switch (tipo) {
      case 'lazo': {
        const [x, y, r] = a.oreja2;
        return `<g transform="translate(${x} ${y}) rotate(${r})">` +
          plano(P('M0 0 Q-20 -15 -22 0 Q-20 15 0 0Z'), '#E26F92', 3) + plano(P('M0 0 Q20 -15 22 0 Q20 15 0 0Z'), '#E26F92', 3) +
          plano(E(0, 0, 5.5, 5.5), '#F7B3C4', 3) + `</g>`;
      }
      case 'flor': {
        const [x, y] = a.oreja;
        return `<g transform="translate(${x} ${y})">` +
          [0, 72, 144, 216, 288].map(g => E(0, -9, 6.5, 9, 0)(`transform="rotate(${g})" fill="#FFFFFF" stroke="${OUT}" stroke-width="2.5"`)).join('') +
          plano(E(0, 0, 5.5, 5.5), '#FBD68A', 2.5) + `</g>`;
      }
      case 'gorro': {
        const [x, y] = a.top;
        return `<g transform="translate(${x + 14} ${y - 2}) rotate(12)">` +
          plano(P('M-20 8 L0 -34 L20 8 Z'), '#B8A6E6', 3.4) + linea('M-12 -8 L10 -2 M-6 -20 L6 -16', '#FFFFFF', 3.4) +
          plano(E(0, -36, 6, 6), '#FBD68A', 3) + `</g>`;
      }
      case 'gafas': {
        const r = cfg.esclerotica ? 17 : 16;
        return plano(E(cfg.L[0], cfg.L[1], r, r), 'rgba(255,255,255,.16)', 3.4) + plano(E(cfg.R[0], cfg.R[1], r, r), 'rgba(255,255,255,.16)', 3.4) +
          linea(`M${cfg.L[0] + r} ${cfg.L[1] - 2} Q100 ${cfg.L[1] - 9} ${cfg.R[0] - r} ${cfg.R[1] - 2}`, OUT, 3.4);
      }
      case 'bufanda': {
        const y = a.cuello, w = a.anchoCuello;
        return plano(P(`M${100 - w - 4} ${y - 8} Q100 ${y + 6} ${100 + w + 4} ${y - 8} L${100 + w + 6} ${y + 4} Q100 ${y + 20} ${100 - w - 6} ${y + 4} Z`), '#8CCBB2', 3.4) +
          plano(P(`M${100 + w - 16} ${y + 4} L${100 + w - 2} ${y + 2} L${100 + w + 2} ${y + 30} L${100 + w - 14} ${y + 32} Z`), '#8CCBB2', 3.4) +
          linea(`M${100 + w - 13} ${y + 25} L${100 + w} ${y + 24}`, '#5E9E86', 2.6);
      }
    }
    return '';
  }

  /* ---------------- ensamblado ---------------- */
  function mascota(o = {}) {
    const esp = ESPECIES[o.especie] ? o.especie : 'gatito';
    const animo = o.animo || 'contento';
    const pel = PELAJES[esp];
    const p = pel[o.pelaje] || pel[Object.keys(pel)[0]];
    const tam = o.tam || 200;
    const acc = o.accesorio && o.accesorio !== 'ninguno' ? o.accesorio : '';
    const s = ESPECIES[esp](p);
    const compacto = esp === 'rata' || esp === 'urraca' || esp === 'cuervo';
    let fig = s.detras + s.cuerpo + (acc === 'bufanda' && !compacto ? accesorio('bufanda', s.anclas, s.cara) : '') +
      s.cabeza + cara(s.cara, animo) +
      (s.cara.dientes && ['contento', 'triste', 'sucio'].includes(animo) ? plano(P('M96 157 L104 157 L104 164 Q100 166 96 164 Z'), '#FFFFFF', 2) + linea('M100 157 L100 164', OUT, 1.4) : '') +
      (acc === 'bufanda' && compacto ? accesorio('bufanda', s.anclas, s.cara) : '') +
      s.delante + (acc && acc !== 'bufanda' ? accesorio(acc, s.anclas, s.cara) : '');
    if (compacto) fig = `<g transform="translate(100 198) scale(.92) translate(-100 -198)">${fig}</g>`;
    return `<svg class="pet pet--${animo}" viewBox="0 0 200 206" width="${tam}" height="${Math.round(tam * 1.03)}" role="img" aria-label="${o.nombre || esp}: ${animo}" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="100" cy="198" rx="${compacto ? 46 : 52}" ry="6" fill="${OUT}" opacity=".14"/>` +
      `<g class="pet__body">${fig}</g>` + extras(animo, s.anclas) + `</svg>`;
  }

export const ANIMOS = ['feliz', 'contento', 'triste', 'enfadado', 'hambriento', 'sucio', 'dormido', 'cansado'];
export const ACCESORIOS = ['ninguno', 'lazo', 'flor', 'gorro', 'gafas', 'bufanda'];
export const TINTA = OUT;
export { mascota, PELAJES };
