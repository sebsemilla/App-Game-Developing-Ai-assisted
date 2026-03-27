import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function initScene(containerId) {
    const container = document.getElementById(containerId);
    
    // 1. Escena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xecf0f1);

    // 2. Cámara
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 20); // Vista isométrica inicial
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 4. Controles de Cámara (Orbit)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 5. Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 6. Grid (Ayuda visual)
    const gridHelper = new THREE.GridHelper(50, 50, 0x888888, 0xdddddd);
    scene.add(gridHelper);

    // Manejo de redimensionado
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return { scene, camera, renderer, controls, gridHelper };
}