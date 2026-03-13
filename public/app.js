// public/app.js

const socket = io();

// 1. ELEMENTOS DA INTERFACE
const loginScreen = document.getElementById('login-screen');
const radioScreen = document.getElementById('radio-screen');
const joinBtn = document.getElementById('join-btn');
const usernameInput = document.getElementById('username-input');
const codeInput = document.getElementById('code-input'); // Captura o novo campo de código
const pttBtn = document.getElementById('ptt-btn');
const statusText = document.getElementById('status');
const usersList = document.getElementById('users-list');

// 2. VARIÁVEIS GLOBAIS DE ÁUDIO
let mediaRecorder;
let pedacosDeAudio = [];

// Carrega o seu arquivo de som MP3 da pasta public
// Usamos uma variável constante pois o arquivo será sempre o mesmo
const somDoRadio = new Audio('sound_1.mp3');

// Função simples para tocar o MP3
function tocarEfeitoRadio() {
    somDoRadio.currentTime = 0; // Volta o som para o início (caso o usuário aperte muito rápido)
    somDoRadio.play().catch(erro => console.log("Erro ao tocar áudio:", erro));
}

// --- LÓGICA DE LOGIN COM SENHA ---
joinBtn.addEventListener('click', () => {
    const nome = usernameInput.value.trim();
    const codigo = codeInput.value.trim(); // Pega o que foi digitado no código
    
    // Verificação de segurança: O nome não pode estar vazio E o código tem que ser "jp3"
    if (nome === "") {
        alert("Por favor, digite um nome de identificação!");
    } else if (codigo !== "jp3") {
        alert("Código de acesso incorreto! Acesso negado.");
    } else {
        // Se passou nas verificações, entra no rádio!
        loginScreen.style.display = 'none';
        radioScreen.style.display = 'flex';
        
        prepararGravacao(nome);
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
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (evento) => {
            if (evento.data.size > 0) pedacosDeAudio.push(evento.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(pedacosDeAudio, { type: 'audio/webm' });
            pedacosDeAudio = []; 
            socket.emit('audio-transmitido', audioBlob);
        };

        statusText.innerText = "Conectado à frequência.";
        pttBtn.disabled = false;
        
        socket.emit('entrar', nome); 
    } catch (error) {
        statusText.innerText = "Erro: Permita o microfone.";
    }
}

// --- RECEBIMENTO DO ÁUDIO DA INTERNET ---
socket.on('audio-recebido', (dados) => {
    const audioBlob = new Blob([dados.audio], { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    const reprodutor = new Audio(audioUrl);
    reprodutor.play();
    
    statusText.innerText = `🔊 Ouvindo ${dados.de}...`;
    statusText.style.color = "#f39c12"; 
    
    reprodutor.onended = () => {
        statusText.innerText = "Conectado à frequência.";
        statusText.style.color = "white";
    };
});

// --- CONTROLES DO BOTÃO PUSH-TO-TALK ---
function iniciarFala() {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
        mediaRecorder.start();
        pttBtn.innerText = "Gravando...";
        pttBtn.style.backgroundColor = "#c0392b"; 
        tocarEfeitoRadio(); // Toca o seu sound_1.mp3 ao APERTAR o botão
    }
}

function pararFala() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop(); 
        pttBtn.innerText = "Pressione para Falar";
        pttBtn.style.backgroundColor = "#e74c3c"; 
        tocarEfeitoRadio(); // Toca o seu sound_1.mp3 novamente ao SOLTAR o botão
    }
}

// Mapeia os eventos do botão
pttBtn.addEventListener('mousedown', iniciarFala);
pttBtn.addEventListener('mouseup', pararFala);
pttBtn.addEventListener('mouseleave', pararFala); 
pttBtn.addEventListener('touchstart', (e) => { e.preventDefault(); iniciarFala(); });
pttBtn.addEventListener('touchend', (e) => { e.preventDefault(); pararFala(); });
