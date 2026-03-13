// app.js

// Conecta ao nosso servidor de sinalização (Node.js/Socket.io)
const socket = io();

// Pegamos os elementos visuais do HTML para interagir com eles
const pttBtn = document.getElementById('ptt-btn');
const statusText = document.getElementById('status');
const remoteAudio = document.getElementById('remote-audio');

// Variáveis globais para guardar a conexão e o áudio
let localStream;
let peerConnection;

// Servidores STUN públicos do Google. 
// Eles ajudam os navegadores a descobrirem seus IPs públicos para a conexão P2P.
const servers = {
    iceServers: [
        { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
    ]
};

// --- PASSO 1: INICIAR MICROFONE ---
async function init() {
    try {
        // Pede permissão ao usuário para usar o microfone
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        
        // O truque do PTT: Deixamos o microfone mudo logo de início
        localStream.getAudioTracks()[0].enabled = false;
        statusText.innerText = "Microfone pronto. Buscando outro rádio...";
        
        // Prepara a conexão WebRTC
        createPeerConnection();

        // Dispara uma "Oferta" de conexão após 1 segundo
        setTimeout(() => createOffer(), 1000); 

    } catch (error) {
        console.error("Erro ao acessar microfone:", error);
        statusText.innerText = "Erro: Permita o uso do microfone no navegador.";
    }
}

// --- PASSO 2: CONFIGURAR CONEXÃO WEBRTC ---
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);

    // Adiciona o nosso áudio à conexão para ser enviado
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Quando recebermos o áudio do outro rádio
    peerConnection.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0]; // Toca o áudio no HTML
        statusText.innerText = "Conectado! Pressione para falar.";
        statusText.style.color = "#2ecc71"; // Fica verde
        pttBtn.disabled = false; // Habilita o botão para uso
    };

    // Descobre as rotas de rede (ICE Candidates) e envia para o servidor
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate);
        }
    };
}

// --- PASSO 3: SINALIZAÇÃO (OFERTA E RESPOSTA) ---
async function createOffer() {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer); // Envia para o outro rádio
}

// Quando o servidor avisa que tem uma "Oferta" chegando
socket.on('offer', async (offer) => {
    if (!peerConnection) createPeerConnection();
    await peerConnection.setRemoteDescription(offer);
    
    // Cria uma "Resposta" à oferta
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
});

// Quando o servidor avisa que a nossa oferta foi aceita ("Resposta")
socket.on('answer', async (answer) => {
    await peerConnection.setRemoteDescription(answer);
});

// Recebe as rotas de rede do outro rádio
socket.on('ice-candidate', async (candidate) => {
    if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
    }
});

// --- PASSO 4: LÓGICA DO BOTÃO PUSH-TO-TALK ---
function falar() {
    if (localStream) {
        localStream.getAudioTracks()[0].enabled = true; // Abre o microfone
        pttBtn.innerText = "Falando...";
    }
}

function silenciar() {
    if (localStream) {
        localStream.getAudioTracks()[0].enabled = false; // Fecha o microfone
        pttBtn.innerText = "Pressione para Falar";
    }
}

// Escuta os cliques do mouse (Computador)
pttBtn.addEventListener('mousedown', falar);
pttBtn.addEventListener('mouseup', silenciar);
pttBtn.addEventListener('mouseleave', silenciar); // Se o mouse sair do botão, silencia

// Escuta os toques na tela (Celular)
pttBtn.addEventListener('touchstart', (e) => { 
    e.preventDefault(); // Evita bugs de duplo clique no celular
    falar(); 
});
pttBtn.addEventListener('touchend', (e) => { 
    e.preventDefault(); 
    silenciar(); 
});

// Dá o pontapé inicial
init();