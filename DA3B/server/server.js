// const io = require('socket.io')();
const io = require('socket.io')({
    cors: {
        origin: '*',
    }
});
/*
import { Server } from 'socket.io';
const httpServer = createServer();
const io = new Server(httpServer, {});
*/
const { initGame, startGame, gameLoop, addNewPlayer, switchTeam, movePlayer, removePowerup, shootLaser } = require('./game');
const { MAX_PLAYERS, FRAME_RATE } = require('./constants');
const { makeid } = require('./utils');

const state = {};
const clientRooms = {};

io.on('connection', client => {

    client.on('newGame', handleNewGame);
    client.on('joinGame', handleJoinGame);
    client.on('switchTeam', handleSwitchTeam);
    client.on('startGame', handleStartGame);
    client.on('movePlayer', handleMovePlayer);
    client.on('getPowerup', handleGetPowerup);
    client.on('shootLaser', handleShootLaser);

    function handleJoinGame(roomName, playerName) {
        const room = io.sockets.adapter.rooms.get(roomName);

        let allUsers;
        if(room) {
            allUsers = room;
        }

        let numClients = 0;
        if(allUsers) {
            numClients = room.size;
        }

        if(numClients === 0) {
            client.emit('unknownGame');
            return;
        }
        else if(numClients >= MAX_PLAYERS) {
            client.emit('tooManyPlayers');
            return;
        }

        clientRooms[client.id] = roomName;

        client.join(roomName);
        client.number = numClients;
        state[roomName] = addNewPlayer(state[roomName], client.number, playerName);
        
        client.emit('init', client.number, roomName);
        emitGameState(roomName);
    }

    function handleNewGame(playerName) {
        let roomName = makeid(5); // generate room code
        clientRooms[client.id] = roomName;

        client.join(roomName);
        state[roomName] = initGame(); // setup game initially
        client.number = 0; // client id = 0
        state[roomName] = addNewPlayer(state[roomName], client.number, playerName); // add player to the game

        client.emit('init', client.number, roomName);
        emitGameState(roomName);
    }

    // switch a player's team color
    function handleSwitchTeam(playerId) {
        state[clientRooms[client.id]] = switchTeam(state[clientRooms[client.id]], playerId);
        emitGameState(clientRooms[client.id]);
    }

    // starts the game after all players have joined
    function handleStartGame() {
        state[clientRooms[client.id]] = startGame(state[clientRooms[client.id]]);
        io.sockets.in(clientRooms[client.id]).emit('startGame');

        startGameInterval(clientRooms[client.id]);
    }

    function handleMovePlayer(pid, x, y) {
        state[clientRooms[client.id]] = movePlayer(state[clientRooms[client.id]], pid, x, y);
        emitGameState(clientRooms[client.id]);
    }

    function handleGetPowerup(puid) {
        state[clientRooms[client.id]] = removePowerup(state[clientRooms[client.id]], puid);
        emitGameState(clientRooms[client.id]);
    }

    function handleShootLaser(tid, x, y, angle) {
        state[clientRooms[client.id]] = shootLaser(state[clientRooms[client.id]], tid, x, y, angle);
        emitGameState(clientRooms[client.id]);
    }
});

// sends out periodic updates of the game state
function startGameInterval(roomName) {
    const intervalId = setInterval(() => {
        for(let i = 0; i < state[roomName].players.length; i++) {
            if(state[roomName].players[i].died) {
                state[roomName].players[i].died = false;
            }
        }

        const updatedGameState = gameLoop(state[roomName]);
        state[roomName] = updatedGameState;
        emitGameState(roomName);
    }, 1000 / FRAME_RATE);
}

// sends game state to clients
function emitGameState(room) {
    io.sockets.in(room).emit('gameState', JSON.stringify(state[room]));
}

io.listen(process.env.PORT || 3000);