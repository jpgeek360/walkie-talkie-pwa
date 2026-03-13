// public/app.js

// 1. CONEXÃO COM O SERVIDOR
// Inicia a comunicação em tempo real com o nosso backend Node.js
const socket = io();

// 2. ELEMENTOS DA INTERFACE (HTML)
// Capturamos as telas e botões para podermos manipulá-los via JavaScript
const loginScreen = document.getElementById('login-screen');
const radioScreen = document.getElementById('radio-screen');
const joinBtn = document.getElementById('join-btn');
const usernameInput = document.getElementById('username-input');
const pttBtn = document.getElementById('ptt-btn');
const statusText = document.getElementById('status');
const usersList = document.getElementById('users-list');

// 3. VARIÁVEIS GLOBAIS DE ÁUDIO
let audioCtx;           // O "motor" de som do navegador para os efeitos
let mediaRecorder;      // O gravador da voz do usuário
let pedacosDeAudio = [];// Uma lista para guardar os pedacinhos da gravação

// --- LÓGICA DE LOGIN ---
// O que acontece quando o usuário clica em "Entrar na Frequência"
joinBtn.addEventListener('click', () => {
    const nome = usernameInput.value.trim();
    
    if (nome !== "") {
        // REGRA DE SEGURANÇA DO NAVEGADOR:
        // O motor de áudio só pode ser criado após o usuário interagir com a página (clicar)
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        // Esconde a tela de login e mostra o rádio
        loginScreen.style.display = 'none';
        radioScreen.style.display = 'flex';
        
        // Inicia o processo de pedir o microfone e avisar o servidor
        prepararGravacao(nome);
    } else {
        alert("Por favor, digite um nome de identificação!");
    }
});

// --- ATUALIZAÇÃO DA LISTA DE USUÁRIOS ---
// Quando o servidor avisa que alguém entrou ou saiu, reescrevemos a lista
socket.on('atualizar-lista', (usuarios) => {
    usersList.innerHTML = ''; // Limpa a lista atual
    for (let id in usuarios) {
        const li = document.createElement('li');
        // Se o ID for o nosso, coloca "(Você)" ao lado do nome
        li.innerText = id === socket.id ? `${usuarios[id]} (Você)` : usuarios[id];
        usersList.appendChild(li);
    }
});

// --- GRAVAÇÃO E TRANSMISSÃO DE ÁUDIO ---
async function prepararGravacao(nome) {
    try {
        // Pede permissão para usar o microfone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Cria o gravador conectando-o ao microfone
        mediaRecorder = new MediaRecorder(stream);

        // Durante a gravação, vai guardando os pedaços de som na nossa lista
        mediaRecorder.ondataavailable = (evento) => {
            if (evento.data.size > 0) pedacosDeAudio.push(evento.data);
        };

        // Quando a gravação parar (quando soltar o botão), empacota e envia!
        mediaRecorder.onstop = () => {
            // Transforma os pedaços em um arquivo de áudio "Blob"
            const audioBlob = new Blob(pedacosDeAudio, { type: 'audio/webm' });
            pedacosDeAudio = []; // Limpa a lista para a próxima vez que for falar
            
            // Dispara o arquivo de áudio pronto para o servidor espalhar
            socket.emit('audio-transmitido', audioBlob);
        };

        // Atualiza os textos e libera o botão para uso
        statusText.innerText = "Conectado à frequência.";
        pttBtn.disabled = false;
        
        // Avisa ao servidor o nome que escolhemos
        socket.emit('entrar', nome); 
    } catch (error) {
        console.error("Erro no microfone:", error);
        statusText.innerText = "Erro: Permita o uso do microfone.";
    }
}

// --- RECEBIMENTO DO ÁUDIO ---
// Quando o servidor nos entrega o áudio de outra pessoa
socket.on('audio-recebido', (dados) => {
    // Transforma o pacote binário que chegou da internet em um link de áudio local
    const audioBlob = new Blob([dados.audio], { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Cria um reprodutor invisível no navegador e dá o 'play'
    const reprodutor = new Audio(audioUrl);
    reprodutor.play();
    
    // Mostra na tela o nome de quem está falando agora
    statusText.innerText = `🔊 Ouvindo ${dados.de}...`;
    statusText.style.color = "#f39c12"; // Laranja para destacar
    
    // Quando o áudio da pessoa terminar de tocar, volta ao normal
    reprodutor.onended = () => {
        statusText.innerText = "Conectado à frequência.";
        statusText.style.color = "white";
    };
});

// --- GERADOR DE EFEITO RÁDIO ANTIGO (Estática e Clique) ---
function tocarEfeitoRadio(tipo) {
    if (!audioCtx) return;

    const tempoAtual = audioCtx.currentTime;
    const duracao = 0.15; // O efeito dura 150 milissegundos

    // 1. CRIANDO O CHIADO (White Noise / Estática)
    const bufferSize = audioCtx.sampleRate * duracao;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    // Matemática pura criando milhares de números aleatórios (ruído)
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; 
    }
    
    const ruido = audioCtx.createBufferSource();
    ruido.buffer = buffer;

    // Filtro para abafar a estática, parecendo rádio velho
    const filtroRuido = audioCtx.createBiquadFilter();
    filtroRuido.type = 'bandpass';
    filtroRuido.frequency.value = 2500;

    const volumeRuido = audioCtx.createGain();
    volumeRuido.gain.setValueAtTime(0.4, tempoAtual);
    volumeRuido.gain.exponentialRampToValueAtTime(0.01, tempoAtual + duracao);

    ruido.connect(filtroRuido);
    filtroRuido.connect(volumeRuido);
    volumeRuido.connect(audioCtx.destination);
    ruido.start(tempoAtual);

    // 2. CRIANDO O CLIQUE MECÂNICO DO BOTÃO
    const osciladorClique = audioCtx.createOscillator();
    const volumeClique = audioCtx.createGain();

    osciladorClique.type = 'square'; // Onda quadrada soa áspera/eletrônica
    
    // Se apertou o botão, som agudo. Se soltou, som grave.
    const frequenciaInicial = tipo === 'inicio' ? 800 : 300;
    osciladorClique.frequency.setValueAtTime(frequenciaInicial, tempoAtual);
    
    // A frequência cai drasticamente para simular o "tec" mecânico
    osciladorClique.frequency.exponentialRampToValueAtTime(50, tempoAtual + 0.05);

    volumeClique.gain.setValueAtTime(0.1, tempoAtual);
    volumeClique.gain.exponentialRampToValueAtTime(0.001, tempoAtual + 0.05);

    osciladorClique.connect(volumeClique);
    volumeClique.connect(audioCtx.destination);

    osciladorClique.start(tempoAtual);
    osciladorClique.stop(tempoAtual + 0.05);
}

// --- CONTROLES DO BOTÃO PUSH-TO-TALK ---
function iniciarFala() {
    // Só grava se o gravador estiver pronto e inativo
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
        mediaRecorder.start();
        pttBtn.innerText = "Gravando...";
        pttBtn.style.backgroundColor = "#c0392b"; // Fica vermelho escuro
        tocarEfeitoRadio('inicio'); // Toca o Ksssh-Tec inicial
    }
}

function pararFala() {
    // Só para se estiver de fato gravando
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop(); // Isso dispara o 'onstop' lá em cima e envia o áudio
        pttBtn.innerText = "Pressione para Falar";
        pttBtn.style.backgroundColor = "#e74c3c"; // Volta ao vermelho normal
        tocarEfeitoRadio('fim'); // Toca o Ksssh-Tec de câmbio
    }
}

// Mapeia as ações do mouse (Computador)
pttBtn.addEventListener('mousedown', iniciarFala);
pttBtn.addEventListener('mouseup', pararFala);
pttBtn.addEventListener('mouseleave', pararFala); // Garante que pare se o mouse escorregar do botão

// Mapeia as ações de toque (Celular)
pttBtn.addEventListener('touchstart', (e) => { 
    e.preventDefault(); // Evita bugs de zoom ou duplo clique na tela
    iniciarFala(); 
});
pttBtn.addEventListener('touchend', (e) => { 
    e.preventDefault(); 
    pararFala(); 
});
