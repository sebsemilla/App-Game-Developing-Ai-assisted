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
      grid: true,
      objectName: false,
      transform: false,
      texture: false,
      mirror: false,
    };

    // Renderizar el panel inmediatamente
    this.renderPanel();
  }

  // ==================== MÉTODOS PRINCIPALES ====================

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

    // Siempre adjuntar listeners de grid (no dependen de objeto seleccionado)
    this.attachGridListeners();
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

  // ==================== ACTUALIZACIÓN POR OBJETO ====================

  updateForObject(object) {
    this.clearListeners();
    this.currentObject = object;

    // Re-renderizar para actualizar valores
    this.renderPanel();

    // Re-adjuntar listeners específicos
    this.attachObjectNameListeners();
    this.attachTransformListeners();
    this.attachTextureListeners();
    this.attachMirrorListeners();
  }

  clearListeners() {
    this.listeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    this.listeners = [];
  }

  // ==================== SECCIÓN GRID ====================

  getGridHTML() {
    const snapChecked = this.gridConfig?.snapEnabled ? "checked" : "";
    return `
        <div class="property-group">
            <label><input type="checkbox" id="grid-lock" ${snapChecked}> 🔒 Ajustar al Grid (snap)</label>
            <label>Tamaño total: <input type="range" id="grid-size" min="10" max="200" value="50" step="1"><span id="grid-size-value">50</span></label>
            <label>Tamaño de celda: <input type="range" id="cell-size" min="0.1" max="10" value="1" step="0.1"><span id="cell-size-value">1.0</span></label>
            <label>Grosor de líneas: <input type="range" id="line-thickness" min="0.01" max="0.2" value="0.05" step="0.01"><span id="line-thickness-value">0.05</span></label>
            <label>Grosor de la cruz central: <input type="range" id="cross-thickness" min="0.02" max="0.5" value="0.15" step="0.01"><span id="cross-thickness-value">0.15</span></label>
            <button id="color-config-btn" class="color-config-btn">🎨 Configurar colores</button>
        </div>
    `;
  }

  attachGridListeners() {
    // Snap
    const lockCheckbox = document.getElementById("grid-lock");
    if (lockCheckbox && this.gridConfig) {
      this.addListener(lockCheckbox, "change", (e) => {
        this.gridConfig.snapEnabled = e.target.checked;
      });
    }

    // Tamaño total
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

    // Tamaño de celda
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

    // Grosor de líneas
    const lineThickInput = document.getElementById("line-thickness");
    const lineThickSpan = document.getElementById("line-thickness-value");
    if (lineThickInput) {
      this.addListener(lineThickInput, "input", (e) => {
        const val = e.target.value;
        if (lineThickSpan)
          lineThickSpan.textContent = parseFloat(val).toFixed(2);
        if (this.gridShader)
          this.gridShader.update({ lineThickness: parseFloat(val) });
      });
    }

    // Grosor de la cruz
    const crossThickInput = document.getElementById("cross-thickness");
    const crossThickSpan = document.getElementById("cross-thickness-value");

    console.log("🔍 cross-thickness input encontrado:", crossThickInput);

    if (crossThickInput) {
      this.addListener(crossThickInput, "input", (e) => {
        const val = e.target.value;
        console.log("🎯 Grosor cruz cambiado a:", val);

        if (crossThickSpan)
          crossThickSpan.textContent = parseFloat(val).toFixed(2);
        if (this.gridShader) {
          this.gridShader.update({ crossThickness: parseFloat(val) });
          console.log("Grosor cruz actualizado:", val);
        } else {
          console.warn("⚠️ gridShader no disponible");
        }
      });
    } else {
      console.error("❌ No se encontró el elemento cross-thickness en el DOM");
    }

    // Botón de colores
    const colorConfigBtn = document.getElementById("color-config-btn");
    if (colorConfigBtn) {
      this.addListener(colorConfigBtn, "click", () => this.openColorsPanel());
    }
  }

  openColorsPanel() {
    const existingPanel = document.querySelector(".colors-config-panel");
    if (existingPanel) {
      existingPanel.remove();
      return;
    }

    // Inicializar colores por defecto
    let currentGridColor = "#888888";
    let currentCrossColor = "#ffaa44";

    // Obtener colores actuales del shader si existe
    if (this.gridShader?.uniforms) {
      if (this.gridShader.uniforms.gridColor?.value) {
        currentGridColor =
          "#" + this.gridShader.uniforms.gridColor.value.getHexString();
      }
      if (this.gridShader.uniforms.crossColor?.value) {
        currentCrossColor =
          "#" + this.gridShader.uniforms.crossColor.value.getHexString();
      }
    }

    const panel = document.createElement("div");
    panel.className = "colors-config-panel";

    const btn = document.getElementById("color-config-btn");
    const rect = btn.getBoundingClientRect();
    panel.style.left = rect.left - 240 + "px";
    panel.style.top = rect.top + "px";

    panel.innerHTML = `
        <h4>🎨 Configurar colores del Grid</h4>
        <div class="color-row">
            <label>Color de líneas:</label>
            <input type="color" id="grid-color-picker" value="${currentGridColor}">
            <div class="color-preview" style="background: ${currentGridColor};"></div>
            <span class="color-value">${currentGridColor}</span>
        </div>
        <div class="color-row">
            <label>Color de la cruz:</label>
            <input type="color" id="cross-color-picker" value="${currentCrossColor}">
            <div class="color-preview" style="background: ${currentCrossColor};"></div>
            <span class="color-value">${currentCrossColor}</span>
        </div>
        <button id="apply-colors-btn" class="apply-btn">Aplicar cambios</button>
        <button id="close-colors-panel" class="close-btn">Cerrar</button>
    `;
    document.body.appendChild(panel);

    const gridPicker = panel.querySelector("#grid-color-picker");
    const crossPicker = panel.querySelector("#cross-color-picker");

    const applyBtn = panel.querySelector("#apply-colors-btn");
    applyBtn.addEventListener("click", () => {
      if (this.gridShader) {
        this.gridShader.update({ gridColor: gridPicker.value });
        this.gridShader.update({ crossColor: crossPicker.value });
      }
      panel.remove();
    });

    const closeBtn = panel.querySelector("#close-colors-panel");
    closeBtn.addEventListener("click", () => panel.remove());

    const closeOnClickOutside = (e) => {
      if (!panel.contains(e.target) && e.target !== btn) {
        panel.remove();
        document.removeEventListener("click", closeOnClickOutside);
      }
    };
    setTimeout(
      () => document.addEventListener("click", closeOnClickOutside),
      100,
    );
  }

  // ==================== SECCIÓN OBJETO ====================

  getObjectNameHTML() {
    if (!this.currentObject) {
      return '<p class="no-object-message">Selecciona un objeto para editar sus propiedades</p>';
    }
    const name = this.currentObject.userData?.name || "Sin nombre";
    const id = this.currentObject.userData?.id || "";
    const type = this.currentObject.userData?.type || "desconocido";
    return `
            <div class="property-group">
                <label>Nombre: <input type="text" id="object-name" value="${name}"></label>
                <label>ID: <span>${id}</span></label>
                <label>Tipo: <span>${type}</span></label>
            </div>
        `;
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

  // ==================== SECCIÓN TRANSFORMAR ====================

  getTransformHTML() {
    if (!this.currentObject) {
      return '<p class="no-object-message">Selecciona un objeto para editar su transformación</p>';
    }
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

  // ==================== SECCIÓN TEXTURA ====================

  getTextureHTML() {
    if (!this.currentObject) {
      return '<p class="no-object-message">Selecciona un objeto con material para editar texturas</p>';
    }
    if (!this.currentObject.material) {
      return '<p class="no-object-message">El objeto seleccionado no tiene material</p>';
    }
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

  attachTextureListeners() {
    if (!this.currentObject || !this.currentObject.material) return;
    const obj = this.currentObject;
    const fileInput = document.getElementById("texture-file");
    const loadBtn = document.getElementById("load-texture-btn");

    if (fileInput && loadBtn) {
      this.addListener(loadBtn, "click", () => {
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

  // ==================== SECCIÓN MODO ESPEJO ====================

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

  // ==================== UTILIDADES ====================

  addListener(element, type, handler) {
    element.addEventListener(type, handler);
    this.listeners.push({ element, type, handler });
  }
}
