'use strict';
var yColor = '#00ff00';
var eColor = '#ff0000';
var driverInterval = 20;
var pStars = .0001;
var starSize = 1;
var shipSize = 30;
var torpedoSize = 5;
var debrisSize = shipSize / 4;
var turnRate = 850 / 4000;
var acceleRate = 0.00050;
var torpDV = 0.15;
var torpLifetime = 10000;
var maxTorps = 50000;
var eSpeedLimit = 0.08;
var eFireDistance = 2000;
var debrisTime = 300;
var nDebris = 30;
var debrisDV = 0.05;
var endGameTime = 100;
var scoreWidth = 20;
var scoreHeight = scoreWidth * 2;
var scorePadding = 15;
var scoreSpacing = 10;
var yScore = 0,
    eScore = 0;
var yShip, eShip;
var paused;
var restartTime;
var prevTime = null;
var canvasElement = document.getElementById('canvas');
var backstageElement;
var width, height;
var canvasCtx, backstageCtx;
var infoClosedElement = document.getElementById('infoClosed');
var blockElement = document.getElementById('block');
var infoOpenElement = document.getElementById('infoOpen');
var startElement = document.getElementById('start');
var things;
var isFiringInterval;
var thingType = {
    star: 0,
    ship: 1,
    torpedo: 2,
    debris: 3
};
var debrisKind = {
    line: 0,
    curve: 1,
    bit: 2,
    crew: 3
};
debrisKind.first = debrisKind.line;
debrisKind.last = debrisKind.crew;
debrisKind.lastNoCrew = debrisKind.bit;

function log(x, c="#000") {

    var logspan = document.createElement("span");
    logspan.style.color = c;
    logspan.innerText = `[${new Date().getTime()}] ${x}`;

    document.getElementById("log").appendChild(document.createElement("br"))
    document.getElementById("log").appendChild(logspan)

    document.getElementById("log").scrollTop = document.getElementById("log").scrollHeight;

}

function Load() {
    backstageElement = document.createElement('canvas');
    window.onresize = Resize;
    Resize();
    document.onkeydown = KeyHandler;
    document.onkeyup = KeyHandler;
    InfoOpen();
    InitGame();
    setInterval(Run, driverInterval);
}

function Resize() {
    width = canvasElement.clientWidth;
    height = canvasElement.clientHeight;
    canvasElement.width = backstageElement.width = width;
    canvasElement.height = backstageElement.height = height;
    canvasCtx = canvasElement.getContext('2d');
    backstageCtx = backstageElement.getContext('2d');
    var canvasSize = Math.min(width, height);
}

function InitGame() {
    things = [];
    var nStars = Math.round(width * height * pStars);
    for (var i = 0; i < nStars; ++i)
        AddStar(acme.utils.RandInt(0, width), acme.utils.RandInt(0, height));
    yShip = AddShip(width / 4, height - height / 4, 0, yColor);
    eShip = AddShip(width - width / 4, height / 4, 180, eColor);
    restartTime = null;
}

function Run() {
    if (paused)
        return;
    var time = ClockMsecs();
    if (prevTime !== null) {
        var interval = time - prevTime;
        if (restartTime !== null)
            if (restartTime <= 0) {
                while (things.length > 0)
                    RemoveThing(things[0]);
                InitGame();
                return;
            }
        else {
            restartTime -= interval;
        }
        CheckCollisions(interval);
        CheckExpirations(interval);
        if (eShip)
            EnemyStrategy();
        if (yShip)
            Action(yShip, interval);
        if (eShip)
            Action(eShip, interval);
        for (var i = 0; i < things.length; ++i) {
            things[i].x = acme.utils.Mod(things[i].x + things[i].dx * interval, width);
            things[i].y = acme.utils.Mod(things[i].y + things[i].dy * interval, height);
            things[i].a = acme.utils.Mod(things[i].a + things[i].da * interval, 360);
        }
    }
    backstageCtx.fillStyle = '#000000';
    backstageCtx.fillRect(0, 0, width, height);
    DrawScores();
    for (var i = 0; i < things.length; ++i) {
        var thing = things[i];
        switch (thing.type) {
            case thingType.star:
                DrawStar(thing);
                break;
            case thingType.ship:
                DrawShip(thing);
                break;
            case thingType.torpedo:
                DrawTorpedo(thing);
                break;
            case thingType.debris:
                DrawDebris(thing);
                break;
        }
    }
    canvasCtx.drawImage(backstageElement, 0, 0);
    prevTime = time;
}

function CheckCollisions(interval) {

    if (yShip && eShip && Collision(yShip, eShip)) {
        Explode(yShip);
        ++eScore;
        Explode(eShip);
        ++yScore;
    } else {
        if (yShip) {
            for (var i = 0; i < things.length; ++i) {
                var thing = things[i];

                if (thing.type == thingType.torpedo && Collision(yShip, thing) && (thing.color != yShip.color)) {
                    RemoveThing(thing);
                    --thing.ship.nTorps;
                    Explode(yShip);
                    ++eScore;
                    break;
                }

                if (thing.type == thingType.torpedo && Distance(yShip, thing) < 50) {

                    log(`CLOSE ONE! ${Math.round(Distance(yShip, thing))} pixels between player and torp.`, thing.color);

                }
            }
        }
        if (eShip) {
            for (var i = 0; i < things.length; ++i) {
                var thing = things[i];
                if (thing.type == thingType.torpedo && Collision(eShip, thing) && (thing.color != eShip.color)) {
                    RemoveThing(thing);
                    --thing.ship.nTorps;
                    Explode(eShip);
                    ++yScore;
                    break;
                }
            }
        }
    }
}

function Collision(thing1, thing2) {
    var dx = thing1.x - thing2.x;
    var dy = thing1.y - thing2.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    return d < (thing1.size + thing2.size) / 2;
}

function Distance(thing1, thing2) {

    var dx = thing1.x - thing2.x;
    var dy = thing1.y - thing2.y;
    return Math.sqrt(dx * dx + dy * dy);

}

function CheckExpirations(interval) {
    for (var i = things.length - 1; i >= 0; --i) {
        var thing = things[i];
        if (thing.lifetime !== null)
            if (thing.lifetime <= 0) {
                RemoveThing(thing);
                if (thing.expireProc !== null)
                    thing.expireProc(thing);
            }
        else
            thing.lifetime -= interval;
    }
}

function EnemyStrategy() {
    if (!yShip) {
        eShip.left = eShip.right = eShip.thrust = false;
        return;
    }

    var dx = eShip.x - yShip.x;
    var dy = eShip.y - yShip.y;
    var desiredAngle = acme.utils.Mod(acme.utils.RadToDeg(Math.atan2(-dx, dy)), 360);
    var deltaAngle = desiredAngle - eShip.a;
    if (deltaAngle > 180) deltaAngle -= 360;
    else if (deltaAngle < -180) deltaAngle += 360;

    if (deltaAngle < -10 || (eShip.left && deltaAngle < 5)) {
        eShip.left = true;
        eShip.right = false;
        eShip.thrust = false;
    } else if (deltaAngle > 10 || (eShip.right && deltaAngle > -5)) {
        eShip.right = true;
        eShip.left = false;
        eShip.thrust = false;
    } else {
        eShip.left = eShip.right = false;
        var v = Math.sqrt(eShip.dx * eShip.dx + eShip.dy * eShip.dy);
        var r = acme.utils.DegToRad(eShip.a);
        var newDX = eShip.dx + acceleRate * driverInterval * Math.sin(r);
        var newDY = eShip.dy - acceleRate * driverInterval * Math.cos(r);
        var newV = Math.sqrt(newDX * newDX + newDY * newDY);
        if (eShip.thrust) {
            if (newV >= eSpeedLimit || Math.random() < 0.15) {
                log("Enemy ship is stopping thrust")
                eShip.thrust = false;
            }
        } else {
            if ((newV < eSpeedLimit || newV < v) && Math.random() < 0.10) {
                eShip.thrust = true;
                log("Enemy ship is starting thrust")
            }
                
        }
        var distance = Math.sqrt(dx * dx + dy + dy);
        if (distance < eFireDistance && Math.random() < 0.20) {
            log("Enemy ship is firing, distance to tgt " + distance);
            Fire(eShip);
        }
    }
}

function Action(ship, interval) {
    if (ship.thrust) {
        var r = acme.utils.DegToRad(ship.a);
        ship.dx += acceleRate * interval * Math.sin(r);
        ship.dy -= acceleRate * interval * Math.cos(r);
    }
    if (ship.left && !ship.right)
        ship.a = acme.utils.Mod(ship.a - turnRate * interval, 360);
    else if (ship.right && !ship.left)
        ship.a = acme.utils.Mod(ship.a + turnRate * interval, 360);
}

function Fire(ship) {
    if (ship.nTorps < maxTorps) {
        ++ship.nTorps;
        var r = acme.utils.DegToRad(ship.a);
        var s = Math.sin(r);
        var c = Math.cos(r);
        AddTorpedo(ship.x + ship.size * 0.6 * s, ship.y - ship.size * 0.6 * c, ship.dx + torpDV * s, ship.dy - torpDV * c, ship, torpLifetime, TorpExpire);

        log(`Ship just fired. ${maxTorps - ship.nTorps} torpedoes remain`, ship.color)

    }
}

function TorpExpire(torp) {
    --torp.ship.nTorps;
}

function Explode(ship) {

    log("Ship just exploded", ship.color)    

    for (var i = 0; i < nDebris; ++i)
        AddDebris(ship.x, ship.y, ship.dx, ship.dy, ship.color, false);

    AddDebris(ship.x, ship.y, ship.dx, ship.dy, ship.color, true);
    RemoveThing(ship);
    restartTime = endGameTime;

}

function DrawScores() {
    var str = yScore + '';
    DrawScore(scorePadding, scorePadding + scoreHeight, yColor, str);
    str = eScore + '';
    DrawScore(width - scorePadding - str.length * scoreWidth - (str.length - 1) * scoreSpacing, scorePadding + scoreHeight, eColor, str);
}
var cc0 = "0".charCodeAt(0);
var cc9 = "9".charCodeAt(0);
var cca = "a".charCodeAt(0);
var ccf = "f".charCodeAt(0);
var ccA = "A".charCodeAt(0);
var ccF = "F".charCodeAt(0);

function DrawScore(x, y, color, str) {
    backstageCtx.strokeStyle = color;
    for (var i = 0; i < str.length; ++i) {
        var cc = str.charCodeAt(i);
        var digit;
        if (cc >= cc0 && cc <= cc9)
            digit = cc - cc0;
        else if (cc >= cca && cc <= ccf)
            digit = cc - cca + 10;
        else if (cc >= ccA && cc <= ccF)
            digit = cc - ccA + 10;
        else
            return;
        DrawDigit(digit, x, y, scoreWidth, scoreHeight);
        x += scoreWidth + scoreSpacing;
    }
}
var segBits = [
    [1, 1, 1, 0, 1, 1, 1],
    [0, 0, 1, 0, 0, 1, 0],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 0, 1, 1],
    [0, 1, 1, 1, 0, 1, 0],
    [1, 1, 0, 1, 0, 1, 1],
    [1, 1, 0, 1, 1, 1, 1],
    [1, 0, 1, 0, 0, 1, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 0, 1, 0],
    [1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 1, 1, 1, 1],
    [1, 1, 0, 0, 1, 0, 1],
    [0, 0, 1, 1, 1, 1, 1],
    [1, 1, 0, 1, 1, 0, 1],
    [1, 1, 0, 1, 1, 0, 0]
];
var segCoords = [{
    x0: 0.0,
    y0: 1.0,
    x1: 1.0,
    y1: 1.0
}, {
    x0: 0.0,
    y0: 0.5,
    x1: 0.0,
    y1: 1.0
}, {
    x0: 1.0,
    y0: 0.5,
    x1: 1.0,
    y1: 1.0
}, {
    x0: 0.0,
    y0: 0.5,
    x1: 1.0,
    y1: 0.5
}, {
    x0: 0.0,
    y0: 0.0,
    x1: 0.0,
    y1: 0.5
}, {
    x0: 1.0,
    y0: 0.0,
    x1: 1.0,
    y1: 0.5
}, {
    x0: 0.0,
    y0: 0.0,
    x1: 1.0,
    y1: 0.0
}];

function DrawDigit(digit, x, y, w, h) {
    for (var seg = 0; seg < segCoords.length; ++seg)
        if (segBits[digit][seg]) {
            backstageCtx.beginPath();
            backstageCtx.moveTo(x + w * segCoords[seg].x0, y - h * segCoords[seg].y0);
            backstageCtx.lineTo(x + w * segCoords[seg].x1, y - h * segCoords[seg].y1);
            backstageCtx.stroke();
        }
}

function DrawStar(star) {
    var g = acme.utils.RandInt(170, 255);
    backstageCtx.fillStyle = MakeColor(g, g, g);
    backstageCtx.fillRect(star.x - Math.round(star.size / 2), star.y - Math.round(star.size / 2), star.size, star.size);
}

function DrawShip(ship) {
    backstageCtx.save();
    backstageCtx.translate(ship.x, ship.y);
    backstageCtx.rotate(acme.utils.DegToRad(ship.a));
    backstageCtx.beginPath();
    backstageCtx.moveTo(0, -ship.size / 2);
    backstageCtx.lineTo(ship.size / 4, ship.size / 4);
    backstageCtx.lineTo(0, ship.size / 8);
    backstageCtx.lineTo(-ship.size / 4, ship.size / 4);
    backstageCtx.closePath();
    backstageCtx.fillStyle = ship.color;
    backstageCtx.fill();
    if (ship.thrust) {
        backstageCtx.strokeStyle = ship.color;
        backstageCtx.beginPath();
        backstageCtx.moveTo(0, ship.size / 8);
        backstageCtx.lineTo(0, ship.size / 3);
        backstageCtx.stroke();
        backstageCtx.beginPath();
        backstageCtx.moveTo(0, ship.size / 8);
        backstageCtx.lineTo(ship.size / 16, ship.size / 3);
        backstageCtx.stroke();
        backstageCtx.beginPath();
        backstageCtx.moveTo(0, ship.size / 8);
        backstageCtx.lineTo(-ship.size / 16, ship.size / 3);
        backstageCtx.stroke();
    }
    backstageCtx.restore();
}

function DrawTorpedo(torpedo) {
    backstageCtx.fillStyle = torpedo.color;
    backstageCtx.fillRect(torpedo.x - Math.round(torpedo.size / 2), torpedo.y - Math.round(torpedo.size / 2), torpedo.size, torpedo.size);
}

function DrawDebris(debris) {
    backstageCtx.save();
    backstageCtx.strokeStyle = debris.color;
    backstageCtx.translate(debris.x, debris.y);
    backstageCtx.rotate(acme.utils.DegToRad(debris.a));
    backstageCtx.beginPath();
    switch (debris.kind) {
        case debrisKind.line:
            backstageCtx.moveTo(-debris.size / 2, 0);
            backstageCtx.lineTo(debris.size / 2, 0);
            break;
        case debrisKind.curve:
            backstageCtx.arc(0, debris.size / 2, debris.size / 2, -acme.utils.DegToRad(60), acme.utils.DegToRad(60));
            break;
        case debrisKind.bit:
            backstageCtx.moveTo(0, 0);
            backstageCtx.lineTo(1, 0);
            backstageCtx.lineTo(1, 1);
            break;
        case debrisKind.crew:
            backstageCtx.moveTo(0, 0);
            backstageCtx.lineTo(2, 3);
            backstageCtx.moveTo(0, 0);
            backstageCtx.lineTo(-2, 3);
            backstageCtx.moveTo(0, 0);
            backstageCtx.lineTo(0, -3.5);
            backstageCtx.lineTo(-0.5, -4);
            backstageCtx.lineTo(0, -4.5);
            backstageCtx.lineTo(0.5, -4);
            backstageCtx.lineTo(0, -3.5);
            backstageCtx.moveTo(-2, -3);
            backstageCtx.lineTo(0, -2);
            backstageCtx.lineTo(2, -3);
            break;
    }
    backstageCtx.stroke();
    backstageCtx.restore();
}
var kcSpace = "Space";
var kcLeft = "ArrowLeft";
var kcRight = "ArrowRight";
var kcUp = "ArrowUp";
var kcDown = "ArrowDown";
var kcEscape = "Escape";

function KeyHandler(e) {
    if (!e)
        e = window.event;
    var t = e.type;
    var kc = e.code || e.which;
    if (paused) {
        if (t == 'keydown') {
            switch (kc) {
                case kcEscape:
                    InfoClose();
                    break;
            }
        }
        return;
    }
    if (!yShip)
        return;
    if (t == 'keydown') {
        switch (kc) {
            case "Space":
                Fire(yShip);
                break;
            case "ArrowLeft": case "KeyA":
                yShip.left = true;
                break;
            case "ArrowRight": case "KeyD":
                yShip.right = true;
                break;
            case "ArrowUp": case "KeyW":
                yShip.thrust = true;
                break;
            case "Escape":
                InfoOpen();
                break;
        }
    } else if (t == 'keyup') {
        switch (kc) {
            case "ArrowLeft": case "KeyA":
                yShip.left = false;
                break;
            case "ArrowRight": case "KeyD":
                yShip.right = false;
                break;
            case "ArrowUp": case "KeyW":
                yShip.thrust = false;
                break;
        }
    }
}

function AddStar(x, y) {
    return AddThing(thingType.star, x, y, 0, 0, 0, 0, starSize, null, null, null, null);
}

function AddShip(x, y, a, color) {
    var ship = AddThing(thingType.ship, x, y, 0, 0, a, 0, shipSize, color, null, null, null);
    ship.left = ship.right = ship.thrust = false;
    ship.nTorps = 0;
    return ship;
}

function AddTorpedo(x, y, dx, dy, ship, lifetime, expireProc) {
    return AddThing(thingType.torpedo, x, y, dx, dy, 0, 0, torpedoSize, ship.color, ship, lifetime, expireProc);
}

function AddDebris(x, y, dx, dy, color, crew) {
    var debris = AddThing(thingType.debris, x + acme.utils.RandInt(-shipSize / 2, shipSize / 2), y + acme.utils.RandInt(-shipSize / 2, shipSize / 2), dx + acme.utils.RandReal(-debrisDV, debrisDV), dy + acme.utils.RandReal(-debrisDV, debrisDV), acme.utils.RandReal(0, 360), acme.utils.RandReal(-turnRate, turnRate), acme.utils.RandReal(debrisSize * 0.8, debrisSize * 1.5), color, null, acme.utils.RandReal(debrisTime * 0.8, debrisTime * 1.5), null);
    if (crew) {
        debris.kind = debrisKind.crew;
        debris.lifetime *= 2;
    } else
        debris.kind = acme.utils.RandInt(debrisKind.first, debrisKind.lastNoCrew);
    return debris;
}

function AddThing(type, x, y, dx, dy, a, da, size, color, ship, lifetime, expireProc) {
    var thing = {
        type: type,
        x: x,
        y: y,
        dx: dx,
        dy: dy,
        a: a,
        da: da,
        size: size,
        color: color,
        ship: ship,
        lifetime: lifetime,
        expireProc: expireProc
    };
    things.push(thing);
    return thing;
}

function RemoveThing(thing) {
    for (var i = 0; i < things.length; ++i)
        if (things[i] == thing) {
            things.splice(i, 1);
            break;
        }
    if (thing == yShip)
        yShip = null;
    else if (thing == eShip)
        eShip = null;
}

function InfoOpen() {
    paused = true;
    infoClosedElement.style.display = 'none';
    blockElement.style.display = infoOpenElement.style.display = '';
}

function InfoClose() {
    blockElement.style.display = infoOpenElement.style.display = 'none';
    startElement.innerHTML = '&nbsp;Resume&nbsp;';
    infoClosedElement.style.display = '';
    if (prevTime !== null)
        prevTime = ClockMsecs();
    paused = false;
}

function ClockMsecs() {
    var d = new Date();
    return d.getTime();
}

function MakeColor(r, g, b) {
    return '#' +
        acme.utils.ZeroPad(r.toString(16), 2) +
        acme.utils.ZeroPad(g.toString(16), 2) +
        acme.utils.ZeroPad(b.toString(16), 2);
}