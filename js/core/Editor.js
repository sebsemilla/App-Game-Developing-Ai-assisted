// js/core/Editor.js
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class Editor {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.grid = null;
    this.selectedObject = null;
    this.selectedObjects = [];
    this.objects = new Map();
    this.history = [];
    this.historyIndex = -1;
  }

  init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error("Container no encontrado:", containerId);
      return;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xecf0f1);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 20, 20);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    this.createGrid(50, 50, 0x888888, 0xdddddd);

    window.addEventListener("resize", () => this.onResize());

    console.log("Editor inicializado correctamente");
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
    const id =
      "obj_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    mesh.userData.id = id;
    mesh.userData.createdAt = new Date().toISOString();
    this.objects.set(id, mesh);
    this.scene.add(mesh);
    this.addToHistory({
      type: "ADD_OBJECT",
      objectId: id,
      objectData: mesh.toJSON(),
    });
    return id;
  }

  removeObject(object) {
    const id = object.userData.id;
    if (id) {
      this.objects.delete(id);
      this.scene.remove(object);
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material.dispose();
        }
      }
      this.addToHistory({
        type: "REMOVE_OBJECT",
        objectId: id,
      });
    }
  }

  clearSelection() {
    this.selectedObjects.forEach((obj) => {
      if (obj.material && obj.material.emissive) {
        obj.material.emissive.setHex(0x000000);
      }
    });
    this.selectedObjects = [];
    this.selectedObject = null;
  }

  selectObject(obj) {
    if (obj.material && obj.material.emissive) {
      obj.material.emissive.setHex(0x333333);
    }
    this.selectedObject = obj;
    if (!this.selectedObjects.includes(obj)) {
      this.selectedObjects.push(obj);
    }
  }

  addToHistory(action) {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(action);
    this.historyIndex++;
    if (this.history.length > 20) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  undo() {
    if (this.historyIndex >= 0) {
      const action = this.history[this.historyIndex];
      console.log("Deshaciendo:", action);
      this.historyIndex--;
      // Aquí implementar lógica de deshacer
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const action = this.history[this.historyIndex];
      console.log("Rehaciendo:", action);
      // Aquí implementar lógica de rehacer
    }
  }

  getObjectById(id) {
    return this.objects.get(id);
  }

  getAllObjects() {
    return Array.from(this.objects.values());
  }

  clearScene() {
    this.objects.forEach((object, id) => {
      this.scene.remove(object);
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    this.objects.clear();
    this.history = [];
    this.historyIndex = -1;
    this.selectedObject = null;
    this.selectedObjects = [];
  }
}
