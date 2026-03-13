// public/app.js

const socket = io();

// Elementos da Tela
const loginScreen = document.getElementById('login-screen');
const radioScreen = document.getElementById('radio-screen');
const joinBtn = document.getElementById('join-btn');
const usernameInput = document.getElementById('username-input');
const pttBtn = document.getElementById('ptt-btn');
const statusText = document.getElementById('status');
const usersList = document.getElementById('users-list');

// Variáveis Globais de Áudio
let audioCtx;
let mediaRecorder;
let pedacosDeAudio = [];

// --- LÓGICA DE LOGIN ---
joinBtn.addEventListener('click', () => {
    const nome = usernameInput.value.trim();
    if (nome !== "") {
        // Inicia o motor de áudio para os bipes
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        loginScreen.style.display = 'none';
        radioScreen.style.display = 'flex';
        
        prepararGravacao(nome);
    } else {
        alert("Por favor, digite um nome de identificação!");
    }
});

// --- ATUALIZAÇÃO DA LISTA DE USUÁRIOS ---
socket.on('atualizar-lista', (usuarios) => {
    usersList.innerHTML = ''; 
    for (let id in usuarios) {
        const li = document.createElement('li');
        li.innerText = id === socket.id ? `${usuarios[id]} (Você)` : usuarios[id];
        usersList.appendChild(li);
    }
});

// --- GRAVAÇÃO E TRANSMISSÃO DE ÁUDIO ---
async function prepararGravacao(nome) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Configura o gravador de voz
        mediaRecorder = new MediaRecorder(stream);

        // Enquanto estiver gravando, guarda os dados de som
        mediaRecorder.ondataavailable = (evento) => {
            if (evento.data.size > 0) pedacosDeAudio.push(evento.data);
        };

        // Quando o botão for solto (gravação parar), junta e envia!
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(pedacosDeAudio, { type: 'audio/webm' });
            pedacosDeAudio = []; // Limpa para a próxima fala
            
            // Envia o áudio completo para o servidor!
            socket.emit('audio-transmitido', audioBlob);
        };

        statusText.innerText = "Conectado à frequência.";
        pttBtn.disabled = false;
        
        // Avisa ao servidor que entramos
        socket.emit('entrar', nome); 
    } catch (error) {
        statusText.innerText = "Erro: Permita o microfone.";
    }
}

// --- RECEBIMENTO DO ÁUDIO ---
socket.on('audio-recebido', (dados) => {
    // Transforma o pacote binário em um link temporário tocável
    const audioBlob = new Blob([dados.audio], { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Cria um reprodutor invisível e toca
    const reprodutor = new Audio(audioUrl);
    reprodutor.play();
    
    // Muda o status para mostrar quem está falando
    statusText.innerText = `🔊 Ouvindo ${dados.de}...`;
    statusText.style.color = "#f39c12"; // Fica laranja
    
    reprodutor.onended = () => {
        statusText.innerText = "Conectado à frequência.";
        statusText.style.color = "white";
    };
});

// --- GERADOR DE BIP ---
function tocarBip(frequencia, tipo, duracao) {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = tipo;
    oscillator.frequency.setValueAtTime(frequencia, audioCtx.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duracao);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duracao);
}

// --- CONTROLES DO BOTÃO PTT ---
function iniciarFala() {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
        mediaRecorder.start();
        pttBtn.innerText = "Gravando...";
        pttBtn.style.backgroundColor = "#c0392b"; // Fica mais escuro
        tocarBip(800, 'sine', 0.15); // Bip inicial
    }
}

function pararFala() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop(); // Isso dispara o 'onstop' e envia o áudio
        pttBtn.innerText = "Pressione para Falar";
        pttBtn.style.backgroundColor = "#e74c3c"; // Volta à cor normal
        tocarBip(400, 'sine', 0.15); // Bip de câmbio
    }
}

// Eventos de clique e toque
pttBtn.addEventListener('mousedown', iniciarFala);
pttBtn.addEventListener('mouseup', pararFala);
pttBtn.addEventListener('mouseleave', pararFala);
pttBtn.addEventListener('touchstart', (e) => { e.preventDefault(); iniciarFala(); });
pttBtn.addEventListener('touchend', (e) => { e.preventDefault(); pararFala(); });
