// JVL Skillcheck UI: one or more rounds; press the shown key while the indicator is inside the zone.
const RADIO = 62;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

const contenedor = document.getElementById('skillcheck');
const zona = document.getElementById('zona');
const indicador = document.getElementById('indicador');
const teclaEl = document.getElementById('tecla');
const rondasEl = document.getElementById('rondas');

let estado = null; // { rondas, teclas, indice, tecla, inicioZona, tamanoZona, duracion, t0, frame, terminado }

const recurso = typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'jvl_skillcheck';

function enviar(ruta, datos) {
    fetch(`https://${recurso}/${ruta}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(datos || {}),
    }).catch(() => {});
}

function dibujarPuntos() {
    rondasEl.innerHTML = '';
    estado.rondas.forEach((_, i) => {
        const punto = document.createElement('span');
        if (i < estado.indice) punto.classList.add('hecha');
        else if (i === estado.indice) punto.classList.add('actual');
        rondasEl.appendChild(punto);
    });
}

function ponerZona(inicio, tamano) {
    const largo = (tamano / 360) * CIRCUNFERENCIA;
    zona.style.strokeDasharray = `${largo} ${CIRCUNFERENCIA}`;
    zona.style.transform = `rotate(${inicio - 90}deg)`;
}

function iniciarRonda() {
    const ronda = estado.rondas[estado.indice];
    const tamano = Math.max(5, Math.min(180, ronda.areaSize));
    // The zone never starts right under the indicator, so the player always has time to react.
    const inicio = 100 + Math.random() * (340 - tamano - 100);
    estado.inicioZona = inicio;
    estado.tamanoZona = tamano;
    estado.duracion = estado.baseTurnTime / Math.max(0.1, ronda.speedMultiplier);
    estado.tecla = estado.teclas[Math.floor(Math.random() * estado.teclas.length)];
    estado.t0 = performance.now();

    contenedor.classList.remove('exito', 'fallo');
    teclaEl.textContent = estado.tecla;
    ponerZona(inicio, tamano);
    dibujarPuntos();
    cancelAnimationFrame(estado.frame);
    estado.frame = requestAnimationFrame(animar);
}

function anguloActual() {
    return ((performance.now() - estado.t0) / estado.duracion) * 360;
}

function animar() {
    if (!estado || estado.terminado) return;
    const angulo = anguloActual();
    indicador.style.transform = `rotate(${angulo}deg)`;
    if (angulo > estado.inicioZona + estado.tamanoZona) return terminar(false);
    estado.frame = requestAnimationFrame(animar);
}

function terminar(exito) {
    if (!estado || estado.terminado) return;
    estado.terminado = true;
    cancelAnimationFrame(estado.frame);
    contenedor.classList.add(exito ? 'exito' : 'fallo');
    const puntos = rondasEl.querySelectorAll('span');
    if (puntos[estado.indice]) puntos[estado.indice].className = exito ? 'hecha' : 'fallo';
    enviar('finish', { success: exito });
    setTimeout(() => {
        contenedor.classList.add('oculto');
        estado = null;
    }, 450);
}

function rondaSuperada() {
    estado.indice += 1;
    dibujarPuntos();
    if (estado.indice >= estado.rondas.length) return terminar(true);
    enviar('roundOk');
    contenedor.classList.add('exito');
    cancelAnimationFrame(estado.frame);
    setTimeout(() => { if (estado && !estado.terminado) iniciarRonda(); }, 250);
}

window.addEventListener('keydown', (evento) => {
    if (!estado || estado.terminado || evento.repeat) return;
    const tecla = (evento.key || '').toLowerCase();
    if (!estado.teclas.includes(tecla)) return; // Keys outside the list are ignored.
    if (tecla !== estado.tecla) return terminar(false);
    const angulo = anguloActual();
    if (angulo >= estado.inicioZona && angulo <= estado.inicioZona + estado.tamanoZona) rondaSuperada();
    else terminar(false);
});

window.addEventListener('message', (evento) => {
    const datos = evento.data || {};
    if (datos.action === 'start') {
        estado = {
            rondas: datos.rounds || [{ areaSize: 50, speedMultiplier: 1 }],
            teclas: (datos.keys || ['e']).map((t) => String(t).toLowerCase()),
            baseTurnTime: datos.baseTurnTime || 2000,
            indice: 0,
            terminado: false,
        };
        contenedor.classList.toggle('abajo', datos.position === 'bottom');
        contenedor.classList.remove('oculto', 'exito', 'fallo');
        iniciarRonda();
    } else if (datos.action === 'cancel') {
        terminar(false);
    }
});
