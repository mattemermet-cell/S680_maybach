import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0b);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
const controls = new OrbitControls(camera, canvas);
const q = new URLSearchParams(location.search);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
loader.load('/models/'+(q.get('m')||'s680')+'.glb', (g) => {
  const car = g.scene;
  const box = new THREE.Box3().setFromObject(car);
  const size = box.getSize(new THREE.Vector3());
  const s = 5.4 / Math.max(size.x, size.z);
  car.scale.setScalar(s);
  car.position.y -= box.min.y * s;
  scene.add(car);
  window.__car = car;
  const [x, y, z] = (q.get('cam') || '7,2.5,7').split(',').map(Number);
  camera.position.set(x, y, z);
  controls.target.set(...(q.get('tgt') || '0,0.7,0').split(',').map(Number));
  controls.update();
  window.__ready = true;
});
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
