// --- CONFIGURACIÓN ---
// Usamos carpeta local "modelo/"
const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/wcWg1uV_P/';
let classifier;

// --- GESTIÓN DE AUDIO ---
let audioFondo = new Audio('audio/background_musica_medieval.mp3');
let audioBatalla = new Audio('audio/musica_batalla.mp3');
let sfxVictoria = new Audio('audio/sonido_victoria.mp3');
let sfxDerrota = new Audio('audio/sonido_derrota.mp3');
let sfxEspada = new Audio('audio/espadazo_hombre_grave.mp3');
let sfxRayo = new Audio('audio/rayo_mujer_agudo.mp3');
let sfxDano = new Audio('audio/daño_recibido.mp3');

// Configuraciones (Loop y Volumen)
audioFondo.loop = true; audioFondo.volume = 0.5;
audioBatalla.loop = true; audioBatalla.volume = 0.3;

function pararMusica() {
    audioFondo.pause(); audioFondo.currentTime=0;
    audioBatalla.pause(); audioBatalla.currentTime=0;
    sfxVictoria.pause(); sfxVictoria.currentTime=0;
    sfxDerrota.pause(); sfxDerrota.currentTime=0;
}

// --- ENEMIGOS (RUTAS EXACTAS WEBP) ---
const ENEMIGOS = [
    { 
        nombre: "Slime Verde", 
        sprite: "imagenes/slime_verde.webp", 
        debilidad: "Neutro", 
        desc: "Nivel 1: Vulnerable a todo." 
    },
    { 
        nombre: "Caballero Oscuro", 
        sprite: "imagenes/caballero_oscuro.webp", 
        debilidad: "Aguda", 
        fuerte: "Grave", 
        desc: "Nivel 2: Inmune a ESPADA. Usa MAGIA (Aguda)." 
    },
    { 
        nombre: "Guerrero Dragón", 
        sprite: "imagenes/guerrero_dragon.webp", 
        debilidad: "Grave", 
        fuerte: "Aguda", 
        desc: "Nivel 3: Inmune a MAGIA. Usa FUERZA (Grave)." 
    }
];

// --- ESTADO DEL JUEGO ---
let nivel = 0;
let vidas = 5;
let hpEnemigo = 100;
let esperandoVoz = false;

// --- CARGA INICIAL ---
function preload() {
    classifier = ml5.soundClassifier(MODEL_URL + 'model.json');
}
function setup() { noCanvas(); console.log("IA Lista"); }

// Hack para activar audio en Chrome
function intentarAudio() {
    if (audioFondo.paused && document.getElementById('start-screen').classList.contains('active')) {
        audioFondo.play().catch(e => console.log("Click para audio"));
    }
}

// --- NAVEGACIÓN DE PANTALLAS ---
function mostrarTutorial() { cambioPantalla('tutorial-screen'); }
function cerrarTutorial() { cambioPantalla('start-screen'); }

function iniciarJuego() {
    classifier.classify(gotResult);
    pararMusica();
    audioBatalla.play();
    
    nivel = 0;
    vidas = 5;
    cargarNivel(0);
    cambioPantalla('game-container');
}

function cargarNivel(idx) {
    if (idx >= ENEMIGOS.length) { finJuego(true); return; }
    
    nivel = idx;
    hpEnemigo = 100;
    actualizarHUD();
    
    // Configurar imagen y textos del enemigo
    document.getElementById('nombre-enemigo').innerText = ENEMIGOS[nivel].nombre;
    document.getElementById('enemigo-img').src = ENEMIGOS[nivel].sprite;
    document.getElementById('nivel-txt').innerText = nivel + 1;
    
    prepararTurno();
}

function prepararTurno() {
    esperandoVoz = false;
    document.getElementById('mensaje-juego').innerText = ENEMIGOS[nivel].desc;
    document.getElementById('estado-voz').innerText = "Tu turno...";
    document.getElementById('btn-action').style.display = 'flex';
}

function activarEscucha() {
    esperandoVoz = true;
    document.getElementById('mensaje-juego').innerText = "🔴 ¡HABLA AHORA!";
    document.getElementById('estado-voz').innerText = "Escuchando...";
    document.getElementById('btn-action').style.display = 'none';
}

// --- LÓGICA DE INTELIGENCIA ARTIFICIAL ---
function gotResult(error, results) {
    if (error || !esperandoVoz) return;
    
    let voz = results[0].label;
    if (results[0].confidence > 0.85) {
        if (voz === "Grave" || voz === "Aguda") atacar(voz);
    }
}

// --- COMBATE: TU TURNO ---
function atacar(voz) {
    esperandoVoz = false;
    let enemigo = ENEMIGOS[nivel];
    
    // 1. Sonido y Animación Jugador
    if (voz === "Grave") sfxEspada.play(); else sfxRayo.play();
    animar('jugador-img', 'anim-ataque-jugador');

    // 2. Cálculo Daño
    let dano = 0, msg = "";
    if (enemigo.debilidad === "Neutro") { dano=34; msg="¡Golpe Directo!"; }
    else if (voz === enemigo.debilidad) { dano=50; msg="¡CRÍTICO!"; }
    else if (voz === enemigo.fuerte) { dano=5; msg="¡Resistido!"; }
    else { dano=20; msg="Daño normal."; }

    // 3. Aplicar Daño
    if (dano > 5) animar('enemigo-img', 'anim-dano'); // Animación daño al enemigo
    hpEnemigo -= dano;
    actualizarHUD();
    
    document.getElementById('mensaje-juego').innerText = `Usaste ${voz}: ${msg}`;

    if (hpEnemigo <= 0) {
        setTimeout(() => {
            // Recuperar vida al ganar
            if (vidas < 5) { vidas++; alert("¡Victoria! +1 Vida ❤️"); }
            cargarNivel(nivel + 1);
        }, 1500);
    } else {
        setTimeout(turnoEnemigo, 2000);
    }
}

// --- COMBATE: TURNO ENEMIGO ---
function turnoEnemigo() {
    document.getElementById('mensaje-juego').innerText = "El enemigo ataca...";
    
    // 1. Animación Ataque Enemigo
    animar('enemigo-img', 'anim-ataque-enemigo');

    // Probabilidad de golpe: 30% -> 45% -> 60%
    let prob = 0.30 + (nivel * 0.15);
    
    setTimeout(() => {
        if (Math.random() < prob) {
            // ¡GOLPE ACERTADO!
            sfxDano.currentTime = 0;
            sfxDano.play(); // Sonido daño

            vidas--;
            animar('jugador-img', 'anim-dano'); // Animación daño Jugador
            document.getElementById('mensaje-juego').innerText = "¡Te golpearon! 💥";
            actualizarHUD();
            
            if (vidas <= 0) finJuego(false);
            else setTimeout(prepararTurno, 1500);
        } else {
            // FALLÓ
            document.getElementById('mensaje-juego').innerText = "¡El enemigo falló! 💨";
            setTimeout(prepararTurno, 1500);
        }
    }, 500); 
}

// --- UTILIDADES ---
function animar(id, clase) {
    let el = document.getElementById(id);
    el.classList.remove(clase); 
    void el.offsetWidth; // Truco reiniciar animación
    el.classList.add(clase);
    setTimeout(() => el.classList.remove(clase), 500);
}

function actualizarHUD() {
    let ancho = Math.max(0, hpEnemigo);
    document.getElementById('hp-enemigo-bar').style.width = ancho + "%";
    document.getElementById('texto-vidas').innerText = `TÚ (${"❤️".repeat(vidas)})`;
}

function cambioPantalla(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active'); s.classList.add('hidden');
    });
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).classList.add('active');
}

function finJuego(victoria) {
    pararMusica();
    cambioPantalla('end-screen');
    let titulo = document.getElementById('titulo-final');
    let icono = document.getElementById('icono-final');
    
    if (victoria) {
        sfxVictoria.play();
        titulo.innerText = "¡VICTORIA!"; titulo.style.color = "#0f0";
        icono.innerText = "🏆";
        // MENSAJE FINAL SOLICITADO
        document.getElementById('mensaje-final').innerText = "¡Has completado la mazmorra!\nMuchas gracias por jugar.";
    } else {
        sfxDerrota.play();
        titulo.innerText = "DERROTA"; titulo.style.color = "#f00";
        icono.innerText = "💀";
        document.getElementById('mensaje-final').innerText = "Te quedaste sin vidas...";
    }
}

function reiniciarJuego() {
    pararMusica();
    audioFondo.play();
    cambioPantalla('start-screen');
}

// Truco Teclas (Flechas arriba/abajo para probar sin voz)
document.addEventListener('keydown', e => {
    if (esperandoVoz) {
        if (e.key === "ArrowUp") atacar("Grave");
        if (e.key === "ArrowDown") atacar("Aguda");
    }
});