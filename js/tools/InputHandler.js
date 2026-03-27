// js/tools/InputHandler.js
import * as THREE from "three";
import { getIntersectionWithPlane, applySnap } from "../utils/MathUtils.js";

export class InputHandler {
  constructor(
    editor,
    gridConfig,
    previewManager,
    ui,
    propertiesPanel,
    transformManager,
    assetsPanel,
  ) {
    this.editor = editor;
    this.gridConfig = gridConfig;
    this.previewManager = previewManager;
    this.ui = ui;
    this.propertiesPanel = propertiesPanel;
    this.transformManager = transformManager;
    this.assetsPanel = assetsPanel;
    this.editor.renderer.domElement.style.cursor = "default";

    // Estado
    this.isDrawing = false;
    this.currentTool = "select";
    this.drawingMode = "2d";
    this.startPoint = null;
    this.onToolChange = null;
    this.copiedObject = null;
    this.isDraggingGizmo = false;

    // Modo marquee (selección múltiple)
    this.marqueeMode = false;
    this.isMarqueeDragging = false;
    this.marqueeStart = null;
    this.marqueeEnd = null;
    this.marqueeDiv = null;

    // Escuchar el estado de arrastre del gizmo
    if (this.transformManager && this.transformManager.controls) {
      this.transformManager.controls.addEventListener(
        "dragging-changed",
        (event) => {
          this.isDraggingGizmo = event.value;
        },
      );
    }

    // Bind methods
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  setMarqueeMode(active) {
    this.marqueeMode = active;
    const marqueeBtn = document.getElementById("btn-marquee");
    if (marqueeBtn) {
      if (active) marqueeBtn.classList.add("active");
      else marqueeBtn.classList.remove("active");
    }
  }

  createMarqueeDiv() {
    if (this.marqueeDiv) return;
    this.marqueeDiv = document.createElement("div");
    this.marqueeDiv.style.position = "fixed";
    this.marqueeDiv.style.border = "2px dashed #00ff00";
    this.marqueeDiv.style.backgroundColor = "rgba(0,255,0,0.1)";
    this.marqueeDiv.style.pointerEvents = "none";
    this.marqueeDiv.style.zIndex = "10000";
    document.body.appendChild(this.marqueeDiv);
  }

  updateMarqueeDiv() {
    if (!this.marqueeDiv) return;
    if (!this.isMarqueeDragging || !this.marqueeStart || !this.marqueeEnd) {
      this.marqueeDiv.style.display = "none";
      return;
    }
    const left = Math.min(this.marqueeStart.x, this.marqueeEnd.x);
    const top = Math.min(this.marqueeStart.y, this.marqueeEnd.y);
    const width = Math.abs(this.marqueeEnd.x - this.marqueeStart.x);
    const height = Math.abs(this.marqueeEnd.y - this.marqueeStart.y);
    this.marqueeDiv.style.display = "block";
    this.marqueeDiv.style.left = left + "px";
    this.marqueeDiv.style.top = top + "px";
    this.marqueeDiv.style.width = width + "px";
    this.marqueeDiv.style.height = height + "px";
  }

  getObjectsInRect(start, end) {
    const rect = {
      left: Math.min(start.x, end.x),
      right: Math.max(start.x, end.x),
      top: Math.min(start.y, end.y),
      bottom: Math.max(start.y, end.y),
    };
    const objects = this.editor.getAllObjects();
    const selected = [];
    const camera = this.editor.camera;
    const domElement = this.editor.renderer.domElement;

    objects.forEach((obj) => {
      const bbox = new THREE.Box3().setFromObject(obj);
      const corners = [
        new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
        new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z),
        new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
        new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
        new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z),
        new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z),
        new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z),
        new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
      ];
      const screenCorners = corners.map((v) => {
        const vector = v.clone().project(camera);
        const x = (vector.x * 0.5 + 0.5) * domElement.clientWidth;
        const y = -(vector.y * 0.5 - 0.5) * domElement.clientHeight;
        return { x, y };
      });
      const minX = Math.min(...screenCorners.map((p) => p.x));
      const maxX = Math.max(...screenCorners.map((p) => p.x));
      const minY = Math.min(...screenCorners.map((p) => p.y));
      const maxY = Math.max(...screenCorners.map((p) => p.y));
      if (
        maxX >= rect.left &&
        minX <= rect.right &&
        maxY >= rect.top &&
        minY <= rect.bottom
      ) {
        selected.push(obj);
      }
    });
    return selected;
  }

  startMarquee(event) {
    this.isMarqueeDragging = true;
    this.marqueeStart = { x: event.clientX, y: event.clientY };
    this.marqueeEnd = this.marqueeStart;
    this.createMarqueeDiv();
    this.updateMarqueeDiv();
    if (this.editor.controls) this.editor.controls.enabled = false;
    if (this.transformManager) this.transformManager.setEnabled(false);
  }

  cancelMarquee() {
    this.isMarqueeDragging = false;
    this.marqueeStart = null;
    this.marqueeEnd = null;
    this.updateMarqueeDiv();
    if (this.editor.controls) this.editor.controls.enabled = true;
    if (this.transformManager) this.transformManager.setEnabled(true);
  }

  finishMarquee(event) {
    if (!this.marqueeStart || !this.marqueeEnd) return;
    const objects = this.getObjectsInRect(this.marqueeStart, this.marqueeEnd);
    const shift = event.shiftKey;
    const ctrl = event.ctrlKey;
    let newSelection = [];
    if (shift) {
      newSelection = [...(this.editor.selectedObjects || []), ...objects];
    } else if (ctrl) {
      const current = this.editor.selectedObjects || [];
      newSelection = [...current];
      objects.forEach((obj) => {
        const index = newSelection.indexOf(obj);
        if (index === -1) newSelection.push(obj);
        else newSelection.splice(index, 1);
      });
    } else {
      newSelection = objects;
    }
    this.editor.clearSelection();
    newSelection.forEach((obj) => this.editor.selectObject(obj));
    this.editor.selectedObjects = newSelection;
    if (newSelection.length === 1 && this.transformManager) {
      this.transformManager.attach(newSelection[0]);
    } else if (newSelection.length > 1 && this.transformManager) {
      this.transformManager.detach();
    }
    this.cancelMarquee();
    if (this.propertiesPanel) {
      this.propertiesPanel.updateForObject(
        newSelection.length === 1 ? newSelection[0] : null,
      );
    }
  }

  isClickOnGizmo(event) {
    if (!this.transformManager || !this.transformManager.controls) return false;
    const rect = this.editor.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.editor.camera);
    const gizmoGroup = this.transformManager.controls._gizmo;
    if (!gizmoGroup) return false;
    const gizmoMeshes = [];
    gizmoGroup.children.forEach((child) => {
      if (child.isMesh) gizmoMeshes.push(child);
    });
    const intersects = raycaster.intersectObjects(gizmoMeshes);
    return intersects.length > 0;
  }

  setTool(tool, mode) {
    this.currentTool = tool;
    this.drawingMode = mode;
    this.previewManager.setTool(tool, mode);

    const canvas = this.editor.renderer.domElement;
    if (tool === "select") {
      canvas.style.cursor = "default";
    } else {
      canvas.style.cursor = "crosshair";
    }

    if (this.onToolChange) {
      this.onToolChange(tool, mode);
    }

    console.log(`🔧 Tool changed: ${tool}, mode: ${mode}`);
  }

  onKeyDown(event) {
    const target = event.target;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }
    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey;

    if (key === "s") {
      event.preventDefault();
      this.setTool("select", this.drawingMode);
      if (this.transformManager) this.transformManager.setMode("translate");
    } else if (key === "t") {
      event.preventDefault();
      if (this.editor.selectedObject && this.transformManager) {
        this.transformManager.setMode("scale");
      }
    } else if (ctrl && key === "z") {
      event.preventDefault();
      this.editor.undo();
    } else if (ctrl && key === "y") {
      event.preventDefault();
      this.editor.redo();
    } else if (key === "delete") {
      event.preventDefault();
      this.handleDelete();
    } else if (ctrl && key === "c") {
      event.preventDefault();
      this.handleCopy();
    } else if (ctrl && key === "v") {
      event.preventDefault();
      this.handlePaste();
    } else if (key === "g") {
      event.preventDefault();
      if (this.gridConfig) {
        this.gridConfig.snapEnabled = !this.gridConfig.snapEnabled;
        const lockCheckbox = document.querySelector("#grid-lock");
        if (lockCheckbox) lockCheckbox.checked = this.gridConfig.snapEnabled;
      }
    }
  }

  setupEventListeners() {
    const canvas = this.editor.renderer.domElement;
    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("mouseup", this.onMouseUp);
    canvas.addEventListener("mouseleave", this.onMouseLeave);
    canvas.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("keydown", this.onKeyDown);
  }

  removeEventListeners() {
    const canvas = this.editor.renderer.domElement;
    canvas.removeEventListener("mousedown", this.onMouseDown);
    canvas.removeEventListener("mousemove", this.onMouseMove);
    canvas.removeEventListener("mouseup", this.onMouseUp);
    canvas.removeEventListener("mouseleave", this.onMouseLeave);
    canvas.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("keydown", this.onKeyDown);
  }

  onMouseDown(event) {
    if (
      this.marqueeMode &&
      this.currentTool === "select" &&
      event.button === 0
    ) {
      const rect = this.editor.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.editor.camera);
      const intersects = raycaster.intersectObjects(
        this.editor.getAllObjects(),
      );
      if (intersects.length === 0) {
        this.startMarquee(event);
        return;
      }
    }
    if (this.currentTool === "select") {
      if (this.isDraggingGizmo) return;
      const rect = this.editor.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.editor.camera);
      const intersects = raycaster.intersectObjects(
        this.editor.getAllObjects(),
      );
      if (intersects.length > 0) {
        const object = intersects[0].object;
        this.editor.clearSelection();
        this.editor.selectObject(object);
        this.editor.selectedObjects = [object];
        this.propertiesPanel.updateForObject(object);
        if (this.transformManager) this.transformManager.attach(object);
        if (this.assetsPanel) this.assetsPanel.setCurrentObject(object);
      } else {
        this.editor.clearSelection();
        this.propertiesPanel.updateForObject(null);
        if (this.transformManager) this.transformManager.detach();
      }
      return;
    }
    if (event.button === 0) {
      this.startDrawing(event);
    }
  }

  startDrawing(event) {
    if (this.isDrawing || this.previewManager.hasPreview()) {
      this.resetDrawingState();
    }
    const point = getIntersectionWithPlane(
      event,
      this.editor.camera,
      this.editor.renderer.domElement,
    );
    if (!point) return;
    let snappedPoint;
    if (this.gridConfig.snapEnabled) {
      snappedPoint = this.gridConfig.snapToGrid(point);
    } else {
      snappedPoint = point.clone();
    }
    this.startPoint = snappedPoint.clone();
    this.isDrawing = true;
    this.editor.controls.enabled = false;
    const color = this.ui.getColor();
    if (this.drawingMode === "2d") {
      this.previewManager.create2DPreview(snappedPoint, color);
    } else {
      this.previewManager.create3DPreview(snappedPoint, color);
    }
  }

  onMouseMove(event) {
    if (this.isMarqueeDragging) {
      this.marqueeEnd = { x: event.clientX, y: event.clientY };
      this.updateMarqueeDiv();
      return;
    }
    if (!this.isDrawing || !this.startPoint) return;
    const point = getIntersectionWithPlane(
      event,
      this.editor.camera,
      this.editor.renderer.domElement,
    );
    const snappedPoint = applySnap(point, this.gridConfig);
    this.previewManager.updatePreview(snappedPoint);
  }

  onMouseUp(event) {
    if (this.isMarqueeDragging) {
      this.finishMarquee(event);
      return;
    }
    if (this.isDrawing && event.button === 0) {
      const point = getIntersectionWithPlane(
        event,
        this.editor.camera,
        this.editor.renderer.domElement,
      );
      if (point && this.startPoint) {
        const snappedPoint = this.gridConfig.snapEnabled
          ? this.gridConfig.snapToGrid(point)
          : point.clone();
        const original = this.previewManager.finishDrawing(
          snappedPoint,
          this.drawingMode,
          this.currentTool,
          this.ui.getColor(),
        );
        if (original && this.propertiesPanel.mirrorEnabled) {
          this.createMirrorCopy(original);
        }
      }
      this.resetDrawingState();
      if (this.assetsPanel) this.assetsPanel.setCurrentObject(null);
    }
  }

  onMouseLeave() {
    if (this.isMarqueeDragging) {
      this.cancelMarquee();
    }
    if (this.isDrawing || this.previewManager.hasPreview()) {
      this.resetDrawingState();
    }
  }

  onContextMenu(event) {
    event.preventDefault();
  }

  resetDrawingState() {
    this.isDrawing = false;
    this.startPoint = null;
    this.previewManager.cleanup();
    this.editor.controls.enabled = true;
  }

  handleDelete() {
    if (this.editor.selectedObject) {
      this.editor.removeObject(this.editor.selectedObject);
      this.editor.selectedObject = null;
      this.editor.selectedObjects = [];
      this.propertiesPanel.updateForObject(null);
      if (this.transformManager) this.transformManager.detach();
    }
  }

  handleCopy() {
    if (this.editor.selectedObject) {
      this.copiedObject = this.editor.selectedObject.clone();
    }
  }

  handlePaste() {
    if (!this.copiedObject) return;
    const clone = this.copiedObject.clone();
    clone.position.x += 2;
    this.editor.addObject(clone);
    this.editor.clearSelection();
    this.editor.selectObject(clone);
    this.editor.selectedObjects = [clone];
    this.propertiesPanel.updateForObject(clone);
    if (this.transformManager) this.transformManager.attach(clone);
  }

  createMirrorCopy(original) {
    const clone = original.clone();
    const axis = this.propertiesPanel.mirrorAxis;
    if (axis === "x") clone.position.x = -clone.position.x;
    else if (axis === "y") clone.position.y = -clone.position.y;
    else if (axis === "z") clone.position.z = -clone.position.z;
    else if (axis === "xz") {
      clone.position.x = -clone.position.x;
      clone.position.z = -clone.position.z;
    }
    this.editor.scene.add(clone);
    this.editor.addObject(clone);
    clone.userData.mirrored = true;
  }
}
