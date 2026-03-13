// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(express.static('public'));

// Dicionário para guardar os usuários online
const usuariosConectados = {};

io.on('connection', (socket) => {
    // Dá um nome aleatório para o novo rádio
    usuariosConectados[socket.id] = `Rádio ${Math.floor(Math.random() * 1000)}`;
    console.log(`📻 ${usuariosConectados[socket.id]} conectou (${socket.id})`);

    // Envia a lista atualizada para TODOS na sala
    io.emit('atualizar-lista', usuariosConectados);

    // --- SINALIZAÇÃO DIRECIONADA ---
    // Em vez de 'broadcast', agora enviamos para um 'alvo' (to) específico
    socket.on('offer', (data) => {
        io.to(data.to).emit('offer', { from: socket.id, offer: data.offer });
    });

    socket.on('answer', (data) => {
        io.to(data.to).emit('answer', { from: socket.id, answer: data.answer });
    });

    socket.on('ice-candidate', (data) => {
        io.to(data.to).emit('ice-candidate', { from: socket.id, candidate: data.candidate });
    });

    // Quando alguém sai da página
    socket.on('disconnect', () => {
        console.log(`❌ ${usuariosConectados[socket.id]} desconectou`);
        delete usuariosConectados[socket.id];
        io.emit('atualizar-lista', usuariosConectados); // Atualiza a lista
        io.emit('usuario-desconectou', socket.id); // Avisa para cortarem a conexão de áudio
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
