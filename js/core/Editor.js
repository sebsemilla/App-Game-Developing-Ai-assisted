// js/core/Editor.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Editor {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.grid = null;
        this.selectedObject = null;
        this.objects = new Map(); // Para almacenar todos los objetos creados
        this.history = [];
        this.historyIndex = -1;
    }

    init(containerId) {
        const container = document.getElementById(containerId);

        // Escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xecf0f1);

        // Cámara
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 20, 20);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        // Controles
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // Luces
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Grid inicial
        this.createGrid(50, 50, 0x888888, 0xdddddd);

        // Event listeners
        window.addEventListener('resize', () => this.onResize());

        console.log('Editor inicializado correctamente');
        return this;
    }

    createGrid(size, divisions, colorCenter, colorGrid) {
        if (this.grid) {
            this.scene.remove(this.grid);
        }
        this.grid = new THREE.GridHelper(size, divisions, colorCenter, colorGrid);
        this.scene.add(this.grid);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    addObject(mesh) {
        const id = 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        mesh.userData.id = id;
        mesh.userData.createdAt = new Date().toISOString();

        this.objects.set(id, mesh);
        this.scene.add(mesh);

        // Añadir al historial
        this.addToHistory({
            type: 'ADD_OBJECT',
            objectId: id,
            objectData: mesh.toJSON()
        });

        return id;
    }

    removeObject(object) {
        const id = object.userData.id;
        if (id) {
            this.objects.delete(id);
            this.scene.remove(object);

            this.addToHistory({
                type: 'REMOVE_OBJECT',
                objectId: id
            });
        }
    }

    addToHistory(action) {
        // Eliminar acciones futuras si estamos en medio del historial
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        this.history.push(action);
        this.historyIndex++;

        // Limitar a 20 pasos
        if (this.history.length > 20) {
            this.history.shift();
            this.historyIndex--;
        }

        console.log('Historial:', this.history.length, 'acciones');
    }

    undo() {
        if (this.historyIndex >= 0) {
            const action = this.history[this.historyIndex];
            console.log('Deshaciendo:', action);
            this.historyIndex--;
            // Aquí implementaremos la lógica de deshacer
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const action = this.history[this.historyIndex];
            console.log('Rehaciendo:', action);
            // Aquí implementaremos la lógica de rehacer
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // Método para obtener un objeto por su ID
    getObjectById(id) {
        return this.objects.get(id);
    }

    // Método para obtener todos los objetos
    getAllObjects() {
        return Array.from(this.objects.values());
    }

    // Método para limpiar la escena
    clearScene() {
        this.objects.forEach((object, id) => {
            this.scene.remove(object);
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        this.objects.clear();
        this.history = [];
        this.historyIndex = -1;
        this.selectedObject = null;
    }
}