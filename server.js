// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
// O Socket.io suporta envio de arquivos pesados (como áudio) nativamente
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(express.static('public'));

const usuariosConectados = {};

io.on('connection', (socket) => {
    
    // Quando alguém entra e digita o nome
    socket.on('entrar', (nomeUsuario) => {
        usuariosConectados[socket.id] = nomeUsuario;
        console.log(`📻 ${nomeUsuario} entrou (${socket.id})`);
        io.emit('atualizar-lista', usuariosConectados);
    });

    // --- O CORAÇÃO DO NOVO RÁDIO ---
    // Recebe o pacote de áudio de quem falou e espalha para os outros
    socket.on('audio-transmitido', (dadosAudio) => {
        // Envia para todos na sala, EXCETO para quem falou
        socket.broadcast.emit('audio-recebido', {
            de: usuariosConectados[socket.id],
            audio: dadosAudio // Este é o som em formato binário!
        });
    });

    socket.on('disconnect', () => {
        if (usuariosConectados[socket.id]) {
            console.log(`❌ ${usuariosConectados[socket.id]} desconectou`);
            delete usuariosConectados[socket.id];
            io.emit('atualizar-lista', usuariosConectados);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor WebSocket rodando na porta ${PORT}`));
