import { initScene } from './scene.js';
import { createShape } from './objects.js';
import * as THREE from 'three';

// Inicializar escena
const { scene, camera, renderer, controls } = initScene('canvas-container');

// Variables globales para el editor
let selectedObject = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let modoCreacion = false;
let isDrawing = false;
let startPoint = null;
let tempMesh = null;
let currentTool = 'select';

// Loop de animación
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// --- Lógica de Selección y Movimiento (Simplificada) ---
window.domElement.addEventListener('mousedown', (event) => {
    // Calcular posición del mouse normalizada
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children.filter(c => c.userData.type));

    if (currentTool === 'rect') {
        isDrawing = true;
        
        // Calcular punto de intersección con el suelo
        const planoSuelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const puntoInterseccion = new THREE.Vector3();
        
        if (raycaster.ray.intersectPlane(planoSuelo, puntoInterseccion)) {
            startPoint = puntoInterseccion.clone();
            
            // Crear preview temporal
            const color = document.getElementById('color-picker').value;
            const material = new THREE.MeshBasicMaterial({ 
                color: color, 
                opacity: 0.5, 
                transparent: true 
            });
            
            tempMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
            tempMesh.position.copy(startPoint);
            tempMesh.position.y = 0.5; // Mitad de la altura
            scene.add(tempMesh);
            
            console.log("Dibujando... Start:", startPoint);
        }
    }

    else {

        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData.type) { // Solo seleccionar objetos de juego
                if (selectedObject) selectedObject.userData.isSelected = false;
                selectedObject = object;
                selectedObject.userData.isSelected = true;
                console.log("Seleccionado:", selectedObject.userData.type);
            }
        } else {
            if (selectedObject) selectedObject.userData.isSelected = false;
            selectedObject = null;
        }
    }
});

function crearObjetoEnClic() {
    const color = document.getElementById('color-picker').value

    const planoSuelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const puntoInterseccion = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(planoSuelo, puntoInterseccion)) {
        const obj = createShape('rect', color, {
            x: puntoInterseccion.x,
            y: 0,
            z: puntoInterseccion.z
        });
        scene.add(obj.mesh);
    }
}

// --- Botones de Herramientas (Ejemplo básico) ---
document.getElementById('btn-rect').addEventListener('click', () => {

    modoCreacion = true;

    console.log("Ahora puedes dibujar");
    renderer.domElement.style.cursor = 'crosshair';

    event.target.style.backgroundColor = '#4CAF50';
});

document.getElementById('btn-clear').addEventListener('click', () => {
    for (let i = scene.children.length - 1; i >= 0; i--) {
        const child = scene.children[i];
        if (scene.userData && scene.userData.type) {
            scene.remove(child)

            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }
    }
    // Resetear selección
    selectedObject = null;
    console.log('Escena limpiada');
});

window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.selectedObject = selectedObject;