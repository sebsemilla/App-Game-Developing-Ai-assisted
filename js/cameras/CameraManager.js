// js/cameras/CameraManager.js
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class CameraManager {
  constructor(editor) {
    this.editor = editor;
    this.cameras = new Map();
    this.activeCamera = editor.camera;
    this.cameraHelpers = [];
    this.controls = editor.controls;
  }

  createCamera(name, type = "perspective", position = { x: 0, y: 10, z: 20 }) {
    let camera;
    if (type === "perspective") {
      camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
      );
    } else {
      camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    }
    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(0, 0, 0);
    const cameraId = "cam_" + Date.now();
    camera.userData = { id: cameraId, name: name, type: type };
    this.cameras.set(cameraId, camera);
    const helper = new THREE.CameraHelper(camera);
    helper.userData = { cameraId: cameraId, isHelper: true };
    this.editor.scene.add(helper);
    this.cameraHelpers.push(helper);
    return cameraId;
  }

  switchCamera(cameraId) {
    const camera = this.cameras.get(cameraId);
    if (camera) {
      this.activeCamera = camera;
      this.controls.object = camera;
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  getCurrentCamera() {
    return this.activeCamera;
  }

  getCameras() {
    return Array.from(this.cameras.entries());
  }
}
