const { NUM_TEAMS, CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT, LASER_RADIUS, LASER_SPEED } = require('./constants');

module.exports = {
    initGame,
    gameLoop,
    startGame,
    addNewPlayer,
    switchTeam,
    movePlayer,
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
        active: false,
        gameOver: false,
    };

    return newGameState;
}

function startGame(state) {
    state.active = true;
    return state;
}

function gameLoop(state) {
    // update game state

    // update laser position
    for(let i = 0; i < state.lasers.length; i++) {
        if(!state.lasers[i].active) {
            continue;
        }

        state.lasers[i] = moveLaser(state.lasers[i]);
        if(hitOuterWalls(state.lasers[i]) || hitPlayer(state, state.lasers[i])) {
            state.lasers[i].active = false;
            //state.lasers.remove(state.lasers[i]);
            // i--;
        }
    }

    return state;
}

function moveLaser(laser) {
    if(!laser.active) {
        return laser;
    }

    laser.x += Math.cos(laser.angle) * LASER_SPEED;
    laser.y += Math.sin(laser.angle) * LASER_SPEED;
    return laser;
}

function hitOuterWalls(laser) {
    if(collideCircleLine(laser.x, laser.y, LASER_RADIUS, 0, 0, CANVAS_WIDTH, 0) || // top wall
       collideCircleLine(laser.x, laser.y, LASER_RADIUS, CANVAS_WIDTH, 0, CANVAS_WIDTH, CANVAS_HEIGHT) || // right wall
       collideCircleLine(laser.x, laser.y, LASER_RADIUS, 0, 0, 0, CANVAS_HEIGHT) || // left wall
       collideCircleLine(laser.x, laser.y, LASER_RADIUS, 0, CANVAS_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT)) { // bottom wall
        return true;
    }
    return false;
}

function hitPlayer(state, laser) {
    for(let i = 0; i < state.players.length; i++) {
        // console.log(laser.tid + ' ' + state.players[i].team);
        if(laser.tid === state.players[i].team) {
            continue;
        }

        if(collidePointRect(laser.x, laser.y, state.players[i].x, state.players[i].y, PLAYER_WIDTH, PLAYER_HEIGHT)) {// collideCircleRect(laser.x, laser.y, LASER_RADIUS, state.players[i].x, state.players[i].y, PLAYER_WIDTH, PLAYER_HEIGHT)) {
            state.players[i].x = (state.players[i].team ? PLAYER_WIDTH : CANVAS_WIDTH - 2 * PLAYER_WIDTH);
            state.players[i].y = Math.random() * (CANVAS_HEIGHT - 2 * PLAYER_HEIGHT) + PLAYER_HEIGHT;
            state.players[i].died = true;
            return true;
        }
    }
    return false;
}

function collidePointRect(px, py, rx, ry, rw, rh) {
    if(px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) {
        return true;
    }
    return false;
}

function collideCircleLine(cx, cy, cr, lsx, lsy, lex, ley) {
    if(collideCirclePoint(cx, cy, cr, lsx, lsy) || 
       collideCirclePoint(cx, cy, cr, lex, ley)) {
        return true;
    }

    let distX = lsx - lex;
    let distY = lsy - ley;
    let dist = Math.sqrt((distX * distX) + (distY * distY));

    let dot = (((cx - lsx) * (lex - lsx)) + ((cy - lsy) * (ley - lsy))) / (dist * dist);

    let closestX = lsx + (dot * (lex - lsx));
    let closestY = lsy + (dot * (ley - lsy));

    if(!collidePointLine(closestX, closestY, lsx, lsy, lex, ley)) {
        return false;
    }

    distX = closestX - cx;
    distY = closestY - cy;
    dist = Math.sqrt((distX * distX) + (distY * distY));

    if(dist <= cr) {
        return true;
    }
    return false;
}

function collideCirclePoint(cx, cy, cr, px, py) {
    let distX = px - cx;
    let distY = py - cy;
    let dist = Math.sqrt((distX * distX) + (distY * distY));
    
    if(dist < cr) {
        return true;
    }
    return false;
}

function collidePointLine(px, py, lsx, lsy, lex, ley) {
    let dist1 = Math.sqrt(Math.pow(lsx - px, 2) + Math.pow(lsy - py, 2));
    let dist2 = Math.sqrt(Math.pow(lex - px, 2) + Math.pow(ley - py, 2));

    let lineLen = Math.sqrt(Math.pow(lsx - lex, 2) + Math.pow(lsy - ley, 2));

    if(dist1 + dist2 >= lineLen - 0.1 && dist1 + dist2 <= lineLen + 0.1) {
        return true;
    }
    return false;
}

function collideCircleRect(cx, cy, cr, rectX, rectY, rectW, rectH) {
    let testX = cx;
    let testY = cy;

    if(cx < rectX) { // test left edge
        testX = rectX;
    }
    else if(cx > rectX + rectW) { // test right edge
        testX = rectX + rectW;
    }
    else if(cy < rectY) { // test top edge
        testY = rectY;
    }
    else if(cy > rectY + rectH) { // test bottom edge
        rectY + rectH;
    }

    let distX = cx - testX;
    let distY = cy - testY;
    let dist = Math.sqrt((distX * distX) + (distY * distY));

    if(dist <= cr) {
        return true;
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
        died: false
    };
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
