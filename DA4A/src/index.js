import { Vector3, AxesHelper, Clock, TextureLoader, Scene, Color, WebGLRenderer, PointLight, Mesh, BoxGeometry, MeshPhysicalMaterial, PMREMGenerator, PerspectiveCamera, ACESFilmicToneMapping, sRGBEncoding, PCFSoftShadowMap, FloatType } from 'https://cdn.skypack.dev/three@0.137';
import { RGBELoader } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/loaders/RGBELoader';
import { mergeBufferGeometries } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/utils/BufferGeometryUtils';
import { OrbitControls } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/controls/OrbitControls';
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

const light = new PointLight(new Color("#FFCB8E").convertSRGBToLinear().convertSRGBToLinear(), 80, 200);
light.position.set(10, 20, 10);
light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 500;
scene.add(light);

// const controls = new FlyControls(camera, renderer.domElement);
const controls = new FlyControls(camera, renderer.domElement);
controls.autoForward = true;
controls.dragToLook = false;
controls.movementSpeed = 3;
controls.rollSpeed = 1;
controls.domElement.removeEventListener( 'mousemove', controls.mousemove );

let envmap;
let tick = 0;

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
        new BoxGeometry(20, 0.1, 20),
        new MeshPhysicalMaterial({
            envMap: envmap,
            map: null,
            envMapIntensity: 0.1,
        })
    );
    groundMesh.castShadow = true;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    let buildingGeometry = new BoxGeometry(0, 0, 0);

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

    let buildingMesh = new Mesh(
        buildingGeometry,
        new MeshPhysicalMaterial({
            envMap: envmap,
            map: null,
            envMapIntensity: 0.1,
        })
    );
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;
    scene.add(buildingMesh);

    renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();
        controls.update(delta);
        tick += 1;

        renderer.render(scene, camera);
    })
})();