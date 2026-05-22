// js/tools/InputHandler.js
import { getIntersectionWithPlane, applySnap } from "../utils/MathUtils.js";
import { MarqueeSelector } from "./MarqueeSelector.js";
import { SelectionHandler } from "./SelectionHandler.js";
import { NodeEditor } from "./NodeEditor.js";
import { KeyboardShortcuts } from "./KeyboardShortcuts.js";

export class InputHandler {
  constructor(
    editor,
    gridConfig,
    previewManager,
    ui,
    propertiesPanel,
    transformManager,
    assetsPanel,
    contextMenu,
  ) {
    this.editor = editor;
    this.gridConfig = gridConfig;
    this.previewManager = previewManager;
    this.ui = ui;
    this.propertiesPanel = propertiesPanel;
    this.transformManager = transformManager;
    this.assetsPanel = assetsPanel;
    this.contextMenu = contextMenu;

    this.editor.renderer.domElement.style.cursor = "default";

    // Estado base
    this.isDrawing = false;
    this.currentTool = "select";
    this.drawingMode = "2d";
    this.startPoint = null;
    this.onToolChange = null;
    this.copiedObject = null;
    this.isDraggingGizmo = false;
    this.rotationModeActive = false;

    // Sub-módulos
    this.marquee = new MarqueeSelector(editor, transformManager);
    this.selection = new SelectionHandler(editor, transformManager, propertiesPanel, assetsPanel);
    this.nodeEditor = new NodeEditor(editor, transformManager);
    this.keyboard = new KeyboardShortcuts({
      editor,
      gridConfig,
      transformManager,
      inputHandler: this,
    });

    // Tooltip de info
    this._createInfoTooltip();

    // Escuchar gizmo de transformación
    if (this.transformManager?.controls) {
      this.transformManager.controls.addEventListener("dragging-changed", (event) => {
        this.isDraggingGizmo = event.value;
      });
    }

    // Bind de eventos
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
  }

  // ── API pública ───────────────────────────────────────────────────────────

  get selectionMode() { return this.selection.selectionMode; }
  get marqueeMode() { return this.marquee.marqueeMode; }

  setTool(tool, mode) {
    this.currentTool = tool;
    this.drawingMode = mode;
    this.previewManager.setTool(tool, mode);
    this.editor.renderer.domElement.style.cursor = tool === "select" ? "default" : "crosshair";
    if (this.onToolChange) this.onToolChange(tool, mode);
    console.log(`🔧 Tool changed: ${tool}, mode: ${mode}`);
  }

  setMarqueeMode(active) {
    this.marquee.setMode(active);
  }

  setSelectionMode(mode) {
    this.selection.setMode(mode);
    this.marquee.setMode(mode === "marquee");
    console.log(`Modo de selección cambiado a: ${mode}`);
  }

  setupEventListeners() {
    const canvas = this.editor.renderer.domElement;
    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("mouseup", this.onMouseUp);
    canvas.addEventListener("mouseleave", this.onMouseLeave);
    canvas.addEventListener("contextmenu", this.onContextMenu);
    this.keyboard.attach();
  }

  removeEventListeners() {
    const canvas = this.editor.renderer.domElement;
    canvas.removeEventListener("mousedown", this.onMouseDown);
    canvas.removeEventListener("mousemove", this.onMouseMove);
    canvas.removeEventListener("mouseup", this.onMouseUp);
    canvas.removeEventListener("mouseleave", this.onMouseLeave);
    canvas.removeEventListener("contextmenu", this.onContextMenu);
    this.keyboard.detach();
  }

  // ── Handlers de eventos del canvas ───────────────────────────────────────

  onContextMenu(event) {
    event.preventDefault();
    if (this.editor.selectedObjects?.length > 0) {
      this.contextMenu?.show?.(event, this.editor.selectedObjects);
    }
  }

  onMouseDown(event) {
    if (this.rotationModeActive) return;
    if (this.currentTool !== "select") event.preventDefault();
    if (event.button === 2) return;

    if (this.currentTool === "select") {
      // Comprobar nodo 2D
      const intersects = this.selection.getObjectsAtPoint(event);
      const nodeHit = intersects.find((i) => i.object.userData?.isNode === true);
      if (nodeHit) {
        const node = nodeHit.object;
        const parentGroup = node.userData.parentGroup;
        const shapeType = parentGroup.userData.type;
        if (shapeType === "rect2d" || shapeType === "line") {
          this.nodeEditor.selectNode(node);
          this.nodeEditor.startDrag(event);
          event.stopPropagation();
          return;
        } else {
          this.editor.clearSelection();
          this.editor.selectObject(parentGroup);
          this.editor.selectedObjects = [parentGroup];
          this.propertiesPanel.updateForObject(parentGroup);
          if (this.transformManager) this.transformManager.attach(parentGroup);
          return;
        }
      }

      // Face / Edge selection modes
      if (this.selectionMode === "face") {
        this.selection.selectFace(event);
        return;
      }
      if (this.selectionMode === "edge") {
        this.selection.selectEdge(event);
        return;
      }

      // Marquee: iniciar si no hay objeto bajo el cursor
      if (this.marquee.marqueeMode && event.button === 0) {
        const hits = this.selection.getObjectsAtPoint(event);
        if (hits.length === 0) {
          this.marquee.start(event);
          return;
        }
      }

      // Selección normal
      if (this.isDraggingGizmo) return;
      this.selection.handleClick(event);
      // Limpiar nodo si no se hizo click en nada
      if (!this.editor.selectedObjects.length) {
        this.nodeEditor.deselectNode();
      }
      return;
    }

    // Herramientas de dibujo
    if (event.button === 0) this._startDrawing(event);
  }

  onMouseMove(event) {
    if (this.marquee.isMarqueeDragging) {
      this.marquee.update(event);
      return;
    }
    if (this.nodeEditor.nodeDragging) {
      this.nodeEditor.updateDrag(event);
      return;
    }
    // Tooltip de selección múltiple
    if (!this.isDrawing && this.currentTool === "select") {
      const hits = this.selection.getObjectsAtPoint(event);
      if (hits.length > 0 && this.editor.selectedObjects?.length > 1 && this.editor.selectedObjects.includes(hits[0].object)) {
        this._showInfoTooltip(event.clientX, event.clientY);
      } else {
        this._hideInfoTooltip();
      }
    }
    if (!this.isDrawing || !this.startPoint) return;
    event.preventDefault();
    const point = getIntersectionWithPlane(event, this.editor.camera, this.editor.renderer.domElement);
    const snappedPoint = applySnap(point, this.gridConfig);
    if (snappedPoint) this.previewManager.updatePreview(snappedPoint);
  }

  onMouseUp(event) {
    if (this.rotationModeActive) return;
    if (this.nodeEditor.nodeDragging) {
      this.nodeEditor.endDrag();
      return;
    }
    if (this.marquee.isMarqueeDragging) {
      this.marquee.finish(event, this.propertiesPanel);
      return;
    }
    if (this.isDrawing && event.button === 0) {
      const point = getIntersectionWithPlane(event, this.editor.camera, this.editor.renderer.domElement);
      if (point && this.startPoint) {
        const snappedPoint = applySnap(point, this.gridConfig);
        const created = this.previewManager.finishDrawing(snappedPoint, this.drawingMode, this.currentTool, this.ui.getColor());
        if (created) {
          this.editor.clearSelection();
          this.editor.selectObject(created);
          this.editor.selectedObjects = [created];
          this.propertiesPanel.updateForObject(created);
          if (this.transformManager) this.transformManager.attach(created);
          if (this.propertiesPanel.mirrorEnabled) this._createMirrorCopy(created);
        }
        this.setTool("select", this.drawingMode);
      }
      this.editor.saveState?.();
      this._resetDrawingState();
      if (this.assetsPanel) this.assetsPanel.setCurrentObject(null);
    }
  }

  onMouseLeave() {
    if (this.rotationModeActive) {
      this.rotationModeActive = false;
      this.transformManager?.setEnabled(true);
      if (this.editor.controls) this.editor.controls.enabled = true;
    }
    if (this.marquee.isMarqueeDragging) this.marquee.cancel();
    if (this.isDrawing || this.previewManager.hasPreview()) this._resetDrawingState();
    if (this.nodeEditor.nodeDragging) this.nodeEditor.endDrag();
    if (this.nodeEditor.selectedNode) this.nodeEditor.deselectNode();
    this._hideInfoTooltip();
    this.selection.clearAll();
  }

  // ── Acciones de edición (usadas por KeyboardShortcuts) ────────────────────

  handleDelete() {
    if (this.editor.selectedObject) {
      this.editor.saveState?.();
      this.editor.removeObject(this.editor.selectedObject);
      this.editor.selectedObject = null;
      this.editor.selectedObjects = [];
      this.propertiesPanel.updateForObject(null);
      this.transformManager?.detach();
    }
  }

  handleCopy() {
    if (this.editor.selectedObject) this.copiedObject = this.editor.selectedObject.clone();
  }

  handlePaste() {
    if (!this.copiedObject) return;
    const clone = this.copiedObject.clone();
    clone.position.x += 2;
    this.editor.saveState?.();
    this.editor.addObject(clone);
    this.editor.clearSelection();
    this.editor.selectObject(clone);
    this.editor.selectedObjects = [clone];
    this.propertiesPanel.updateForObject(clone);
    this.transformManager?.attach(clone);
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  _startDrawing(event) {
    if (this.isDrawing || this.previewManager.hasPreview()) this._resetDrawingState();
    const point = getIntersectionWithPlane(event, this.editor.camera, this.editor.renderer.domElement);
    if (!point) return;
    const snappedPoint = applySnap(point, this.gridConfig);
    this.startPoint = snappedPoint.clone();
    this.isDrawing = true;
    this.editor.controls.enabled = false;
    const color = this.ui.getColor();
    if (this.drawingMode === "2d") {
      switch (this.currentTool) {
        case "rect2d": this.previewManager.create2DPreview(snappedPoint, color); break;
        case "circle2d": this.previewManager.createCirclePreview(snappedPoint, color); break;
        case "line": this.previewManager.createLinePreview(snappedPoint, color); break;
        case "freehand": this.previewManager.createFreehandPreview(snappedPoint, color); break;
        default: console.warn(`Herramienta 2D ${this.currentTool} no implementada`);
      }
    } else {
      switch (this.currentTool) {
        case "cube": this.previewManager.create3DPreview(snappedPoint, color); break;
        case "sphere": this.previewManager.createSpherePreview(snappedPoint, color); break;
        case "cylinder": this.previewManager.createCylinderPreview(snappedPoint, color); break;
        default: console.warn(`Herramienta 3D ${this.currentTool} no implementada`);
      }
    }
  }

  _resetDrawingState() {
    this.isDrawing = false;
    this.startPoint = null;
    this.previewManager.cleanup();
    this.editor.controls.enabled = true;
    this.selection.clearAll();
  }

  _createMirrorCopy(original) {
    const clone = original.clone();
    const axis = this.propertiesPanel.mirrorAxis;
    if (axis === "x") clone.position.x = -clone.position.x;
    else if (axis === "y") clone.position.y = -clone.position.y;
    else if (axis === "z") clone.position.z = -clone.position.z;
    else if (axis === "xz") {
      clone.position.x = -clone.position.x;
      clone.position.z = -clone.position.z;
    }
    this.editor.saveState?.();
    this.editor.scene.add(clone);
    this.editor.addObject(clone);
    clone.userData.mirrored = true;
  }

  _createInfoTooltip() {
    this.infoTooltip = document.createElement("div");
    this.infoTooltip.className = "info-tooltip";
    Object.assign(this.infoTooltip.style, {
      position: "fixed",
      background: "rgba(0,0,0,0.7)",
      color: "white",
      padding: "5px 10px",
      borderRadius: "8px",
      fontSize: "12px",
      pointerEvents: "none",
      zIndex: "10000",
      display: "none",
      whiteSpace: "nowrap",
    });
    this.infoTooltip.innerHTML = 'Press "S" to move with keyboard<br>Use arrow keys to move<br>Press Shift+R to rotate';
    document.body.appendChild(this.infoTooltip);
  }

  _showInfoTooltip(x, y) {
    if (!this.infoTooltip) return;
    this.infoTooltip.style.display = "block";
    this.infoTooltip.style.left = x + 15 + "px";
    this.infoTooltip.style.top = y - 20 + "px";
  }

  _hideInfoTooltip() {
    if (this.infoTooltip) this.infoTooltip.style.display = "none";
  }
}
