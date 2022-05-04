import { Shape, Vector3, BoxHelper, MeshBasicMaterial, MeshStandardMaterial, HemisphereLight, MeshLambertMaterial, Group, BufferAttribute, BufferGeometry, Vector2, ShapeGeometry, ExtrudeGeometry, AxesHelper, Clock, TextureLoader, Scene, Color, WebGLRenderer, PointLight, Mesh, BoxGeometry, CylinderGeometry, MeshPhysicalMaterial, PMREMGenerator, PerspectiveCamera, ACESFilmicToneMapping, sRGBEncoding, PCFSoftShadowMap, FloatType } from 'https://cdn.skypack.dev/three@0.137';
import { RGBELoader } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/loaders/RGBELoader';
import { mergeBufferGeometries } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/utils/BufferGeometryUtils';
import { FlyControls } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/controls/FlyControls';

const clock = new Clock();

const scene = new Scene();
scene.background = new Color("#ffeecc");

const camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
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
let movementSpeed = 50;
let turnSpeed = 1;
let verticalSpeed = 20;
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

function addNewBox(bufGeom, w, h, d, x, y, z) {
    let boxGeom = new BoxGeometry(w, h, d);
    boxGeom.translate(x, y, z);
    bufGeom = mergeBufferGeometries([bufGeom, boxGeom]);
    return bufGeom;
}

function addRing(bufGeom, x, y, z, angle = 0, size = 50) {
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

    bufGeom = mergeBufferGeometries([bufGeom, ringGeom]);

    return bufGeom;
}

(async function() {
    let pmrem = new PMREMGenerator(renderer);
    let envmapTexture = await new RGBELoader().setDataType(FloatType).loadAsync("../assets/envmap.hdr");
    envmap = pmrem.fromEquirectangular(envmapTexture).texture;

    let textures = {
        dirt: await new TextureLoader().loadAsync("../assets/dirt.png"),
    }

    const ah = new AxesHelper(100);
    scene.add(ah);

    let groundMesh = new Mesh(
        new BoxGeometry(200, 0.1, 200),
        new MeshPhysicalMaterial({
            envMap: envmap,
            color: '#333333'
        })
    );
    groundMesh.castShadow = true;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // buildings
    let buildingGeometry = new BoxGeometry(0, 0, 0);
    /*
    let bg1 = new BoxGeometry(2, 6, 2);
    bg1.translate(0, 3, 0);
    buildingGeometry = mergeBufferGeometries([buildingGeometry, bg1]);
    let bg2 = new BoxGeometry(2, 6, 2);
    bg2.translate(4.5, 3, 0);
    buildingGeometry = mergeBufferGeometries([buildingGeometry, bg2]);
    let bg3 = new BoxGeometry(2, 6, 2);
    bg3.translate(9, 3, 0);
    buildingGeometry = mergeBufferGeometries([buildingGeometry, bg3]);
    let bg4 = new BoxGeometry(7, 1, 1);
    bg4.translate(4.5, 2.5, 0);
    buildingGeometry = mergeBufferGeometries([buildingGeometry, bg4]);
    let bg5 = new BoxGeometry(2.5, 1, 1);
    bg5.translate(2.25, 5.5, 0);
    buildingGeometry = mergeBufferGeometries([buildingGeometry, bg5]);
    buildingGeometry.scale(10, 10, 10);
    */
    /*
    let bg1 = new BoxGeometry(100, 100, 100);
    bg1.translate(0, 50, 0);
    buildingGeometry = mergeBufferGeometries([buildingGeometry, bg1]);
    */
    buildingGeometry = addNewBox(buildingGeometry, 100, 100, 100, 0, 50, 0);
    for(let i = 0; i < 360; i += 20) {
        buildingGeometry = addRing(buildingGeometry, Math.cos(i * Math.PI / 180) * 200, 150, Math.sin(i * Math.PI / 180) * 200, i * Math.PI / 180);
    }

    let buildingMesh = new Mesh(
        buildingGeometry,
        new MeshPhysicalMaterial({
            envMap: envmap,
            color: '#00ff00'
        })
    );
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;
    scene.add(buildingMesh);

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
    planeCameraGroup.position.set(0, 50, 300);

    let planeBBox = new BoxHelper(planeGroup, 0xffffff);
    scene.add(planeBBox);

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

        if(tick > 300) {
            buildingMesh.material.color.setHex(0xff0000);
        }
        console.log(tick);
        
        updatePlanePosition(delta, planeCameraGroup);
        planeGroup.rotation.x = 0;
        planeGroup.rotation.z = 0;
        planeGroup.rotateX(Math.PI / 4 * (planeMoveState.up - planeMoveState.down));
        planeGroup.rotateZ(Math.PI / 4 * (planeMoveState.yawLeft - planeMoveState.yawRight));

        planeBBox.update();

        renderer.render(scene, camera);
    })
})();