// public/app.js

const socket = io();

// 1. ELEMENTOS DA INTERFACE
const loginScreen = document.getElementById('login-screen');
const radioScreen = document.getElementById('radio-screen');
const joinBtn = document.getElementById('join-btn');
const usernameInput = document.getElementById('username-input');
const codeInput = document.getElementById('code-input');
const pttBtn = document.getElementById('ptt-btn');
const leaveBtn = document.getElementById('leave-btn'); // Captura o botão de sair
const statusText = document.getElementById('status');
const usersList = document.getElementById('users-list');

// 2. VARIÁVEIS GLOBAIS DE ÁUDIO E CONEXÃO
let mediaRecorder;
let pedacosDeAudio = [];
let localStream; // Nova variável para guardar e poder desligar o microfone depois

// Carrega o seu arquivo de som MP3
const somDoRadio = new Audio('sound_1.mp3');

function tocarEfeitoRadio() {
    somDoRadio.currentTime = 0; 
    somDoRadio.play().catch(erro => console.log("Erro ao tocar áudio:", erro));
}

// --- LÓGICA DE LOGIN COM SENHA ---
joinBtn.addEventListener('click', () => {
    const nome = usernameInput.value.trim();
    const codigo = codeInput.value.trim(); 
    
    if (nome === "") {
        alert("Por favor, digite um nome de identificação!");
    } else if (codigo !== "jp3") {
        alert("Código de acesso incorreto! Acesso negado.");
    } else {
        // Se o socket estiver desconectado (porque o usuário saiu antes), conecta de novo
        if (!socket.connected) {
            socket.connect();
        }

        loginScreen.style.display = 'none';
        radioScreen.style.display = 'flex';
        
        prepararGravacao(nome);
    }
});

// --- LÓGICA DE DESCONECTAR / SAIR ---
leaveBtn.addEventListener('click', () => {
    // 1. Corta a comunicação com o servidor na mesma hora
    socket.disconnect();

    // 2. Desliga fisicamente a captura de áudio (apaga a luz do microfone)
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // 3. Volta para a tela inicial e limpa a senha
    radioScreen.style.display = 'none';
    loginScreen.style.display = 'flex';
    codeInput.value = ''; // Limpa a senha por segurança
    usersList.innerHTML = ''; // Limpa a lista visualmente
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
        // Guarda a permissão na variável global localStream
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(localStream);

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
    
    // MELHORIA: Toca o bipe do rádio no momento que recebe o áudio
    tocarEfeitoRadio();
    reprodutor.play();
    
    statusText.innerText = `🔊 Ouvindo ${dados.de}...`;
    statusText.style.color = "#f39c12"; 
    
    reprodutor.onended = () => {
        // MELHORIA: Toca o bipe do rádio quando o áudio da pessoa termina
        tocarEfeitoRadio();
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
        tocarEfeitoRadio(); 
    }
}

function pararFala() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop(); 
        pttBtn.innerText = "Pressione para Falar";
        pttBtn.style.backgroundColor = "#e74c3c"; 
        tocarEfeitoRadio(); 
    }
}

// Mapeia os eventos do botão
pttBtn.addEventListener('mousedown', iniciarFala);
pttBtn.addEventListener('mouseup', pararFala);
pttBtn.addEventListener('mouseleave', pararFala); 
pttBtn.addEventListener('touchstart', (e) => { e.preventDefault(); iniciarFala(); });
pttBtn.addEventListener('touchend', (e) => { e.preventDefault(); pararFala(); });
