(() => {
  const CLAVE = 'anotador-truco';
  const LIMITES = [15, 20, 30, 40];
  const equipos = [...document.querySelectorAll('.equipo')];
  const radios = [...document.querySelectorAll('input[name="limite"]')];
  const modal = document.getElementById('confirmar');
  const btnSi = document.getElementById('confirmar-si');
  const btnNo = document.getElementById('confirmar-no');

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

  function cuadro(c, puntos, anterior) {
    const enCuadro = Math.max(0, Math.min(5, puntos - c * 5));
    let lineas = '<rect class="guia" x="10" y="10" width="44" height="44" rx="2"/>';
    for (let i = 0; i < enCuadro; i++) lineas += palito(LADOS[i], c * 5 + i + 1 > anterior);
    return `<svg class="cuadro" viewBox="0 0 64 64" aria-hidden="true">${lineas}</svg>`;
  }

  function dibujarFosforos(contenedor, puntos, anterior) {
    const cuadros = estado.limite / 5;
    const grupos = tieneBuenas() ? [[0, cuadros / 2], [cuadros / 2, cuadros]] : [[0, cuadros]];
    contenedor.innerHTML = grupos.map(([desde, hasta]) => {
      let html = '';
      for (let c = desde; c < hasta; c++) html += cuadro(c, puntos, anterior);
      return `<div class="grupo">${html}</div>`;
    }).join('<div class="separador"></div>');
    ajustar(contenedor);
  }

  // Calcula el tamaño de los cuadraditos para que entren sin scroll.
  // Si en una sola columna quedan chicos, pone malas y buenas lado a lado.
  const GAP = 6, MAX = 64;
  function ajustar(el) {
    const n = estado.limite / 5;
    const H = el.clientHeight, W = el.clientWidth;
    if (!H || !W) return;
    let lado, dos = false;
    if (!tieneBuenas()) {
      lado = Math.min(MAX, (H - (n - 1) * GAP) / n, W * 0.8);
    } else {
      const una = Math.min(MAX, (H - 6 - n * GAP) / n, W * 0.8);
      const filas = n / 2;
      const dosCol = Math.min(MAX, (H - (filas - 1) * GAP) / filas, (W - 2 * GAP - 6) / 2);
      lado = una;
      if (una < 44 && dosCol > una + 2) { lado = dosCol; dos = true; }
    }
    el.classList.toggle('dos', dos);
    el.style.setProperty('--filas', n / 2);
    el.style.setProperty('--lado', Math.max(8, Math.floor(lado)) + 'px');
  }

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(entradas => entradas.forEach(e => ajustar(e.target)));
    document.querySelectorAll('.fosforos').forEach(f => ro.observe(f));
  }

  // Alto real visible (descuenta las barras del navegador del celular)
  function fijarAlto() {
    document.documentElement.style.setProperty('--alto', window.innerHeight + 'px');
    document.querySelectorAll('.fosforos').forEach(ajustar);
  }
  window.addEventListener('resize', fijarAlto);
  window.addEventListener('orientationchange', () => setTimeout(fijarAlto, 300));
  fijarAlto();

  function render(anteriores = estado.puntos) {
    radios.forEach(r => { r.checked = Number(r.value) === estado.limite; });
    equipos.forEach((el, i) => {
      const p = estado.puntos[i];
      el.querySelector('.nombre').value = estado.nombres[i];
      el.querySelector('.puntos').textContent = p;
      const est = el.querySelector('.estado');
      const gano = p === estado.limite;
      const buenas = gano || (tieneBuenas() && p >= mitad());
      if (gano) est.textContent = '¡Ganó!';
      else if (!tieneBuenas()) est.textContent = `Faltan ${estado.limite - p}`;
      else est.textContent = buenas ? `Buenas (${p - mitad()})` : `Malas (${p})`;
      est.classList.toggle('buenas', buenas);
      el.classList.toggle('ganador', gano);
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
    partidaTerminada = estado.puntos.includes(estado.limite);
  }

  function nuevaPartida() {
    estado.puntos = [0, 0];
    partidaTerminada = false;
    guardar();
    render();
  }

  // Pop-up de confirmación; devuelve una promesa con true/false
  let responder = null;
  function confirmar(titulo, texto, textoSi) {
    document.getElementById('confirmar-titulo').textContent = titulo;
    document.getElementById('confirmar-texto').textContent = texto;
    btnSi.textContent = textoSi;
    modal.hidden = false;
    btnSi.focus();
    return new Promise(res => { responder = res; });
  }
  function cerrarModal(respuesta) {
    modal.hidden = true;
    if (responder) responder(respuesta);
    responder = null;
  }
  btnSi.addEventListener('click', () => cerrarModal(true));
  btnNo.addEventListener('click', () => cerrarModal(false));
  modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) cerrarModal(false); });

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

  document.getElementById('reiniciar').addEventListener('click', async () => {
    if (hayPuntos() && !(await confirmar('¿Nueva partida?', 'Se borran los puntos de los dos equipos.', 'Sí, empezar de nuevo'))) return;
    nuevaPartida();
  });

  radios.forEach(r => r.addEventListener('change', async () => {
    const limite = Number(r.value);
    if (hayPuntos() && !(await confirmar(`¿Partida a ${limite}?`, 'Cambiar los puntos reinicia la partida actual.', `Sí, jugar a ${limite}`))) {
      render();
      return;
    }
    estado.limite = limite;
    nuevaPartida();
  }));

  render();
  partidaTerminada = estado.puntos.includes(estado.limite);

  // Instalable / funciona sin conexión
  // Cuando hay una versión nueva, la app se recarga sola (la partida queda guardada)
  if ('serviceWorker' in navigator) {
    const habiaVersion = !!navigator.serviceWorker.controller;
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!habiaVersion || recargando) return;
      recargando = true;
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
        .then(reg => reg.update())
        .catch(() => {});
    });
  }
})();
