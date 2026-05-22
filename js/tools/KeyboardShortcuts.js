// js/tools/KeyboardShortcuts.js

export class KeyboardShortcuts {
  constructor({ editor, gridConfig, transformManager, inputHandler }) {
    this.editor = editor;
    this.gridConfig = gridConfig;
    this.transformManager = transformManager;
    this.inputHandler = inputHandler; // reference to coordinator for setTool/setMarqueeMode

    this._onKeyDown = this._onKeyDown.bind(this);
  }

  attach() {
    window.addEventListener("keydown", this._onKeyDown);
  }

  detach() {
    window.removeEventListener("keydown", this._onKeyDown);
  }

  _onKeyDown(event) {
    const target = event.target;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey;

    // Rotation mode (Shift+R)
    if (event.shiftKey && key === "r") {
      event.preventDefault();
      this.inputHandler.rotationModeActive = true;
      this.transformManager?.setEnabled(false);
      if (this.editor.controls) this.editor.controls.enabled = false;
      return;
    }

    // Shape shortcuts with Shift
    if (event.shiftKey) {
      const shapeMap = {
        b: ["cube", "3d"],
        n: ["sphere", "3d"],
        m: ["cylinder", "3d"],
        j: ["rect2d", "2d"],
        k: ["circle2d", "2d"],
        l: ["line", "2d"],
        p: ["freehand", "2d"],
      };
      const shape = shapeMap[key];
      if (shape) {
        event.preventDefault();
        this.inputHandler.setTool(shape[0], shape[1]);
        this.inputHandler.setMarqueeMode(false);
        return;
      }
    }

    // Multi-selection keyboard movement
    if (this.editor.selectedObjects?.length > 1) {
      const step = 0.2;
      const moveMap = {
        arrowup: (obj) => (obj.position.z -= step),
        arrowdown: (obj) => (obj.position.z += step),
        arrowleft: (obj) => (obj.position.x -= step),
        arrowright: (obj) => (obj.position.x += step),
        g: (obj) => (obj.rotation.y += Math.PI / 12),
      };
      if (moveMap[key]) {
        event.preventDefault();
        this.editor.selectedObjects.forEach(moveMap[key]);
        this.editor.saveState?.();
        return;
      }
    }

    // Single-key shortcuts
    if (ctrl && key === "z") {
      event.preventDefault();
      this.editor.undo();
    } else if (ctrl && key === "y") {
      event.preventDefault();
      this.editor.redo();
    } else if (ctrl && key === "c") {
      event.preventDefault();
      this.inputHandler.handleCopy();
    } else if (ctrl && key === "v") {
      event.preventDefault();
      this.inputHandler.handlePaste();
    } else if (key === "delete") {
      event.preventDefault();
      this.inputHandler.handleDelete();
    } else if (key === "s") {
      event.preventDefault();
      this.inputHandler.setTool("select", this.inputHandler.drawingMode);
      this.transformManager?.setMode("translate");
    } else if (key === "t") {
      event.preventDefault();
      if (this.editor.selectedObject && this.transformManager) {
        this.transformManager.setMode("scale");
      }
    } else if (key === "g" && !ctrl) {
      event.preventDefault();
      if (this.gridConfig) {
        this.gridConfig.snapEnabled = !this.gridConfig.snapEnabled;
        const lockCheckbox = document.querySelector("#grid-lock");
        if (lockCheckbox) lockCheckbox.checked = this.gridConfig.snapEnabled;
      }
    } else if (key === "escape" && this.inputHandler.rotationModeActive) {
      event.preventDefault();
      this.inputHandler.rotationModeActive = false;
      this.transformManager?.setEnabled(true);
      if (this.editor.controls) this.editor.controls.enabled = true;
    }
  }
}
