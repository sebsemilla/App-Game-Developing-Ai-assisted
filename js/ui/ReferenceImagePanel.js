// js/ui/ReferenceImagePanel.js
import * as THREE from "three";

export class ReferenceImagePanel {
  constructor(editor) {
    this.editor = editor;
    this.panel = null;
    this.visible = false;
    this.activePlanes = []; // Registro de planos de referencia en escena
    this._init();
  }

  _init() {
    this.panel = document.createElement("div");
    this.panel.className = "floating-panel";
    this.panel.style.cssText = `
      display: none;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1e1e2e;
      border: 1px solid #444;
      border-radius: 10px;
      padding: 20px;
      z-index: 9999;
      min-width: 340px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      color: #cdd6f4;
      font-family: sans-serif;
      font-size: 13px;
    `;
    this.panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="margin:0; font-size:15px; color:#cba6f7;">Importar imagen de referencia</h3>
        <button id="refimg-close" style="background:none;border:none;color:#cdd6f4;font-size:18px;cursor:pointer;">✕</button>
      </div>

      <!-- Zona de carga -->
      <div id="refimg-dropzone" style="
        border: 2px dashed #555;
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        color: #a6adc8;
        cursor: pointer;
        margin-bottom: 16px;
        transition: border-color 0.2s;
      ">
        <div style="font-size:28px; margin-bottom:6px;">🖼️</div>
        <div>Arrastrá una imagen o hacé click para seleccionar</div>
        <div style="font-size:11px; margin-top:4px; opacity:0.6;">PNG · JPG · WebP</div>
        <input id="refimg-file-input" type="file" accept="image/png,image/jpeg,image/webp"
          style="display:none;">
      </div>

      <!-- Opciones de configuración -->
      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">

        <label style="color:#a6adc8; font-size:12px;">Plano de colocación
          <select id="refimg-axis" style="width:100%; margin-top:4px; padding:5px 8px;
            background:#313244; border:1px solid #555; border-radius:6px; color:#cdd6f4;">
            <option value="xz">Horizontal (planta — eje XZ)</option>
            <option value="xy">Vertical frontal (eje XY)</option>
            <option value="zy">Vertical lateral (eje ZY)</option>
          </select>
        </label>

        <label style="color:#a6adc8; font-size:12px;">Escala (unidades de la escena)
          <input id="refimg-scale" type="number" value="10" min="0.1" step="0.5"
            style="width:100%; margin-top:4px; padding:5px 8px; box-sizing:border-box;
            background:#313244; border:1px solid #555; border-radius:6px; color:#cdd6f4;">
        </label>

        <label style="color:#a6adc8; font-size:12px;">Opacidad
          <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
            <input id="refimg-opacity" type="range" min="0.05" max="1" step="0.05" value="0.5"
              style="flex:1;">
            <span id="refimg-opacity-val" style="min-width:30px; text-align:right;">0.5</span>
          </div>
        </label>

        <label style="color:#a6adc8; font-size:12px; display:flex; align-items:center; gap:8px;">
          <input id="refimg-locked" type="checkbox" checked>
          Bloquear (no seleccionable en escena)
        </label>
      </div>

      <button id="refimg-import-btn" disabled style="
        width: 100%;
        padding: 10px;
        background: #89b4fa;
        color: #1e1e2e;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: bold;
        cursor: not-allowed;
        opacity: 0.5;
      ">Agregar a escena</button>

      <!-- Lista de planos activos -->
      <div id="refimg-list" style="margin-top:14px;"></div>

      <div id="refimg-status" style="margin-top:8px; font-size:11px; color:#a6adc8; min-height:16px;"></div>
    `;

    document.body.appendChild(this.panel);
    this._bindEvents();
  }

  _bindEvents() {
    this.panel.querySelector("#refimg-close").addEventListener("click", () => this.hide());

    // Click en dropzone abre el file input
    const dropzone = this.panel.querySelector("#refimg-dropzone");
    const fileInput = this.panel.querySelector("#refimg-file-input");

    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "#89b4fa";
    });
    dropzone.addEventListener("dragleave", () => {
      dropzone.style.borderColor = "#555";
    });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "#555";
      const file = e.dataTransfer.files[0];
      if (file) this._handleFile(file);
    });

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) this._handleFile(file);
    });

    // Opacity slider
    const opacitySlider = this.panel.querySelector("#refimg-opacity");
    const opacityVal = this.panel.querySelector("#refimg-opacity-val");
    opacitySlider.addEventListener("input", () => {
      opacityVal.textContent = opacitySlider.value;
    });

    this.panel.querySelector("#refimg-import-btn").addEventListener("click", () => this._addToScene());
  }

  _handleFile(file) {
    const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
    const MAX_MB = 20;

    if (!ALLOWED.includes(file.type)) {
      this._setStatus("Formato no soportado. Usá PNG, JPG o WebP.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      this._setStatus(`La imagen supera los ${MAX_MB} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this._pendingDataUrl = e.target.result;
      this._pendingFileName = file.name;

      // Actualizar dropzone con preview
      const dropzone = this.panel.querySelector("#refimg-dropzone");
      dropzone.innerHTML = `
        <img src="${e.target.result}" style="max-height:80px; max-width:100%; border-radius:4px; margin-bottom:6px;">
        <div style="font-size:11px; color:#a6e3a1;">${file.name}</div>
      `;

      // Habilitar botón
      const btn = this.panel.querySelector("#refimg-import-btn");
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";

      this._setStatus("");
    };
    reader.onerror = () => this._setStatus("Error al leer el archivo.");
    reader.readAsDataURL(file);
  }

  _addToScene() {
    if (!this._pendingDataUrl) return;

    const scale = parseFloat(this.panel.querySelector("#refimg-scale").value) || 10;
    const opacity = parseFloat(this.panel.querySelector("#refimg-opacity").value);
    const axis = this.panel.querySelector("#refimg-axis").value;
    const locked = this.panel.querySelector("#refimg-locked").checked;

    // Cargar textura desde Data URL
    const texture = new THREE.TextureLoader().load(this._pendingDataUrl, (tex) => {
      // Ajustar proporción del plano a la imagen real
      const imgW = tex.image.width;
      const imgH = tex.image.height;
      const aspect = imgW / imgH;

      let geometry;
      if (axis === "xz") {
        geometry = new THREE.PlaneGeometry(scale * aspect, scale);
      } else if (axis === "xy") {
        geometry = new THREE.PlaneGeometry(scale * aspect, scale);
      } else {
        // zy
        geometry = new THREE.PlaneGeometry(scale, scale / aspect);
      }

      const material = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity,
        depthWrite: false,   // Evita artefactos de z-fighting con el grid
        side: THREE.DoubleSide,
      });

      const plane = new THREE.Mesh(geometry, material);

      // Orientar según eje
      if (axis === "xz") {
        plane.rotation.x = -Math.PI / 2; // Tumbado horizontal
      } else if (axis === "zy") {
        plane.rotation.y = Math.PI / 2;  // Lateral
      }
      // xy queda de frente por defecto

      plane.position.y = axis === "xz" ? 0.01 : 0; // Leve offset para no chupar con el grid
      plane.userData.isReference = true;
      plane.userData.referenceFile = this._pendingFileName;
      plane.userData.locked = locked;

      // Los planos bloqueados no aparecen en getAllObjects para selección
      if (!locked) {
        this.editor.addObject(plane);
      } else {
        this.editor.scene.add(plane);
      }

      // Registrar en lista interna
      const entry = { plane, name: this._pendingFileName, opacity, locked };
      this.activePlanes.push(entry);
      this._renderList();
      this._setStatus(`"${this._pendingFileName}" agregado a la escena.`);
    });
  }

  _renderList() {
    const container = this.panel.querySelector("#refimg-list");
    if (this.activePlanes.length === 0) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `<div style="font-size:11px; color:#a6adc8; margin-bottom:6px;">Imágenes en escena:</div>`;

    this.activePlanes.forEach((entry, idx) => {
      const row = document.createElement("div");
      row.style.cssText = `
        display: flex; align-items: center; justify-content: space-between;
        background: #313244; border-radius:6px; padding: 6px 8px; margin-bottom:4px;
      `;

      const nameSpan = document.createElement("span");
      nameSpan.textContent = entry.name;
      nameSpan.style.cssText = "font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:160px;";

      // Slider de opacidad inline
      const opSlider = document.createElement("input");
      opSlider.type = "range";
      opSlider.min = "0.05";
      opSlider.max = "1";
      opSlider.step = "0.05";
      opSlider.value = entry.opacity;
      opSlider.style.cssText = "width:60px; margin: 0 6px;";
      opSlider.addEventListener("input", () => {
        entry.opacity = parseFloat(opSlider.value);
        entry.plane.material.opacity = entry.opacity;
      });

      // Botón eliminar
      const delBtn = document.createElement("button");
      delBtn.textContent = "✕";
      delBtn.style.cssText = "background:none; border:none; color:#f38ba8; cursor:pointer; font-size:13px; padding:0;";
      delBtn.addEventListener("click", () => {
        this.editor.scene.remove(entry.plane);
        entry.plane.geometry.dispose();
        entry.plane.material.dispose();
        this.activePlanes.splice(idx, 1);
        this._renderList();
      });

      row.appendChild(nameSpan);
      row.appendChild(opSlider);
      row.appendChild(delBtn);
      container.appendChild(row);
    });
  }

  _setStatus(msg) {
    this.panel.querySelector("#refimg-status").textContent = msg;
  }

  show() {
    this.panel.style.display = "block";
    this.visible = true;
  }

  hide() {
    this.panel.style.display = "none";
    this.visible = false;
  }

  toggle() {
    this.visible ? this.hide() : this.show();
  }
}
