// js/ui/GridConfig.js
import * as THREE from "three";

export class GridConfig {
  constructor(editor) {
    this.editor = editor;
    this.panel = null;
    this.visible = false;
    this.size = 50;
    this.divisions = 50;
    this.cellSize = 1;
    this.snapEnabled = true;
    this.init();
  }

  init() {
    this.panel = document.createElement("div");
    this.panel.className = "grid-config-panel";
    this.panel.style.display = "none";
    this.panel.innerHTML = this.getHTML();
    document.body.appendChild(this.panel);
    this.attachEventListeners();
    this.positionPanel();
    window.addEventListener("resize", () => this.positionPanel());
  }

  getHTML() {
    return `
            <h4>Configuración del Grid</h4>
            <label>
                Tamaño de celda: <input type="number" id="grid-cellsize" value="${this.cellSize}" step="0.1">
            </label>
            <label>
                Tamaño: <input type="range" id="grid-size" min="10" max="100" value="${this.size}">
                <span>${this.size}</span>
            </label>
            <label>
                Divisiones: <input type="range" id="grid-divisions" min="10" max="100" value="${this.divisions}">
                <span>${this.divisions}</span>
            </label>
            <label>
                <input type="checkbox" id="grid-lock" ${this.snapEnabled ? "checked" : ""}> 🔒 Ajustar al Grid
            </label>
            <label>
                <input type="checkbox" id="grid-visible" checked> Visible
            </label>
        `;
  }

  attachEventListeners() {
    const lockCheckbox = this.panel.querySelector("#grid-lock");
    lockCheckbox.addEventListener("change", (e) => {
      this.snapEnabled = e.target.checked;
    });

    const visibleCheckbox = this.panel.querySelector("#grid-visible");
    visibleCheckbox.addEventListener("change", (e) => {
      if (this.editor && this.editor.grid) {
        this.editor.grid.visible = e.target.checked;
      }
    });

    const sizeInput = this.panel.querySelector("#grid-size");
    const sizeSpan = this.panel.querySelector("#grid-size + span");
    sizeInput.addEventListener("input", (e) => {
      this.size = parseInt(e.target.value);
      if (sizeSpan) sizeSpan.textContent = this.size;
      if (this.editor && this.editor.createGrid) {
        this.editor.createGrid(this.size, this.divisions, 0x888888, 0xdddddd);
      }
    });

    const divisionsInput = this.panel.querySelector("#grid-divisions");
    const divisionsSpan = this.panel.querySelector("#grid-divisions + span");
    divisionsInput.addEventListener("input", (e) => {
      this.divisions = parseInt(e.target.value);
      if (divisionsSpan) divisionsSpan.textContent = this.divisions;
      if (this.editor && this.editor.createGrid) {
        this.editor.createGrid(this.size, this.divisions, 0x888888, 0xdddddd);
      }
    });

    const cellSizeInput = this.panel.querySelector("#grid-cellsize");
    cellSizeInput.addEventListener("change", (e) => {
      this.cellSize = parseFloat(e.target.value);
    });
  }

  snapToGrid(point) {
    if (!this.snapEnabled) return point.clone();
    if (!(point instanceof THREE.Vector3)) return point;
    return new THREE.Vector3(
      Math.round(point.x / this.cellSize) * this.cellSize,
      point.y,
      Math.round(point.z / this.cellSize) * this.cellSize,
    );
  }

  positionPanel() {
    if (!this.panel) return;
    this.panel.style.left = "50%";
    this.panel.style.top = "50%";
    this.panel.style.transform = "translate(-50%, -50%)";
  }

  show() {
    if (!this.panel) this.init();
    this.panel.style.display = "block";
    this.visible = true;
    this.positionPanel();
  }

  hide() {
    if (this.panel) this.panel.style.display = "none";
    this.visible = false;
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }
}
