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

const controls = new FlyControls(camera, renderer.domElement);
controls.autoForward = true;
controls.dragToLook = false;
controls.movementSpeed = 1;
controls.rollSpeed = 1;

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
    groundMesh.geometry.translate(10, 0, 10);
    groundMesh.castShadow = true;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();
        controls.update(delta);
        tick += 1;

        renderer.render(scene, camera);
    })
})();