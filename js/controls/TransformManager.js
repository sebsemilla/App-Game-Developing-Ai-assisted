// js/controls/TransformManager.js
import { TransformControls } from "three/addons/controls/TransformControls.js";
import * as THREE from "three";

export class TransformManager {
  constructor(editor, camera, domElement, gridConfig) {
    this.editor = editor;
    this.camera = camera;
    this.domElement = domElement;
    this.gridConfig = gridConfig;
    this.controls = null;
    this.currentObject = null;
    this.isDragging = false;
    this.altPressed = false;
    this.startScale = new THREE.Vector3(1, 1, 1);
    this.startPosition = new THREE.Vector3();

    this.init();
    this.setupKeyboardListeners();
  }

  init() {
    this.controls = new TransformControls(this.camera, this.domElement);
    this.editor.scene.add(this.controls);
    this.controls.setMode("translate");

    this.controls.addEventListener("dragging-changed", (event) => {
      this.isDragging = event.value;
      this.editor.controls.enabled = !event.value;
      if (event.value && this.currentObject) {
        this.startScale.copy(this.currentObject.scale);
        this.startPosition.copy(this.currentObject.position);
      }
    });

    this.controls.addEventListener("objectChange", () => {
      // Snap para traslación
      if (
        this.isDragging &&
        this.controls.getMode() === "translate" &&
        this.gridConfig &&
        this.gridConfig.snapEnabled &&
        this.currentObject
      ) {
        const snappedPos = this.gridConfig.snapToGrid(
          this.currentObject.position,
        );
        if (!snappedPos.equals(this.currentObject.position)) {
          this.currentObject.position.copy(snappedPos);
        }
      }
      // Escala con Alt
      if (
        this.isDragging &&
        this.altPressed &&
        this.controls.getMode() === "scale" &&
        this.currentObject
      ) {
        const deltaX = this.currentObject.scale.x - this.startScale.x;
        const deltaY = this.currentObject.scale.y - this.startScale.y;
        const deltaZ = this.currentObject.scale.z - this.startScale.z;
        this.currentObject.position.x = this.startPosition.x + deltaX / 2;
        this.currentObject.position.y = this.startPosition.y + deltaY / 2;
        this.currentObject.position.z = this.startPosition.z + deltaZ / 2;
        this.startScale.copy(this.currentObject.scale);
        this.startPosition.copy(this.currentObject.position);
      }
    });
  }

  setupKeyboardListeners() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Alt") this.altPressed = true;
    });
    window.addEventListener("keyup", (e) => {
      if (e.key === "Alt") this.altPressed = false;
    });
  }

  attach(object) {
    if (!object) {
      this.detach();
      return;
    }
    this.currentObject = object;
    this.controls.attach(object);
    this.controls.visible = true;
  }

  detach() {
    this.currentObject = null;
    this.controls.detach();
    this.controls.visible = false;
  }

  setMode(mode) {
    if (this.controls) this.controls.setMode(mode);
  }
  setEnabled(enabled) {
    if (this.controls) this.controls.enabled = enabled;
  }
}
