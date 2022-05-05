import { Shape, SphereGeometry, Vector3, BoxHelper, MeshBasicMaterial, MeshStandardMaterial, HemisphereLight, MeshLambertMaterial, Group, BufferAttribute, BufferGeometry, Vector2, ShapeGeometry, ExtrudeGeometry, AxesHelper, Clock, TextureLoader, Scene, Color, WebGLRenderer, PointLight, Mesh, BoxGeometry, CylinderGeometry, MeshPhysicalMaterial, PMREMGenerator, PerspectiveCamera, ACESFilmicToneMapping, sRGBEncoding, PCFSoftShadowMap, FloatType } from 'https://cdn.skypack.dev/three@0.137';
import { RGBELoader } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/loaders/RGBELoader';
import { mergeBufferGeometries } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/utils/BufferGeometryUtils';
import { FlyControls } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/controls/FlyControls';

const clock = new Clock();

const scene = new Scene();
scene.background = new Color("#ffeecc");

const camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 2000);
camera.rotation.order = "YXZ";
camera.position.set(0, 1, 20);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputEncoding = sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const light = new PointLight(0xffffbb, 100, 1000);
// const light = new PointLight(new Color("#FFCB8E").convertSRGBToLinear().convertSRGBToLinear(), 80, 200);
light.position.set(0, 0, 0);
light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 500;
scene.add(light);

let planeAngle = 0;
let movementSpeed = 200;
let turnSpeed = 1;
let verticalSpeed = 50;
let planeMoveState = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    yawLeft: 0,
    yawRight: 0,
};

function keydownFunc(event) {
    if (event.altKey) {
        return;
    }
    switch (event.code) {
        case 'Space':
            movementSpeed = 1000;
            break;
        case 'KeyW':
            planeMoveState.up = 1;
            break;
        case 'KeyS':
            planeMoveState.down = 1;
            break;
        case 'KeyA':
            planeMoveState.yawLeft = 1;
            break;
        case 'KeyD':
            planeMoveState.yawRight = 1;
            break;
        case 'ArrowLeft':
            planeMoveState.left = 1;
            break;
        case 'ArrowRight':
            planeMoveState.right = 1;
            break;
    }
};

function keyupFunc(event) {
    switch (event.code) {
        case 'Space':
            movementSpeed = 200;
            break;
        case 'KeyW':
            planeMoveState.up = 0;
            break;
        case 'KeyS':
            planeMoveState.down = 0;
            break;
        case 'KeyA':
            planeMoveState.yawLeft = 0;
            break;
        case 'KeyD':
            planeMoveState.yawRight = 0;
            break;
        case 'ArrowLeft':
            planeMoveState.left = 0;
            break;
        case 'ArrowRight':
            planeMoveState.right = 0;
            break;
    }
};

window.addEventListener('keydown', keydownFunc);
window.addEventListener('keyup', keyupFunc);

function boxBoxCollision(x1, y1, z1, x2, y2, z2, w2, h2, d2) {
    if(x1 > x2 - w / 2 && x1 < x2 + w2 / 2 && y1 > y2 - h / 2 && y1 < y2 + h2 / 2 && z1 > z2 - d / 2 && z1 < z2 + d2 / 2) {
        return true;
    }
    return false;
}

function updatePlanePosition(delta, obj) {
    // get angle
    planeAngle += planeMoveState.yawLeft * turnSpeed * delta - planeMoveState.yawRight * turnSpeed * delta;
    // rotate object
    obj.rotation.y = 0;
    obj.rotateY(planeAngle);
    // translate object
    obj.position.set(obj.position.x - Math.cos(planeAngle) * planeMoveState.left * delta + Math.cos(planeAngle) * planeMoveState.right * delta - Math.sin(planeAngle) * movementSpeed * delta,
                     obj.position.y + planeMoveState.up * verticalSpeed * delta - planeMoveState.down * verticalSpeed * delta,
                     obj.position.z + Math.sin(planeAngle) * planeMoveState.left * delta - Math.sin(planeAngle) * planeMoveState.right * delta - Math.cos(planeAngle) * movementSpeed * delta);
}

let envmap;
let tick = 0;

function addBox(list, x, y, z, w, h, d) {
    let boxGeom = new BoxGeometry(w, h, d);
    boxGeom.translate(x, y, z);
    // bufGeom = mergeBufferGeometries([bufGeom, boxGeom]);
    let wallMesh = new Mesh(
        boxGeom,
        new MeshPhysicalMaterial({
            envMap: envmap,
            color: '#0000ff'
        })
    );
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    list.push(wallMesh);
    scene.add(wallMesh);
}

function addCylinder(list, x, y, z, r, h) {
    let cylGeom = new CylinderGeometry(r, r, h, 10);
    cylGeom.translate(x, y, z);
    // bufGeom = mergeBufferGeometries([bufGeom, cylGeom]);
    let wallMesh = new Mesh(
        cylGeom,
        new MeshPhysicalMaterial({
            envMap: envmap,
            color: '#0000ff'
        })
    );
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    list.push(wallMesh);
    scene.add(wallMesh);
}

function addRing(ringList, x, y, z, angle = 0, size = 50) {
    angle *= -1;

    let ringGeom = new BoxGeometry(0, 0, 0);

    let top = new BoxGeometry(size, 10, 10);
    top.translate(0, size / 2 + 5, 0);
    ringGeom = mergeBufferGeometries([ringGeom, top]);
    
    let bottom = new BoxGeometry(size, 10, 10);
    bottom.translate(0, -(size / 2 + 5), 0);
    ringGeom = mergeBufferGeometries([ringGeom, bottom]);
    
    let left = new BoxGeometry(10, size + 20, 10);
    left.translate(-(size / 2 + 5), 0, 0);
    ringGeom = mergeBufferGeometries([ringGeom, left]);
    
    let right = new BoxGeometry(10, size + 20, 10);
    right.translate(size / 2 + 5, 0, 0);
    ringGeom = mergeBufferGeometries([ringGeom, right]);

    ringGeom.rotateY(angle);
    ringGeom.translate(x, y, z);

    let ringMesh = new Mesh(
        ringGeom,
        new MeshPhysicalMaterial({
            envMap: envmap,
            color: '#ffffff'
        })
    );
    ringMesh.castShadow = true;
    ringMesh.receiveShadow = true;

    ringList.push(ringMesh);

    scene.add(ringMesh);

    //bufGeom = mergeBufferGeometries([bufGeom, ringGeom]);
    //return bufGeom;
}

let checkpoint = 0;

(async function() {
    let pmrem = new PMREMGenerator(renderer);
    let envmapTexture = await new RGBELoader().setDataType(FloatType).loadAsync("../assets/envmap.hdr");
    envmap = pmrem.fromEquirectangular(envmapTexture).texture;

    let textures = {
        dirt: await new TextureLoader().loadAsync("../assets/dirt.png"),
    }

    // ring geometries
    let ringList = [];
    addRing(ringList, 0, 100, -500, 0);
    addRing(ringList, 200, 100, -1000, 0);
    addRing(ringList, 0, 100, -1500, 0);
    addRing(ringList, 0, 150, -2000, 0);
    addRing(ringList, 0, 100, -2500, 0);
    addRing(ringList, 0, 50, -3000, 0);
    for(let i = -180; i <= 0; i += 20) {
        addRing(ringList, 1000 + Math.cos(i * Math.PI / 180) * 1000, -180 + 50 - i, -3500 + Math.sin(i * Math.PI / 180) * 1000, i * Math.PI / 180);
    }
    addRing(ringList, 2000, -130, -3000, 0);
    addRing(ringList, 1800, -130, -2500, 0);
    addRing(ringList, 2000, -130, -2000, 0);
    addRing(ringList, 2200, -130, -1500, 0);
    addRing(ringList, 2200, -30, -1000, 0);
    addRing(ringList, 2200, -130, -500, 0);
    addRing(ringList, 1600, -130, -500, 0);
    addRing(ringList, 1200, -130, -1000, Math.PI / 2);
    addRing(ringList, 400, 0, -1200, Math.PI / 2);
    addRing(ringList, -600, 200, -1100, Math.PI / 2);
    addRing(ringList, -1000, 200, -600, 0);
    addRing(ringList, -700, 150, 300, Math.PI / 2);
    addRing(ringList, 0, 100, 0, 0);

    // wall geometries
    let wallList = [];
    addBox(wallList, 0, 100, -1000, 200, 400, 200);
    addBox(wallList, 200, 100, -1500, 200, 400, 200);
    addBox(wallList, 0, 0, -2000, 200, 200, 200);
    addCylinder(wallList, 1000, 0, -3500, 900, 500);
    addBox(wallList, 2000, -130, -2500, 200, 200, 200);
    addBox(wallList, 1800, -130, -2000, 200, 200, 200);
    addBox(wallList, 2000, -130, -1500, 200, 200, 200);
    addBox(wallList, 2200, -200, -1000, 200, 200, 200);
    addBox(wallList, 1900, -130, -500, 200, 600, 800);
    addBox(wallList, 1900, -130, 300, 800, 600, 100);
    addBox(wallList, 2400, -130, 300, 200, 600, 500);
    addBox(wallList, 1400, -130, 300, 200, 600, 500);
    addBox(wallList, 1400, -130, 300, 200, 600, 500);
    addBox(wallList, -500, 150, -400, 800, 600, 800);

    // plane
    let planeGeometry = new BoxGeometry(0, 0, 0);
    // main fuselage
    let fuselageGeometry = new CylinderGeometry(1, 1, 8, 10);
    fuselageGeometry.rotateZ(Math.PI / 2);
    planeGeometry = mergeBufferGeometries([planeGeometry, fuselageGeometry]);
    // nose piece 1
    let nose1Geometry = new CylinderGeometry(0.9, 1, 0.5, 10);
    nose1Geometry.rotateZ(Math.PI / 2);
    nose1Geometry.translate(-4.25, 0, 0);
    planeGeometry = mergeBufferGeometries([planeGeometry, nose1Geometry]);
    // nose piece 2
    let nose2Geometry = new CylinderGeometry(0.7, 0.9, 0.5, 10);
    nose2Geometry.rotateZ(Math.PI / 2);
    nose2Geometry.translate(-4.75, 0, 0);
    planeGeometry = mergeBufferGeometries([planeGeometry, nose2Geometry]);
    // nose piece 3
    let nose3Geometry = new CylinderGeometry(0.3, 0.7, 0.5, 10);
    nose3Geometry.rotateZ(Math.PI / 2);
    nose3Geometry.translate(-5.25, 0, 0);
    planeGeometry = mergeBufferGeometries([planeGeometry, nose3Geometry]);
    // tail fuselage
    let fuselageTailGeometry = new CylinderGeometry(1, 0.5, 4, 10);
    fuselageTailGeometry.rotateZ(Math.PI / 2);
    fuselageTailGeometry.translate(6, 0, 0);
    planeGeometry = mergeBufferGeometries([planeGeometry, fuselageTailGeometry]);
    // cockpit middle
    let cockpitMiddleGeometry = new CylinderGeometry(0.8, 0.8, 2, 10);
    cockpitMiddleGeometry.rotateZ(Math.PI / 2);
    cockpitMiddleGeometry.translate(0, 0.7, 0);
    planeGeometry = mergeBufferGeometries([planeGeometry, cockpitMiddleGeometry]);
    // cockpit front
    let cockpitFrontGeometry = new CylinderGeometry(0.6, 0.8, 1, 10);
    cockpitFrontGeometry.rotateZ(Math.PI / 2);
    cockpitFrontGeometry.translate(-1.5, 0.7, 0);
    planeGeometry = mergeBufferGeometries([planeGeometry, cockpitFrontGeometry]);
    // cockpit back
    let cockpitBackGeometry = new CylinderGeometry(0.8, 0.6, 1, 10);
    cockpitBackGeometry.rotateZ(Math.PI / 2);
    cockpitBackGeometry.translate(1.5, 0.7, 0);
    planeGeometry = mergeBufferGeometries([planeGeometry, cockpitBackGeometry]);
    planeGeometry.rotateY(-Math.PI / 2);
    // plane mesh
    let planeMesh = new Mesh(
        planeGeometry,
        new MeshPhysicalMaterial({
            envMap: envmap,
            map: null,
            envMapIntensity: 0.1,
        })
    );
    planeMesh.castShadow = true;
    planeMesh.receiveShadow = true;

    // front left wing
    let wingShape = new Shape();
    wingShape.moveTo(-1.5, 0);
    wingShape.lineTo(0, -8);
    wingShape.lineTo(2, -8);
    wingShape.lineTo(2, 0);
    wingShape.lineTo(-1.5, 0);
    let wingSettings = {};
    wingSettings.depth = 0.01;
    let wingGeometry = new ExtrudeGeometry(wingShape, wingSettings);
    wingGeometry.rotateX(-Math.PI / 2);
    // front right wing
    let rightWingGeometry = new ExtrudeGeometry(wingShape, wingSettings);
    rightWingGeometry.rotateX(Math.PI / 2);
    wingGeometry = mergeBufferGeometries([wingGeometry, rightWingGeometry]);
    // back left wing
    let backWingShape = new Shape();
    backWingShape.moveTo(0, 0);
    backWingShape.lineTo(-2, 0);
    backWingShape.lineTo(-1.5, -3);
    backWingShape.lineTo(0, -3);
    backWingShape.lineTo(0, 0);
    let backLeftWingGeometry = new ExtrudeGeometry(backWingShape, wingSettings);
    backLeftWingGeometry.rotateX(-Math.PI / 2);
    backLeftWingGeometry.translate(8, 0, 0);
    wingGeometry = mergeBufferGeometries([wingGeometry, backLeftWingGeometry]);
    // back right wing
    let backRightWingGeometry = new ExtrudeGeometry(backWingShape, wingSettings);
    backRightWingGeometry.rotateX(Math.PI / 2);
    backRightWingGeometry.translate(8, 0, 0);
    wingGeometry = mergeBufferGeometries([wingGeometry, backRightWingGeometry]);
    // back middle wing
    let backMiddleWingGeometry = new ExtrudeGeometry(backWingShape, wingSettings);
    backMiddleWingGeometry.rotateX(Math.PI);
    backMiddleWingGeometry.translate(8, 0, 0);
    wingGeometry = mergeBufferGeometries([wingGeometry, backMiddleWingGeometry]);
    wingGeometry.rotateY(-Math.PI / 2);
    // wing mesh
    let wingMesh = new Mesh(
        wingGeometry,
        new MeshPhysicalMaterial({
            envMap: envmap,
            map: null,
            envMapIntensity: 0.1,
        })
    );

    let planeGroup = new Group();
    planeGroup.rotation.order = 'YXZ';
    planeGroup.castShadow = true;
    planeGroup.receiveShadow = true;
    planeGroup.add(planeMesh);
    planeGroup.add(wingMesh);
    let planeCameraGroup = new Group();
    planeCameraGroup.rotation.order = 'YXZ';
    planeCameraGroup.add(planeGroup);
    planeCameraGroup.add(camera);
    camera.position.set(0, 5, 40);
    scene.add(planeCameraGroup);
    planeCameraGroup.position.set(0, 100, 0);

    let planeBBox = new BoxHelper(planeGroup, 0xff0000);
    let ringBBox = new BoxHelper(ringList[checkpoint], 0xff0000);

    function resetToStart(obj) {
        obj.position.set(0, 100, 0);
        obj.rotation.y = 0;
        obj.rotation.x = 0;
        obj.rotation.z = 0;
    }

    renderer.setAnimationLoop(() => {
        /*
        console.log(Math.round(planeGroup.position.x * 100) / 100 + " "
                    + Math.round(planeGroup.position.y * 100) / 100 + " "
                    + Math.round(planeGroup.position.z * 100) / 100 + " --- "
                    + Math.round(planeGroup.rotation.x * 100) / 100 + " "
                    + Math.round(planeGroup.rotation.y * 100) / 100 + " "
                    + Math.round(planeGroup.rotation.z * 100) / 100 + " --- "
                    + Math.round(planeAngle * 100) / 100 + " "
                    + Math.round(Math.cos(planeAngle) * 100) / 100 + " "
                    + Math.round(Math.sin(planeAngle) * 100) / 100);
        */

        const delta = clock.getDelta();
        tick += 1;
        
        // update plane position and rotation
        updatePlanePosition(delta, planeCameraGroup);
        planeGroup.rotation.x = 0;
        planeGroup.rotation.z = 0;
        planeGroup.rotateX(Math.PI / 4 * (planeMoveState.up - planeMoveState.down));
        planeGroup.rotateZ(Math.PI / 4 * (planeMoveState.yawLeft - planeMoveState.yawRight));

        const cylinderGeomIndexList = [3];
        // check for collision with walls
        for(let i = 0; i < wallList.length; i++) {
            let isCylinder = false;
            for(let j = 0; j < cylinderGeomIndexList.length; j++) {
                if(i == cylinderGeomIndexList[j]) {
                    planeBBox.geometry.computeBoundingBox();
                    if(planeBBox.geometry.boundingBox.distanceToPoint(new Vector3(1000, planeGroup.position.y, -3500) < 900)) {
                        resetToStart(planeCameraGroup);
                    }

                    /*
                    let cylinderSphere = new SphereGeometry(900);
                    cylinderSphere.translate(wallList[i].position.x, planeBBox.position.y, wallList[i].position.z);
                    cylinderSphere.computeBoundingSphere();
                    console.log(cylinderSphere);
                    if(planeBBox.geometry.boundingBox.intersectsSphere(cylinderSphere.boundingSphere)) {
                        //resetToStart(planeCameraGroup);
                    }
                    */
                    isCylinder = true;
                }
            }
            if(isCylinder) {
                continue;
            }

            planeBBox.geometry.computeBoundingBox();
            let wallBBox = new BoxHelper(wallList[i], 0xff0000);
            wallBBox.geometry.computeBoundingBox();
            if(planeBBox.geometry.boundingBox.intersectsBox(wallBBox.geometry.boundingBox)) {
                resetToStart(planeCameraGroup);
            }
            // scene.add(wallBBox);
        }

        // track progress
        planeBBox.update();
        ringBBox.update();
        ringList[checkpoint].material.color.setHex(0xffff00);
        planeBBox.geometry.computeBoundingBox();
        ringBBox.geometry.computeBoundingBox();
        if(planeBBox.geometry.boundingBox.intersectsBox(ringBBox.geometry.boundingBox)) {
            ringList[checkpoint].material.color.setHex(0xffffff);
            checkpoint += 1;
            checkpoint %= ringList.length;
            if(checkpoint == 0) {
                alert("YOU WIN!!! Your time was " + tick + " ticks");
            }
            ringBBox = new BoxHelper(ringList[checkpoint], 0xff0000);
            ringList[checkpoint].material.color.setHex(0xffff00);
        }

        renderer.render(scene, camera);
    })
})();