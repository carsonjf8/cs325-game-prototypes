const { FRAME_RATE, NUM_TEAMS, CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT, LASER_RADIUS, LASER_SPEED, WALL_GRID_SIZE, POWERUP_COOLDOWN, MAX_POWERUPS, NUM_POWERUP_TYPES, MAX_SCORE } = require('./constants');
const { collideCircleRect, makeid } = require('./utils');
module.exports = {
    initGame,
    gameLoop,
    startGame,
    addNewPlayer,
    switchTeam,
    movePlayer,
    removePowerup,
    shootLaser
}

function initGame() {
    const state = createGameState();
    return state;
}

function createGameState() {
    newGameState = {
        players: [
            /*
            {
                id: player_id,
                username: name_of_player,
                team: player_team,
                x: x_location_of_player,
                y: y_location_of_player,
                angle: direction_player_is_facing,
                health: amount_of_health_player_has_left,
                powerups: [
                    {
                        type: powerup_type,
                        duration: time_left
                    }
                ],
                died: flag_if_player_died_in_last_game_loop
            },
            */
        ],
        lasers: [
            /*
            {
                tid: team_id,
                x: x_location,
                y: y_location,
                angle: laser_angle,
                active: is_laser_active
            }
            */
        ],
        map: [
            /*
            {
                x: x_location,
                y: y_location,
                w: width,
                h: height
            }
            */
        ],
        powerups: [
            /*
            {
                puid: power_up_id,
                x: x_location,
                y: y_location,
                type: powerup_name (rapid fire, large flashlight)
            }
            */
        ],
        score: [
            0, // team_0_score
            0 // team_1_score
        ],
        active: false,
        gameOver: false,
        winner: -1,
        powerupCooldown: POWERUP_COOLDOWN,
    };

    newGameState = createWalls(newGameState);

    return newGameState;
}

function createWalls(state) {
    state.map = [];

    // init arrays
    for(let i = 0; i < CANVAS_HEIGHT / WALL_GRID_SIZE; i++) {
        state.map.push([]);
        for(let j = 0; j < CANVAS_WIDTH / WALL_GRID_SIZE; j++) {
            state.map[i].push(0);
        }
    }

    // fill border
    for(let i = 0; i < state.map[0].length; i++) {
        state.map[0][i] = 1;
        state.map[state.map.length - 1][i] = 1;
    }
    for(let i = 0; i < state.map.length; i++) {
        state.map[i][0] = 1;
        state.map[i][state.map[0].length - 1] = 1;
    }

    // generate middle walls
    for(let i = 0; i < state.map[0].length; i++) {
        for(let j = 0; j < state.map.length; j++) {
            if(Math.random() < 0.25) { // chance of wall being here
                state.map[j][i] = 1;
            }
        }
    }

    // check for connectivity
    state, connections = connectedMap(state, 0);
    if(connections <= 100) {
        return createWalls(state);
    }

    return state;
}

function connectedMap(state, count) {
    newCount = count;
    // select initial point to search for connections from
    if(newCount == 0) {
        for(let i = 1; i < state.map[0].length - 1; i++) {
            for(let j = 1; j < state.map.length - 1; j++) {
                if(state.map[j][i] == 0) {
                    state.map[j][i] = 2;
                    newCount = 1;
                    break;
                }
            }
            if(newCount != 0) {
                break;
            }
        }
    }
    // find new connections
    for(let i = 1; i < state.map[0].length - 1; i++) {
        for(let j = 1; j < state.map.length - 1; j++) {
            if(state.map[j][i] == 0 &&
                (state.map[j - 1][i] == 2 || state.map[j + 1][i] == 2 ||
                    state.map[j][i - 1] == 2 || state.map[j][i + 1] == 2)) {
                state.map[j][i] = 2;
                newCount++;
            }
        }
    }
    
    // found all connections
    if(count == newCount) {
        // convert unconnected area to walls
        for(let i = 1; i < state.map[0].length - 1; i++) {
            for(let j = 1; j < state.map.length - 1; j++) {
                if(state.map[j][i] == 0) {
                    state.map[j][i] = 1;
                }
            }
        }

        // reset ground values
        for(let i = 1; i < state.map[0].length - 1; i++) {
            for(let j = 1; j < state.map.length - 1; j++) {
                if(state.map[j][i] == 2) {
                    state.map[j][i] = 0;
                }
            }
        }

        return state, newCount;
    }
    else {
        return connectedMap(state, newCount);
    }
}

function startGame(state) {
    state.active = true;
    return state;
}

function gameLoop(state) {
    // update game state

    // spawn powerup if ready
    state.powerupCooldown -= (1 / FRAME_RATE);
    if(state.powerupCooldown <= 0 && state.powerups.length < MAX_POWERUPS) {
        state = spawnPowerup(state);
        state.powerupCooldown = POWERUP_COOLDOWN;
    }

    // update laser position
    for(let i = 0; i < state.lasers.length; i++) {
        if(!state.lasers[i].active) {
            continue;
        }

        state.lasers[i] = moveLaser(state.lasers[i]);
        if(laserWallCollision(state, state.lasers[i]) || laserHitPlayer(state, state.lasers[i])) {
            state.lasers[i].active = false;
        }
    }
    // clean laser list
    let newLaserList = []
    for(let i = 0; i < state.lasers.length; i++) {
        if(state.lasers[i].active) {
            newLaserList.push(state.lasers[i]);
        }
    }
    state.lasers = newLaserList;

    if(state.score[0] >= MAX_SCORE) {
        state.winner = 0;
        state.gameOver = true;
        state.active = false;
    }
    else if(state.score[1] >= MAX_SCORE) {
        state.winner = 1;
        state.gameOver = true;
        state.active = false;
    }

    return state;
}

function spawnPowerup(state) {
    let randX = Math.floor(Math.random() * CANVAS_WIDTH / WALL_GRID_SIZE);
    let randY = Math.floor(Math.random() * CANVAS_HEIGHT / WALL_GRID_SIZE);
    if(state.map[randY][randX] == 0) {
        let randPU = Math.floor(Math.random() * NUM_POWERUP_TYPES);
        let puid = makeid(5);
        newPowerup = {
            puid: puid,
            x: randX * WALL_GRID_SIZE,
            y: randY * WALL_GRID_SIZE,
            type: randPU
        };
        state.powerups.push(newPowerup);
    }

    return state;
}

function moveLaser(laser) {
    laser.x += Math.cos(laser.angle) * LASER_SPEED;
    laser.y += Math.sin(laser.angle) * LASER_SPEED;
    return laser;
}

function laserWallCollision(state, laser) {
    // check collisions for nearby cells
    let gridX = Math.floor(laser.x / WALL_GRID_SIZE);
    let gridY = Math.floor(laser.y / WALL_GRID_SIZE);
    for(let i = -1; i <= 1; i++) {
        for(let j = -1; j <= 1; j++) {
            // if cell is not a wall or it's out of bounds, skip it
            if(gridX + i < 0 || gridX + i >= state.map[0].length ||
                gridY + j < 0 || gridY + j >= state.map.length ||
                state.map[gridY + j][gridX + i] != 1) {
                continue;
            }

            let wallX = (gridX + i) * WALL_GRID_SIZE;
            let wallY = (gridY + j) * WALL_GRID_SIZE;

            if(collideCircleRect(laser.x, laser.y, LASER_RADIUS, wallX, wallY, WALL_GRID_SIZE, WALL_GRID_SIZE)) {
                return true;
            }
        }
    }
    return false;
}

function laserHitPlayer(state, laser) {
    for(let i = 0; i < state.players.length; i++) {
        // console.log(laser.tid + ' ' + state.players[i].team);
        if(laser.tid === state.players[i].team) {
            continue;
        }

        if(collideCircleRect(laser.x, laser.y, LASER_RADIUS, state.players[i].x, state.players[i].y, PLAYER_WIDTH, PLAYER_HEIGHT)) {
            state.players[i].died = true;
            state.score[laser.tid]++;

            let foundRespawn = false;
            while(!foundRespawn) {
                let randY = Math.floor(Math.random() * (state.map.length - 2) + 1);

                if(state.players[i].team == 0 && state.map[randY][1] == 0 ||
                   state.players[i].team == 1 && state.map[randY][state.map[0].length - 2] == 0) {
                    foundRespawn = true;
                    state.players[i].x = Math.floor((1 + state.players[i].team * (state.map[0].length - 3)) * WALL_GRID_SIZE);
                    state.players[i].y = Math.floor(randY * WALL_GRID_SIZE);
                }
            }

            return true;
        }
    }
    return false;
}

function addNewPlayer(state, playerId, username) {
    newPlayer = {
        id: playerId,
        username: username,
        team: playerId % NUM_TEAMS,
        x: 0,
        y: 0,
        angle: 0,
        health: 100,
        powerups: [],
        died: false
    };

    let teamX = newPlayer.team ? state.map[0].length - 2 : 1;
    newPlayer.x = teamX * WALL_GRID_SIZE;

    let valid = false;
    while(!valid) {
        let randY = Math.floor(Math.random() * state.map.length);
        if(state.map[randY][teamX] == 0) {
            valid = true;
            newPlayer.y = randY * WALL_GRID_SIZE;
        }
    }

    state.players.push(newPlayer);
    return state;
}

function switchTeam(state, playerId) {
    state.players[playerId].team = (state.players[playerId].team + 1) % NUM_TEAMS;
    return state;
}

function movePlayer(state, pid, x, y) {
    state.players[pid].x = x;
    state.players[pid].y = y;
    return state;
}

function removePowerup(state, puid) {
    newPowerupList = [];
    for(let i = 0; i < state.powerups.length; i++) {
        if(state.powerups[i].puid != puid) {
            newPowerupList.push(state.powerups[i]);
        }
    }
    state.powerups = newPowerupList;
    return state;
}

function shootLaser(state, tid, x, y, angle) {
    state.lasers.push({
        tid: tid,
        x: x,
        y: y,
        angle: angle,
        active: true
    });
    return state;
}
