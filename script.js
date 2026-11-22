(() => {
  const CLAVE = 'anotador-truco';
  const LIMITES = [15, 20, 30, 40];
  const equipos = [...document.querySelectorAll('.equipo')];
  const radios = [...document.querySelectorAll('input[name="limite"]')];
  const modal = document.getElementById('ganador');

  let estado = cargar();
  let partidaTerminada = false;

  function cargar() {
    let e = null;
    try { e = JSON.parse(localStorage.getItem(CLAVE)); } catch {}
    if (!e || !Array.isArray(e.puntos)) e = { puntos: [0, 0], nombres: ['Nosotros', 'Ellos'], limite: 30 };
    if (!LIMITES.includes(e.limite)) e.limite = 30;
    e.puntos = e.puntos.map(p => Math.min(p, e.limite));
    return e;
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch {}
  }

  // A 15 se juega solo malas; el resto se divide en malas y buenas.
  const tieneBuenas = () => estado.limite !== 15;
  const mitad = () => estado.limite / 2;

  // Los 5 palitos de un cuadrado: 4 lados + diagonal
  const LADOS = [
    [10, 10, 10, 54],
    [10, 10, 54, 10],
    [54, 10, 54, 54],
    [10, 54, 54, 54],
    [10, 54, 54, 10],
  ];

  function palito([x1, y1, x2, y2], nuevo) {
    return `<g class="palito${nuevo ? ' nuevo' : ''}">
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
      <circle cx="${x2}" cy="${y2}" r="4"/>
    </g>`;
  }

  function dibujarFosforos(contenedor, puntos, anterior) {
    const cuadros = estado.limite / 5;
    contenedor.style.setProperty('--n', cuadros);
    let html = '';
    for (let c = 0; c < cuadros; c++) {
      if (tieneBuenas() && c > 0 && c * 5 === mitad()) html += '<div class="separador"></div>';
      const enCuadro = Math.max(0, Math.min(5, puntos - c * 5));
      let lineas = '<rect class="guia" x="10" y="10" width="44" height="44" rx="2"/>';
      for (let i = 0; i < enCuadro; i++) {
        lineas += palito(LADOS[i], c * 5 + i + 1 > anterior);
      }
      html += `<svg class="cuadro" viewBox="0 0 64 64" aria-hidden="true">${lineas}</svg>`;
    }
    contenedor.innerHTML = html;
  }

  function render(anteriores = estado.puntos) {
    radios.forEach(r => { r.checked = Number(r.value) === estado.limite; });
    equipos.forEach((el, i) => {
      const p = estado.puntos[i];
      el.querySelector('.nombre').value = estado.nombres[i];
      el.querySelector('.puntos').textContent = p;
      const est = el.querySelector('.estado');
      const buenas = tieneBuenas() && p >= mitad();
      if (!tieneBuenas()) est.textContent = `Faltan ${estado.limite - p}`;
      else est.textContent = buenas ? `Buenas (${p - mitad()})` : `Malas (${p})`;
      est.classList.toggle('buenas', buenas);
      dibujarFosforos(el.querySelector('.fosforos'), p, anteriores[i]);
    });
  }

  function cambiar(i, delta) {
    if (partidaTerminada && delta > 0) return;
    const nuevo = Math.max(0, Math.min(estado.limite, estado.puntos[i] + delta));
    if (nuevo === estado.puntos[i]) return;
    const anteriores = [...estado.puntos];
    estado.puntos[i] = nuevo;
    guardar();
    render(anteriores);
    if (navigator.vibrate) navigator.vibrate(20);
    if (nuevo === estado.limite) ganar(i);
    else partidaTerminada = estado.puntos.includes(estado.limite);
  }

  function ganar(i) {
    partidaTerminada = true;
    document.getElementById('texto-ganador').textContent = `¡Ganó ${estado.nombres[i]}!`;
    modal.hidden = false;
  }

  function nuevaPartida() {
    estado.puntos = [0, 0];
    partidaTerminada = false;
    modal.hidden = true;
    guardar();
    render();
  }

  const hayPuntos = () => estado.puntos.some(p => p > 0);

  equipos.forEach((el, i) => {
    el.querySelector('.mas').addEventListener('click', () => cambiar(i, 1));
    el.querySelector('.menos').addEventListener('click', () => cambiar(i, -1));
    el.querySelector('.fosforos').addEventListener('click', () => cambiar(i, 1));
    const input = el.querySelector('.nombre');
    input.addEventListener('input', () => {
      estado.nombres[i] = input.value.trim() || (i === 0 ? 'Nosotros' : 'Ellos');
      guardar();
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
  });

  document.getElementById('reiniciar').addEventListener('click', () => {
    if (hayPuntos() && !confirm('¿Empezar una nueva partida?')) return;
    nuevaPartida();
  });

  radios.forEach(r => r.addEventListener('change', () => {
    const limite = Number(r.value);
    if (hayPuntos() && !confirm('Cambiar los puntos de la partida la reinicia. ¿Continuar?')) {
      render();
      return;
    }
    estado.limite = limite;
    nuevaPartida();
  }));

  document.getElementById('revancha').addEventListener('click', nuevaPartida);
  document.getElementById('cerrar-modal').addEventListener('click', () => { modal.hidden = true; });

  render();
  partidaTerminada = estado.puntos.includes(estado.limite);

  // Instalable / funciona sin conexión
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
