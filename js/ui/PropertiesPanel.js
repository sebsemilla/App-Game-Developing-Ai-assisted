// js/ui/PropertiesPanel.js
import * as THREE from "three";

export class PropertiesPanel {
  constructor(editor, gridShader, gridConfig) {
    this.editor = editor;
    this.gridShader = gridShader;
    this.gridConfig = gridConfig;
    this.panelElement = document.getElementById("properties-panel");
    this.currentObject = null;
    this.listeners = [];
    this.mirrorEnabled = false;
    this.mirrorAxis = "x";
    this.sectionsState = {
      grid: false,
      objectName: false,
      transform: false,
      texture: false,
      mirror: false,
    };
  }

  renderPanel() {
    const gridContent = this.getGridHTML();
    const objectNameContent = this.getObjectNameHTML();
    const transformContent = this.getTransformHTML();
    const textureContent = this.getTextureHTML();
    const mirrorContent = this.getMirrorHTML();

    const html = `
            <h3>Propiedades</h3>
            ${this.renderSection("Grid", "grid", gridContent)}
            ${this.renderSection("Objeto", "objectName", objectNameContent)}
            ${this.renderSection("Transformar", "transform", transformContent)}
            ${this.renderSection("Textura", "texture", textureContent)}
            ${this.renderSection("Modo espejo", "mirror", mirrorContent)}
        `;

    this.panelElement.innerHTML = html;
    this.attachSectionToggles();
  }

  renderSection(title, sectionKey, contentHTML) {
    const isOpen = this.sectionsState[sectionKey];
    const displayStyle = isOpen ? "block" : "none";
    return `
            <div class="property-section ${isOpen ? "" : "collapsed"}" data-section="${sectionKey}">
                <div class="section-header">
                    <span class="section-title">${title}</span>
                    <span class="section-toggle">${isOpen ? "▼" : "►"}</span>
                </div>
                <div class="section-content" style="display: ${displayStyle};">
                    ${contentHTML}
                </div>
            </div>
        `;
  }

  attachSectionToggles() {
    const headers = this.panelElement.querySelectorAll(".section-header");
    headers.forEach((header) => {
      header.addEventListener("click", (e) => {
        const section = header.closest(".property-section");
        if (!section) return;
        const sectionKey = section.dataset.section;
        if (!sectionKey) return;
        this.sectionsState[sectionKey] = !this.sectionsState[sectionKey];
        const content = section.querySelector(".section-content");
        const toggle = header.querySelector(".section-toggle");
        if (this.sectionsState[sectionKey]) {
          section.classList.remove("collapsed");
          if (content) content.style.display = "block";
          if (toggle) toggle.textContent = "▼";
        } else {
          section.classList.add("collapsed");
          if (content) content.style.display = "none";
          if (toggle) toggle.textContent = "►";
        }
      });
    });
  }

  clearListeners() {
    this.listeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    this.listeners = [];
  }

  updateForObject(object) {
    this.clearListeners();
    this.currentObject = object;
    this.renderPanel();
    this.attachGridListeners();
    this.attachObjectNameListeners();
    this.attachTransformListeners();
    this.attachTextureListeners();
    this.attachMirrorListeners();
  }

  getGridHTML() {
    const snapChecked =
      this.gridConfig && this.gridConfig.snapEnabled ? "checked" : "";
    return `
            <div class="property-group">
                <label><input type="checkbox" id="grid-lock" ${snapChecked}> 🔒 Ajustar al Grid (snap)</label>
                <label>Tamaño total: <input type="range" id="grid-size" min="10" max="200" value="50" step="1"><span id="grid-size-value">50</span></label>
                <label>Tamaño de celda: <input type="range" id="cell-size" min="0.1" max="10" value="1" step="0.1"><span id="cell-size-value">1.0</span></label>
                <label>Grosor de línea: <input type="range" id="line-thickness" min="0.01" max="0.2" value="0.05" step="0.01"><span id="line-thickness-value">0.05</span></label>
                <label>Color de grid: <input type="color" id="grid-color" value="#888888"></label>
                <label>Color de ejes: <input type="color" id="center-color" value="#dddddd"></label>
            </div>
        `;
  }

  getObjectNameHTML() {
    if (!this.currentObject) return "<p>No hay objeto seleccionado</p>";
    const name = this.currentObject.userData?.name || "Sin nombre";
    return `
            <div class="property-group">
                <label>Nombre: <input type="text" id="object-name" value="${name}"></label>
                <label>ID: <span>${this.currentObject.userData?.id || ""}</span></label>
                <label>Tipo: <span>${this.currentObject.userData?.type || "desconocido"}</span></label>
            </div>
        `;
  }

  getTransformHTML() {
    if (!this.currentObject) return "<p>No hay objeto seleccionado</p>";
    const pos = this.currentObject.position;
    const scale = this.currentObject.scale;
    const rot = this.currentObject.rotation;
    return `
            <div class="property-group">
                <h5>Posición</h5>
                <label>X: <input type="number" id="prop-pos-x" value="${pos.x.toFixed(2)}" step="0.1"></label>
                <label>Y: <input type="number" id="prop-pos-y" value="${pos.y.toFixed(2)}" step="0.1"></label>
                <label>Z: <input type="number" id="prop-pos-z" value="${pos.z.toFixed(2)}" step="0.1"></label>
            </div>
            <div class="property-group">
                <h5>Escala</h5>
                <label>X: <input type="number" id="prop-scale-x" value="${scale.x.toFixed(2)}" step="0.1" min="0.1"></label>
                <label>Y: <input type="number" id="prop-scale-y" value="${scale.y.toFixed(2)}" step="0.1" min="0.1"></label>
                <label>Z: <input type="number" id="prop-scale-z" value="${scale.z.toFixed(2)}" step="0.1" min="0.1"></label>
            </div>
            <div class="property-group">
                <h5>Rotación (grados)</h5>
                <label>X: <input type="number" id="prop-rot-x" value="${THREE.MathUtils.radToDeg(rot.x).toFixed(1)}" step="1"></label>
                <label>Y: <input type="number" id="prop-rot-y" value="${THREE.MathUtils.radToDeg(rot.y).toFixed(1)}" step="1"></label>
                <label>Z: <input type="number" id="prop-rot-z" value="${THREE.MathUtils.radToDeg(rot.z).toFixed(1)}" step="1"></label>
            </div>
        `;
  }

  getTextureHTML() {
    if (!this.currentObject || !this.currentObject.material)
      return "<p>El objeto no tiene material</p>";
    return `
            <div class="property-group">
                <label>Archivo: <input type="file" id="texture-file" accept="image/*,.ktx2"></label>
                <button id="load-texture-btn">Cargar textura</button>
                <div id="texture-controls">
                    <label>Repetición X: <input type="range" id="tex-repeat-x" min="0.1" max="10" step="0.1" value="1"><span id="tex-repeat-x-val">1.0</span></label>
                    <label>Repetición Y: <input type="range" id="tex-repeat-y" min="0.1" max="10" step="0.1" value="1"><span id="tex-repeat-y-val">1.0</span></label>
                </div>
            </div>
        `;
  }

  getMirrorHTML() {
    return `
            <div class="property-group">
                <label><input type="checkbox" id="mirror-enabled" ${this.mirrorEnabled ? "checked" : ""}> Activar</label>
                <label>Eje: <select id="mirror-axis">
                    <option value="x" ${this.mirrorAxis === "x" ? "selected" : ""}>X</option>
                    <option value="y" ${this.mirrorAxis === "y" ? "selected" : ""}>Y</option>
                    <option value="z" ${this.mirrorAxis === "z" ? "selected" : ""}>Z</option>
                    <option value="xz" ${this.mirrorAxis === "xz" ? "selected" : ""}>X y Z</option>
                </select></label>
            </div>
        `;
  }

  attachGridListeners() {
    const lockCheckbox = document.getElementById("grid-lock");
    if (lockCheckbox && this.gridConfig) {
      this.addListener(lockCheckbox, "change", (e) => {
        this.gridConfig.snapEnabled = e.target.checked;
      });
    }
    const sizeInput = document.getElementById("grid-size");
    const sizeSpan = document.getElementById("grid-size-value");
    if (sizeInput) {
      this.addListener(sizeInput, "input", (e) => {
        const val = e.target.value;
        if (sizeSpan) sizeSpan.textContent = val;
        if (this.gridShader)
          this.gridShader.update({ gridSize: parseFloat(val) });
      });
    }
    const cellInput = document.getElementById("cell-size");
    const cellSpan = document.getElementById("cell-size-value");
    if (cellInput) {
      this.addListener(cellInput, "input", (e) => {
        const val = e.target.value;
        if (cellSpan) cellSpan.textContent = parseFloat(val).toFixed(1);
        if (this.gridShader)
          this.gridShader.update({ cellSize: parseFloat(val) });
      });
    }
    const thickInput = document.getElementById("line-thickness");
    const thickSpan = document.getElementById("line-thickness-value");
    if (thickInput) {
      this.addListener(thickInput, "input", (e) => {
        const val = e.target.value;
        if (thickSpan) thickSpan.textContent = parseFloat(val).toFixed(2);
        if (this.gridShader)
          this.gridShader.update({ lineThickness: parseFloat(val) });
      });
    }
    const gridColor = document.getElementById("grid-color");
    if (gridColor) {
      this.addListener(gridColor, "input", (e) => {
        if (this.gridShader)
          this.gridShader.update({ gridColor: e.target.value });
      });
    }
    const centerColor = document.getElementById("center-color");
    if (centerColor) {
      this.addListener(centerColor, "input", (e) => {
        if (this.gridShader)
          this.gridShader.update({ centerColor: e.target.value });
      });
    }
  }

  attachObjectNameListeners() {
    const nameInput = document.getElementById("object-name");
    if (nameInput && this.currentObject) {
      this.addListener(nameInput, "change", (e) => {
        if (!this.currentObject.userData) this.currentObject.userData = {};
        this.currentObject.userData.name = e.target.value;
      });
    }
  }

  attachTransformListeners() {
    if (!this.currentObject) return;
    const obj = this.currentObject;
    const posX = document.getElementById("prop-pos-x");
    const posY = document.getElementById("prop-pos-y");
    const posZ = document.getElementById("prop-pos-z");
    if (posX)
      this.addListener(
        posX,
        "input",
        (e) => (obj.position.x = parseFloat(e.target.value)),
      );
    if (posY)
      this.addListener(
        posY,
        "input",
        (e) => (obj.position.y = parseFloat(e.target.value)),
      );
    if (posZ)
      this.addListener(
        posZ,
        "input",
        (e) => (obj.position.z = parseFloat(e.target.value)),
      );
    const scaleX = document.getElementById("prop-scale-x");
    const scaleY = document.getElementById("prop-scale-y");
    const scaleZ = document.getElementById("prop-scale-z");
    if (scaleX)
      this.addListener(
        scaleX,
        "input",
        (e) => (obj.scale.x = parseFloat(e.target.value)),
      );
    if (scaleY)
      this.addListener(
        scaleY,
        "input",
        (e) => (obj.scale.y = parseFloat(e.target.value)),
      );
    if (scaleZ)
      this.addListener(
        scaleZ,
        "input",
        (e) => (obj.scale.z = parseFloat(e.target.value)),
      );
    const rotX = document.getElementById("prop-rot-x");
    const rotY = document.getElementById("prop-rot-y");
    const rotZ = document.getElementById("prop-rot-z");
    if (rotX)
      this.addListener(
        rotX,
        "input",
        (e) =>
          (obj.rotation.x = THREE.MathUtils.degToRad(
            parseFloat(e.target.value),
          )),
      );
    if (rotY)
      this.addListener(
        rotY,
        "input",
        (e) =>
          (obj.rotation.y = THREE.MathUtils.degToRad(
            parseFloat(e.target.value),
          )),
      );
    if (rotZ)
      this.addListener(
        rotZ,
        "input",
        (e) =>
          (obj.rotation.z = THREE.MathUtils.degToRad(
            parseFloat(e.target.value),
          )),
      );
  }

  attachTextureListeners() {
    if (!this.currentObject || !this.currentObject.material) return;
    const obj = this.currentObject;
    const fileInput = document.getElementById("texture-file");
    const loadBtn = document.getElementById("load-texture-btn");
    if (fileInput && loadBtn) {
      loadBtn.addEventListener("click", () => {
        const file = fileInput.files[0];
        if (!file) {
          alert("Selecciona un archivo");
          return;
        }
        const url = URL.createObjectURL(file);
        if (window.textureManager) {
          window.textureManager.loadTexture(url, obj.material, "map", () =>
            URL.revokeObjectURL(url),
          );
        }
      });
    }
    const repeatX = document.getElementById("tex-repeat-x");
    const repeatY = document.getElementById("tex-repeat-y");
    const valX = document.getElementById("tex-repeat-x-val");
    const valY = document.getElementById("tex-repeat-y-val");
    if (repeatX && repeatY) {
      this.addListener(repeatX, "input", (e) => {
        const val = parseFloat(e.target.value);
        if (valX) valX.textContent = val.toFixed(1);
        window.textureManager?.setRepeat(
          obj.material,
          val,
          parseFloat(repeatY.value),
          "map",
        );
      });
      this.addListener(repeatY, "input", (e) => {
        const val = parseFloat(e.target.value);
        if (valY) valY.textContent = val.toFixed(1);
        window.textureManager?.setRepeat(
          obj.material,
          parseFloat(repeatX.value),
          val,
          "map",
        );
      });
    }
  }

  attachMirrorListeners() {
    const chk = document.getElementById("mirror-enabled");
    const select = document.getElementById("mirror-axis");
    if (chk)
      this.addListener(
        chk,
        "change",
        (e) => (this.mirrorEnabled = e.target.checked),
      );
    if (select)
      this.addListener(
        select,
        "change",
        (e) => (this.mirrorAxis = e.target.value),
      );
  }

  addListener(element, type, handler) {
    element.addEventListener(type, handler);
    this.listeners.push({ element, type, handler });
  }
}
