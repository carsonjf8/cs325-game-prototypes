// local development socket
//const socket = io('localhost:3000');
// heroku deployment socket
const socket = io('https://powerful-lake-99065.herokuapp.com/');

// initial screen components
const initialScreen = document.getElementById('initialScreen');
const usernameInput = document.getElementById('usernameInput');
const newGameBtn = document.getElementById('newGameBtn');
newGameBtn.addEventListener('click', newGame);
const gameCodeInput = document.getElementById('gameCodeInput');
const joinGameBtn = document.getElementById('joinGameBtn');
joinGameBtn.addEventListener('click', joinGame);

// player list screen components
const playerListScreen = document.getElementById('playerScreen');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');
const redTeamPlayerListDisplay = document.getElementById('redPlayerList');
const blueTeamPlayerListDisplay = document.getElementById('bluePlayerList');
const playerTeamDisplays = [redTeamPlayerListDisplay, blueTeamPlayerListDisplay];
const redTeamPlayersList = [];
const blueTeamPlayersList = [];
const playerTeams = [redTeamPlayersList, blueTeamPlayersList];
const startGameBtn = document.getElementById('startGameBtn');
startGameBtn.addEventListener('click', startGame);

// game screen components
const gameScreen = document.getElementById('gameScreen');

const FRAME_RATE = 60; // frame rate
const CANVAS_WIDTH = 800; // width of canvas
const CANVAS_HEIGHT = 600; // height of canvas
const NUM_TEAMS = 2; // number of teams
const TEAM_COLORS = [ '#ff0000', '#0000ff' ]; // colors for each team
const LASER_COLORS = [ '#dd0000', '#0000dd' ]; // colors for each team
const PLAYER_SPEED = 5; // player movement speed
const PLAYER_WIDTH = 25; // width of player
const PLAYER_HEIGHT = 25; // height of player
const LASER_COOLDOWN = 1; // cooldown of laser in seconds
const LASER_RADIUS = 4; // radius of the laser

let canvas; // canvas the game will be drawn on
let ctx; // used to draw on the canvas
let gameCode; // unique code for the room
let gameActive; // whether the game has started or not
let intervalId; // interval to update screen
let gameState; // current game state
let roomLeader = false; // can start game
let keyState = {};

let myPlayer = null; // info about the user's player
let myPlayerId; // player number
let myUsername; // player username
let laserCooldown = 0;

// packet handling methods
socket.on('init', handleInit);
socket.on('gameState', handleGameState);
socket.on('unknownGame', handleUnknownGame);
socket.on('tooManyPlayers', handleTooManyPlayers);
socket.on('startGame', handleStartGame);

function newGame() {
    // check if username is not empty or just whitespace
    username = usernameInput.value;
    if(username.trim().length === 0) {
        alert('Please enter a valid username');
        usernameInput.value = '';
        return;
    }

    socket.emit('newGame', username);
    roomLeader = true;
    init();
}

function joinGame() {
    // check if username is not empty or just whitespace
    username = usernameInput.value;
    if(username.trim().length === 0) {
        alert('Please enter a valid username');
        usernameInput.value = '';
        return;
    }

    gameCode = gameCodeInput.value;
    // console.log(gameCode);
    socket.emit('joinGame', gameCode, username);
    init();
}

function handleUnknownGame() {
    reset();
    alert('Unknown game code');
}

function handleTooManyPlayers() {
    reset();
    alert('This game is already in progress');
}

function reset() {
    gameCodeInput.value = '';
    initialScreen.style.display = 'block';
    playerListScreen.style.display = 'none';
}

function init() {
    initialScreen.style.display = 'none';
    playerListScreen.style.display = 'block';
    startGameBtn.style.display = 'none';
    startGameBtn.disabled = true;
}

function handleInit(number, roomCode) {
    myPlayerId = number;
    gameCode = roomCode;
    gameCodeDisplay.innerText = gameCode;
    
    // only the host can start the game
    if(myPlayerId === 0) {
        startGameBtn.style.display = 'block';
        startGameBtn.disabled = false;
    }
}

function addNewPlayer(teamId) {
    // create new HTML component to display a new player
    const newPlayerNameDisplay = document.createElement('h2');
    newPlayerNameDisplay.classList.add('justify-content-center');
    newPlayerNameDisplay.style.display = 'block';
    
    // add new HTML component to the HTML page
    playerTeamDisplays[teamId].appendChild(newPlayerNameDisplay);
    // keep track of player display components
    playerTeams[teamId].push(newPlayerNameDisplay);
}

function switchTeam() {
    socket.emit('switchTeam', playerId);
}

function startGame() {
    socket.emit('startGame');
}

function handleStartGame() {
    // switch from player list screen to game screen
    playerListScreen.style.display = 'none';
    gameScreen.style.display = 'block';

    // set up canvas
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    gameActive = true;

    canvas.addEventListener('mousemove', function(event) {
        let mousePos = getMousePos(canvas, event);
        // console.log(mousePos);
        changePlayerAngle(mousePos);
    });

    canvas.addEventListener('click', shootLaser);

    document.addEventListener('keydown', function(key) {
        keyState[key.key] = true;
    });

    document.addEventListener('keyup', function(key) {
        keyState[key.key] = false;
    });

    intervalId = setInterval(() => {
        if(laserCooldown > 0) {
            laserCooldown--;
        }
        movePlayer();
        /*
        if(keyState[' ']) { // if SPACE is pressed
            shootLaser();
        }
        */
        paintGame();
    }, 1000 / FRAME_RATE);
}

function shootLaser() {
    if(laserCooldown <= 0) {
        laserCooldown = FRAME_RATE * LASER_COOLDOWN;
        socket.emit('shootLaser', myPlayer.team, myPlayer.x + PLAYER_WIDTH / 2, myPlayer.y + PLAYER_HEIGHT / 2, myPlayer.angle);
    }
}

function changePlayerAngle(lookTowards) {
    if(myPlayer == null) {
        return;
    }

    let ay = lookTowards.y - myPlayer.y
    let ax = lookTowards.x - myPlayer.x
    myPlayer.angle = Math.atan2(ay, ax);
    // console.log(myPlayer.angle);
}

function movePlayer() {
    if(myPlayer == null) {
        return;
    }

    dx = 0
    dy = 0
    if(keyState['w'] || keyState['ArrowUp']) {
        dy -= PLAYER_SPEED;
    }
    if(keyState['s'] || keyState['ArrowDown']) {
        dy += PLAYER_SPEED;
    }
    if(keyState['a'] || keyState['ArrowLeft']) {
        dx -= PLAYER_SPEED;
    }
    if(keyState['d'] || keyState['ArrowRight']) {
        dx += PLAYER_SPEED;
    }

    if(myPlayer.x + dx < 0) {
        myPlayer.x = 0;
    }
    else if(myPlayer.x + dx > CANVAS_WIDTH - PLAYER_WIDTH) {
        myPlayer.x = CANVAS_WIDTH - PLAYER_WIDTH;
    }
    else {
        myPlayer.x += dx;
    }

    if(myPlayer.y + dy < 0) {
        myPlayer.y = 0;
    }
    else if(myPlayer.y + dy > CANVAS_HEIGHT - PLAYER_HEIGHT) {
        myPlayer.y = CANVAS_HEIGHT - PLAYER_HEIGHT;
    }
    else {
        myPlayer.y += dy;
    }

    if(dx != 0 || dy != 0) {
        socket.emit('movePlayer', myPlayerId, myPlayer.x, myPlayer.y);
    }
}

function getMousePos(component, event) {
    let rect = component.getBoundingClientRect();
    // console.log(rect);
    // console.log()
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function handleGameState(data) {
    gameState = JSON.parse(data);
    if(myPlayer != null) {
        if(gameState.players[myPlayerId].died) {
            myPlayer = gameState.players[myPlayerId];
        }
        else {
            gameState.players[myPlayerId] = myPlayer;
        }
    }
    // console.log(gameState);

    // game has not started yet
    if(!gameState.active) {
        let teamMembers = [];
        for(let i = 0; i < NUM_TEAMS; i++) {
            teamMembers.push(0);
        }

        for(let i = 0; i < gameState.players.length; i++) {
            player = gameState.players[i];
            teamMembers[player.team]++;

            if(teamMembers[player.team] > playerTeams[player.team].length) {
                addNewPlayer(player.team);
            }

            playerTeams[player.team][teamMembers[player.team] - 1].innerText = player.username;
        }
    }
    else { // game started
        // extract info about the user
        myPlayer = gameState.players[myPlayerId];
    }
}

function paintGame() {
    let state = gameState;
    
    if(gameActive) {
        // check if game is over
        if(state.gameOver) {
            clearInterval(intervalId);
            gameOver(state);
        }

        // draw game from state
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for(let i = 0; i < gameState.players.length; i++) {
            player = gameState.players[i];
            ctx.fillStyle = TEAM_COLORS[gameState.players[i].team];
            ctx.fillRect(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
        }

        for(let i = 0; i < gameState.lasers.length; i++) {
            laser = gameState.lasers[i];
            if(!laser.active) {
                continue;
            }
            ctx.fillStyle = '#E2CB34'; // yellow gold
            ctx.beginPath();
            ctx.arc(laser.x, laser.y, LASER_RADIUS, 0, Math.PI * 2, false);
            ctx.fill();
        }
    }
}

function gameOver(state) {
    // do some game over stuff
}