// public/webrtc.js

const socket = io();
const peers = {}; // Guarda as conexões WebRTC. Ex: peers['id_do_usuario'] = RTCPeerConnection
let localStream;

const servers = {
    iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }]
};

// 1. Inicia o microfone
async function iniciarMidia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStream.getAudioTracks()[0].enabled = false; // Começa mudo (PTT)
        document.getElementById('status').innerText = "Conectado à frequência.";
        document.getElementById('status').style.color = "#2ecc71";
        document.getElementById('ptt-btn').disabled = false;
        
        // Avisa ao servidor que estamos prontos (isso aciona a criação da lista)
        socket.emit('pronto'); 
    } catch (error) {
        document.getElementById('status').innerText = "Erro no microfone.";
    }
}

// 2. Cria uma conexão com um usuário específico
function criarPeerConnection(targetId) {
    const peerConnection = new RTCPeerConnection(servers);
    peers[targetId] = peerConnection;

    // Adiciona nosso microfone à conexão
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    // Quando receber o áudio do outro, cria uma tag <audio> escondida para ele tocar
    peerConnection.ontrack = (event) => {
        let audioElement = document.getElementById(`audio-${targetId}`);
        if (!audioElement) {
            audioElement = document.createElement('audio');
            audioElement.id = `audio-${targetId}`;
            audioElement.autoplay = true;
            document.getElementById('audios-container').appendChild(audioElement);
        }
        audioElement.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { to: targetId, candidate: event.candidate });
        }
    };

    return peerConnection;
}

// 3. Atualiza a lista visual de usuários no HTML
socket.on('atualizar-lista', (usuarios) => {
    const lista = document.getElementById('users-list');
    lista.innerHTML = ''; // Limpa a lista
    
    for (let id in usuarios) {
        const li = document.createElement('li');
        li.innerText = id === socket.id ? `${usuarios[id]} (Você)` : usuarios[id];
        lista.appendChild(li);

        // Se tem alguém novo na lista (que não somos nós e não temos conexão), LIGAMOS para ele
        if (id !== socket.id && !peers[id] && localStream) {
            iniciarChamada(id);
        }
    }
});

// 4. Inicia a chamada (Cria Oferta)
async function iniciarChamada(targetId) {
    const pc = criarPeerConnection(targetId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', { to: targetId, offer: offer });
}

// Recebe Oferta e responde
socket.on('offer', async (data) => {
    if (!localStream) return;
    
    // Se ainda não temos a conexão com essa pessoa, criamos agora
    let pc = peers[data.from];
    if (!pc) {
        pc = criarPeerConnection(data.from);
    }
    
    // Se a conexão não estiver no estado inicial ('stable'), ignoramos para evitar conflito
    if (pc.signalingState !== 'stable') {
        return;
    }

    try {
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { to: data.from, answer: answer });
    } catch (error) {
        console.error("Erro ao processar oferta:", error);
    }
});

// Recebe Resposta
socket.on('answer', async (data) => {
    const pc = peers[data.from];
    
    // Só aplica a resposta se estivermos no estado correto esperando por ela
    if (pc && pc.signalingState === 'have-local-offer') {
        try {
            await pc.setRemoteDescription(data.answer);
        } catch (error) {
            console.error("Erro ao processar resposta:", error);
        }
    }
});

// Recebe Rota de Rede
socket.on('ice-candidate', async (data) => {
    if (peers[data.from]) {
        await peers[data.from].addIceCandidate(data.candidate);
    }
});

// Limpa a conexão quando alguém sai
socket.on('usuario-desconectou', (id) => {
    if (peers[id]) {
        peers[id].close();
        delete peers[id];
    }
    const audioEl = document.getElementById(`audio-${id}`);
    if (audioEl) audioEl.remove(); // Remove a tag de áudio do HTML
});
