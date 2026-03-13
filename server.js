// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configuração do Socket.io permitindo acesso (CORS)
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Mais tarde, colocaremos nosso HTML/CSS/JS dentro de uma pasta 'public'
app.use(express.static('public'));

// Lógica de Sinalização WebRTC
io.on('connection', (socket) => {
    console.log('📻 Um usuário conectou:', socket.id);

    // Colocamos todos os usuários em uma sala única chamada "canal-aberto"
    socket.join('canal-aberto');

    // 1. Recebe a "Oferta" de conexão de um usuário e repassa para os outros na sala
    socket.on('offer', (offer) => {
        socket.broadcast.to('canal-aberto').emit('offer', offer);
    });

    // 2. Recebe a "Resposta" à oferta e repassa
    socket.on('answer', (answer) => {
        socket.broadcast.to('canal-aberto').emit('answer', answer);
    });

    // 3. Recebe os "Candidatos ICE" (possíveis rotas de rede) e repassa
    socket.on('ice-candidate', (candidate) => {
        socket.broadcast.to('canal-aberto').emit('ice-candidate', candidate);
    });

    socket.on('disconnect', () => {
        console.log('❌ Usuário desconectou:', socket.id);
    });
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor de sinalização rodando na porta ${PORT}`);
    console.log(`Acesse http://localhost:${PORT} no seu navegador (quando o frontend estiver pronto)`);
});