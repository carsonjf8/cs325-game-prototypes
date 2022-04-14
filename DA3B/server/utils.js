module.exports = {
    makeid, collideRectRect, collidePointRect, collideCircleLine, collideCirclePoint, collidePointLine, collideCircleRect
}

function makeid(length) {
    var result = '';
    var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for( var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
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

function collideCircleRect(cx, cy, cr, rx, ry, rw, rh) {
    // convert x and y to center x and y
    cx += cr;
    cy += cr;
    rx += rw / 2;
    ry += rh / 2;

    let distX = Math.abs(cx - rx);
    let distY = Math.abs(cy - ry);

    if(distX > (rw / 2) + cr || distY > (rh / 2) + cr) {
        return false;
    }

    if(distX <= rw / 2 || distY <= rh / 2) {
        return true;
    }

    let cornerDist_sqrd = Math.pow(distX - rw / 2, 2) + Math.pow(distY - rh / 2, 2);

    if(cornerDist_sqrd <= Math.pow(cr, 2)) {
        return true;
    }
    return false;
}
