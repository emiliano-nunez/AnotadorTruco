(() => {
  const CLAVE = 'anotador-truco';
  const equipos = [...document.querySelectorAll('.equipo')];
  const selLimite = document.getElementById('limite');
  const btnDeshacer = document.getElementById('deshacer');
  const modal = document.getElementById('ganador');

  let estado = cargar() || { puntos: [0, 0], nombres: ['Nosotros', 'Ellos'], limite: 30 };
  let historial = [];
  let partidaTerminada = false;

  function cargar() {
    try { return JSON.parse(localStorage.getItem(CLAVE)); } catch { return null; }
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch {}
  }

  // Coordenadas de los 5 palitos de un cuadrado: 4 lados + diagonal
  const LADOS = [
    [10, 10, 10, 54], // izquierda
    [10, 10, 54, 10], // arriba
    [54, 10, 54, 54], // derecha
    [10, 54, 54, 54], // abajo
    [10, 54, 54, 10], // diagonal
  ];

  function palito([x1, y1, x2, y2], nuevo) {
    return `<g class="palito${nuevo ? ' nuevo' : ''}">
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
      <circle cx="${x2}" cy="${y2}" r="4"/>
    </g>`;
  }

  function dibujarFosforos(contenedor, puntos, anterior) {
    const mitad = estado.limite / 2;
    const cuadros = Math.ceil(estado.limite / 5);
    let html = '';
    for (let c = 0; c < cuadros; c++) {
      if (c * 5 === mitad && estado.limite === 30) html += '<div class="separador"></div>';
      const enCuadro = Math.max(0, Math.min(5, puntos - c * 5));
      let lineas = '';
      for (let i = 0; i < enCuadro; i++) {
        const n = c * 5 + i + 1;
        lineas += palito(LADOS[i], n > anterior);
      }
      html += `<svg class="cuadro" viewBox="0 0 64 64">${lineas}</svg>`;
    }
    contenedor.innerHTML = html;
  }

  function render(anteriores = estado.puntos) {
    selLimite.value = estado.limite;
    equipos.forEach((el, i) => {
      const p = estado.puntos[i];
      el.querySelector('.nombre').value = estado.nombres[i];
      el.querySelector('.puntos').textContent = p;
      const est = el.querySelector('.estado');
      if (estado.limite === 30) {
        const buenas = p >= 15;
        est.textContent = buenas ? `Buenas (${p - 15})` : `Malas (${p})`;
        est.classList.toggle('buenas', buenas);
      } else {
        est.textContent = `Faltan ${estado.limite - p}`;
        est.classList.remove('buenas');
      }
      dibujarFosforos(el.querySelector('.fosforos'), p, anteriores[i]);
    });
    btnDeshacer.disabled = historial.length === 0;
  }

  function cambiar(i, delta) {
    if (partidaTerminada && delta > 0) return;
    const nuevo = Math.max(0, Math.min(estado.limite, estado.puntos[i] + delta));
    if (nuevo === estado.puntos[i]) return;
    const anteriores = [...estado.puntos];
    historial.push(anteriores);
    estado.puntos[i] = nuevo;
    guardar();
    render(anteriores);
    if (navigator.vibrate) navigator.vibrate(20);
    if (nuevo === estado.limite) ganar(i);
    else partidaTerminada = false;
  }

  function ganar(i) {
    partidaTerminada = true;
    document.getElementById('texto-ganador').textContent = `¡Ganó ${estado.nombres[i]}!`;
    modal.hidden = false;
  }

  function nuevaPartida() {
    estado.puntos = [0, 0];
    historial = [];
    partidaTerminada = false;
    modal.hidden = true;
    guardar();
    render();
  }

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

  btnDeshacer.addEventListener('click', () => {
    if (!historial.length) return;
    estado.puntos = historial.pop();
    partidaTerminada = false;
    modal.hidden = true;
    guardar();
    render();
  });

  document.getElementById('reiniciar').addEventListener('click', () => {
    if (estado.puntos.some(p => p > 0) && !confirm('¿Empezar una nueva partida?')) return;
    nuevaPartida();
  });

  selLimite.addEventListener('change', () => {
    const limite = Number(selLimite.value);
    if (estado.puntos.some(p => p > 0) && !confirm('Cambiar el límite reinicia la partida. ¿Continuar?')) {
      selLimite.value = estado.limite;
      return;
    }
    estado.limite = limite;
    nuevaPartida();
  });

  document.getElementById('revancha').addEventListener('click', nuevaPartida);
  document.getElementById('cerrar-modal').addEventListener('click', () => { modal.hidden = true; });

  render();
  if (estado.puntos.includes(estado.limite)) partidaTerminada = true;
})();
