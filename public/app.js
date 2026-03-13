// public/app.js

const pttBtn = document.getElementById('ptt-btn');

// --- GERADOR DE BIP (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function tocarBip(frequencia, tipo, duracao) {
    // Só toca se o navegador liberar o áudio
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = tipo; // 'sine', 'square', 'sawtooth', 'triangle'
    oscillator.frequency.value = frequencia;
    
    // Conecta o som ao volume geral do navegador
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    // Faz o volume diminuir suavemente para não dar "estalo"
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duracao);
    oscillator.stop(audioCtx.currentTime + duracao);
}

// --- LÓGICA DO BOTÃO PTT ---
function falar() {
    if (localStream) {
        localStream.getAudioTracks()[0].enabled = true; // Abre microfone
        pttBtn.innerText = "Transmitindo...";
        tocarBip(800, 'sine', 0.15); // Bip agudo ao apertar
    }
}

function silenciar() {
    if (localStream && localStream.getAudioTracks()[0].enabled === true) {
        localStream.getAudioTracks()[0].enabled = false; // Fecha microfone
        pttBtn.innerText = "Pressione para Falar";
        tocarBip(400, 'sine', 0.15); // Bip grave ao soltar (câmbio)
    }
}

// Escuta Mouse
pttBtn.addEventListener('mousedown', falar);
pttBtn.addEventListener('mouseup', silenciar);
pttBtn.addEventListener('mouseleave', silenciar);

// Escuta Toque (Celular)
pttBtn.addEventListener('touchstart', (e) => { e.preventDefault(); falar(); });
pttBtn.addEventListener('touchend', (e) => { e.preventDefault(); silenciar(); });

// Inicia pedindo o microfone (Função que está lá no webrtc.js)
iniciarMidia();
