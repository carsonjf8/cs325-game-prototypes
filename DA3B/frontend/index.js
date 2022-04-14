// local development socket
// const socket = io('localhost:3000');
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
const scoreDisplay = document.getElementById('scoreDisplay');
const redTeamScoreDisplay = document.getElementById('redTeamScoreDisplay');
const blueTeamScoreDisplay = document.getElementById('blueTeamScoreDisplay');
const gameScreen = document.getElementById('gameScreen');

const FRAME_RATE = 60; // frame rate
const CANVAS_WIDTH = 800; // width of canvas
const CANVAS_HEIGHT = 600; // height of canvas
const NUM_TEAMS = 2; // number of teams
const TEAM_COLORS = [ '#ff0000', '#0000ff' ]; // colors for each team
const LASER_COLORS = [ '#dd0000', '#0000dd' ]; // colors for each team
const PLAYER_SPEED = 2; // player movement speed
const PLAYER_WIDTH = 20; // width of player
const PLAYER_HEIGHT = 20; // height of player
const PLAYER_FOV = 100;
const PLAYER_VISION_DIST = 120;
const LASER_COOLDOWN = 1; // cooldown of laser in seconds
const LASER_RADIUS = 4; // radius of the laser
const WALL_GRID_SIZE = PLAYER_WIDTH * 2;
const POWERUP_WIDTH = WALL_GRID_SIZE;
const POWERUP_HEIGHT = WALL_GRID_SIZE;
const POWERUP_COLORS = [ '#FC4C02', '#FFC600' ]

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
        // console.log(myPlayer);
        // decrease powerup duration
        if(myPlayer != null) {
            for(let i = 0; i < myPlayer.powerups.length; i++) {
                myPlayer.powerups[i].duration--;
            }
            // clean powerup list
            newPowerupList = [];
            for(let i = 0; i < myPlayer.powerups.length; i++) {
                if(myPlayer.powerups[i].duration > 0) {
                    newPowerupList.push(myPlayer.powerups[i]);
                }
            }
            myPlayer.powerups = newPowerupList;
        }

        if(laserCooldown > 0) {
            laserCooldown--;
        }
        movePlayer();
        paintGame();
    }, 1000 / FRAME_RATE);
}

function shootLaser() {
    if(laserCooldown <= 0) {
        let hasRapidFire = false;
        // console.log(myPlayer);
        for(let i = 0; i < myPlayer.powerups.length; i++) {
            if(myPlayer.powerups[i].type === 0) { // has rapid fire powerup
                hasRapidFire = true;
                break;
            }
        }
        
        if(hasRapidFire) {
            laserCooldown = FRAME_RATE * (LASER_COOLDOWN / 2);
            // console.log('laser cooldown (RF) = ' + laserCooldown);
        }
        else {
            laserCooldown = FRAME_RATE * LASER_COOLDOWN;
            // console.log('laser cooldown (N) = ' + laserCooldown);
        }
        socket.emit('shootLaser', myPlayer.team, myPlayer.x + PLAYER_WIDTH / 2, myPlayer.y + PLAYER_HEIGHT / 2, myPlayer.angle);
    }
}

function changePlayerAngle(lookTowards) {
    if(myPlayer == null) {
        return;
    }

    let ay = lookTowards.y - (myPlayer.y + PLAYER_HEIGHT / 2);
    let ax = lookTowards.x - (myPlayer.x + PLAYER_WIDTH / 2);
    myPlayer.angle = Math.atan2(ay, ax);
    // console.log(myPlayer.angle);
}

function movePlayer() {
    if(myPlayer == null || !gameState.active) {
        return;
    }

    // get key inputs
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

    // return if no movement
    if(dx == 0 && dy == 0) {
        return;
    }

    // check collisions for nearby cells
    let gridX = Math.floor(myPlayer.x / WALL_GRID_SIZE);
    let gridY = Math.floor(myPlayer.y / WALL_GRID_SIZE);
    for(let i = -1; i <= 1; i++) {
        for(let j = -1; j <= 1; j++) {
            // if cell is not a wall or it's out of bounds, skip it
            if(gridX + i < 0 || gridX + i >= gameState.map[0].length ||
               gridY + j < 0 || gridY + j >= gameState.map.length ||
               gameState.map[gridY + j][gridX + i] != 1) {
                continue;
            }

            let wallX = (gridX + i) * WALL_GRID_SIZE;
            let wallY = (gridY + j) * WALL_GRID_SIZE;

            if(collidePointRect(myPlayer.x + dx, myPlayer.y, wallX, wallY, WALL_GRID_SIZE, WALL_GRID_SIZE) ||
               collidePointRect(myPlayer.x + PLAYER_WIDTH - 1 + dx, myPlayer.y, wallX, wallY, WALL_GRID_SIZE, WALL_GRID_SIZE) ||
               collidePointRect(myPlayer.x + dx, myPlayer.y + PLAYER_HEIGHT - 1, wallX, wallY, WALL_GRID_SIZE, WALL_GRID_SIZE) ||
               collidePointRect(myPlayer.x + PLAYER_WIDTH - 1 + dx, myPlayer.y + PLAYER_HEIGHT - 1, wallX, wallY, WALL_GRID_SIZE, WALL_GRID_SIZE)) {
                dx = 0;
            }
            if(collidePointRect(myPlayer.x, myPlayer.y + dy, wallX, wallY, WALL_GRID_SIZE, WALL_GRID_SIZE) ||
               collidePointRect(myPlayer.x + PLAYER_WIDTH - 1, myPlayer.y + dy, wallX, wallY, WALL_GRID_SIZE, WALL_GRID_SIZE) ||
               collidePointRect(myPlayer.x, myPlayer.y + PLAYER_HEIGHT - 1 + dy, wallX, wallY, WALL_GRID_SIZE, WALL_GRID_SIZE) ||
               collidePointRect(myPlayer.x + PLAYER_WIDTH - 1, myPlayer.y + PLAYER_HEIGHT - 1 + dy, wallX, wallY, WALL_GRID_SIZE, WALL_GRID_SIZE)) {
                dy = 0;
            }

            if(dx == 0 && dy == 0) {
                return;
            }
        }
    }

    myPlayer.x += dx;
    myPlayer.y += dy;

    if(dx != 0 || dy != 0) {
        socket.emit('movePlayer', myPlayerId, myPlayer.x, myPlayer.y);
    }

    
    // check if players are standing on powerups
    for(let i = 0; i < gameState.powerups.length; i++) {
        if(collideRectRect(gameState.powerups[i].x, gameState.powerups[i].y, POWERUP_WIDTH, POWERUP_HEIGHT, myPlayer.x, myPlayer.y, PLAYER_WIDTH, PLAYER_HEIGHT)) {
            newPowerup = {
                type: gameState.powerups[i].type,
                duration: 0
            };
            
            switch (gameState.powerups[i].type) {
            case 0: // rapid fire
                newPowerup.duration = 10 * FRAME_RATE;
                break;
            case 1: // large flashlight
                newPowerup.duration = 10 * FRAME_RATE;
                break;
            default:
                break;
            }
            
            myPlayer.powerups.push(newPowerup);
            // console.log(gameState.powerups);
            // console.log('remove powerup with puid: ' + gameState.powerups[i].puid);
            socket.emit('getPowerup', gameState.powerups[i].puid);
        }
    }
}

function collideRectRect(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
    if(r1x < r2x + r2w &&
       r1x + r1w > r2x &&
       r1y < r2y + r2h &&
       r1y + r1h > r2y) {
        return true;
    }
    return false;
}

function collidePointRect(px, py, rx, ry, rw, rh) {
    if(px >= rx && px <= rx + rw - 1 && py >= ry && py <= ry + rh - 1) {
        return true;
    }

    return false;
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

        // update score
        redTeamScoreDisplay.innerText = gameState.score[0];
        blueTeamScoreDisplay.innerText = gameState.score[1];
    }
}

// TODO:
// draw darkness and flashlight effects
// add increased flashlight effectiveness when player has "large flashlight" powerup
function paintGame() {
    let state = gameState;
    if(gameActive) {
        // draw background
        ctx.fillStyle = '#567d46';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // draw walls
        ctx.fillStyle = '#888c8d'
        for(let i = 0; i < state.map.length; i++) {
            for(let j = 0; j < state.map[0].length; j++) {
                wall = state.map[i][j];
                if(wall === 1) {
                    ctx.fillRect(j * WALL_GRID_SIZE, i * WALL_GRID_SIZE, WALL_GRID_SIZE, WALL_GRID_SIZE);
                }
            }
        }

        // draw powerups
        for(let i = 0; i < gameState.powerups.length; i++) {
            pu = gameState.powerups[i];
            ctx.fillStyle = POWERUP_COLORS[pu.type];
            ctx.fillRect(pu.x, pu.y, POWERUP_WIDTH, POWERUP_HEIGHT);
        }

        // draw players
        for(let i = 0; i < gameState.players.length; i++) {
            player = gameState.players[i];
            ctx.fillStyle = TEAM_COLORS[gameState.players[i].team];
            ctx.fillRect(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
        }

        // draw lasers
        ctx.fillStyle = '#E2CB34'; // yellow gold
        for(let i = 0; i < gameState.lasers.length; i++) {
            laser = gameState.lasers[i];
            if(!laser.active) {
                continue;
            }
            ctx.beginPath();
            ctx.arc(laser.x + LASER_RADIUS, laser.y + LASER_RADIUS, LASER_RADIUS, 0, Math.PI * 2, false);
            ctx.fill();
        }

        if(myPlayer != null) {
            let player_view = PLAYER_VISION_DIST;
            for(let i = 0; i < myPlayer.powerups.length; i++) {
                if(myPlayer.powerups[i].type === 1) { // has large flashlight powerup
                    player_view *= 2;
                    break;
                }
            }

            ctx.fillStyle = '#000000'; // black;
            ctx.fillRect(0, // top
                         0,
                         canvas.width,
                         (myPlayer.y + PLAYER_HEIGHT / 2) - player_view);
            ctx.fillRect(0, // bottom
                         (myPlayer.y + PLAYER_HEIGHT / 2) + player_view,
                         canvas.width,
                         canvas.height);
            ctx.fillRect(0, // left
                         0,
                         (myPlayer.x + PLAYER_WIDTH / 2) - player_view,
                         canvas.height);
            ctx.fillRect((myPlayer.x + PLAYER_WIDTH / 2) + player_view, // right
                         0,
                         canvas.width,
                         canvas.height);

            // bottom right curve
            ctx.beginPath();
            ctx.moveTo((myPlayer.x + PLAYER_WIDTH / 2) + player_view,
                       (myPlayer.y + PLAYER_HEIGHT / 2) + player_view);
            for(let i = 0; i < 90; i += 0.5) {
                ctx.lineTo((myPlayer.x + PLAYER_WIDTH / 2) + Math.cos(i * Math.PI / 180) * player_view,
                           (myPlayer.y + PLAYER_HEIGHT / 2) + Math.sin(i * Math.PI / 180) * player_view);
            }
            ctx.fill();

            // bottom left curve
            ctx.beginPath();
            ctx.moveTo((myPlayer.x + PLAYER_WIDTH / 2) - player_view,
                       (myPlayer.y + PLAYER_HEIGHT / 2) + player_view);
            for(let i = 90; i < 180; i += 0.5) {
                ctx.lineTo((myPlayer.x + PLAYER_WIDTH / 2) + Math.cos(i * Math.PI / 180) * player_view,
                        (myPlayer.y + PLAYER_HEIGHT / 2) + Math.sin(i * Math.PI / 180) * player_view);
            }
            ctx.fill();

            // top left curve
            ctx.beginPath();
            ctx.moveTo((myPlayer.x + PLAYER_WIDTH / 2) - player_view,
                       (myPlayer.y + PLAYER_HEIGHT / 2) - player_view);
            for(let i = 180; i < 270; i += 0.5) {
                ctx.lineTo((myPlayer.x + PLAYER_WIDTH / 2) + Math.cos(i * Math.PI / 180) * player_view,
                        (myPlayer.y + PLAYER_HEIGHT / 2) + Math.sin(i * Math.PI / 180) * player_view);
            }
            ctx.fill();

            // top right curve
            ctx.beginPath();
            ctx.moveTo((myPlayer.x + PLAYER_WIDTH / 2) + player_view,
                       (myPlayer.y + PLAYER_HEIGHT / 2) - player_view);
            for(let i = 270; i < 360; i += 0.5) {
                ctx.lineTo((myPlayer.x + PLAYER_WIDTH / 2) + Math.cos(i * Math.PI / 180) * player_view,
                        (myPlayer.y + PLAYER_HEIGHT / 2) + Math.sin(i * Math.PI / 180) * player_view);
            }
            ctx.fill();

            // area of circle around player not lit by flashlight
            ctx.beginPath();
            ctx.moveTo(myPlayer.x + PLAYER_WIDTH / 2,
                       myPlayer.y + PLAYER_HEIGHT / 2);
            ctx.lineTo(myPlayer.x + PLAYER_WIDTH / 2 + Math.cos(myPlayer.angle + (PLAYER_FOV / 2) * Math.PI / 180),
                       myPlayer.y + PLAYER_HEIGHT / 2 + Math.sin(myPlayer.angle + (PLAYER_FOV / 2) * Math.PI / 180));
            ctx.arc(myPlayer.x + PLAYER_WIDTH / 2,
                    myPlayer.y + PLAYER_HEIGHT / 2,
                    player_view,
                    myPlayer.angle + (PLAYER_FOV / 2) * Math.PI / 180,
                    myPlayer.angle - (PLAYER_FOV / 2) * Math.PI / 180);
            ctx.moveTo(myPlayer.x + PLAYER_WIDTH / 2,
                       myPlayer.y + PLAYER_HEIGHT / 2);
            ctx.fill();
        }

        // check if game is over
        if(state.gameOver) {
            //clearInterval(intervalId);
            gameOver(state);
            return;
        }
    }
}

function gameOver(state) {
    if(state.winner === myPlayer.team) {
        ctx.fillStyle = '#00ff00';
        ctx.font = '60px Arial';
        ctx.fillText('You Win!', canvas.width / 2 - 100, canvas.height / 2);
    }
    else {
        ctx.fillStyle = '#ff0000';
        ctx.font = '60px Arial';
        ctx.fillText('You Lose!', canvas.width / 2 - 100, canvas.height / 2);
    }

    // update score
    redTeamScoreDisplay.innerText = gameState.score[0];
    blueTeamScoreDisplay.innerText = gameState.score[1];
}