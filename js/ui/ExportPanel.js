// js/ui/ExportPanel.js
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import * as THREE from "three";

export class ExportPanel {
  constructor(editor) {
    this.editor = editor;
    this.panel = null;
    this.visible = false;
    this._init();
  }

  _init() {
    this.panel = document.createElement("div");
    this.panel.className = "export-panel floating-panel";
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
      min-width: 320px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      color: #cdd6f4;
      font-family: sans-serif;
    `;
    this.panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="margin:0; font-size:15px; color:#cba6f7;">Exportar escena</h3>
        <button id="export-close-btn" style="background:none; border:none; color:#cdd6f4; font-size:18px; cursor:pointer;">✕</button>
      </div>

      <div style="margin-bottom:16px;">
        <label style="font-size:12px; color:#a6adc8; display:block; margin-bottom:6px;">Qué exportar</label>
        <select id="export-scope" style="width:100%; padding:6px 8px; background:#313244; border:1px solid #555; border-radius:6px; color:#cdd6f4; font-size:13px;">
          <option value="all">Toda la escena</option>
          <option value="selected">Solo objetos seleccionados</option>
        </select>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px;">
        <button id="export-glb-btn" class="export-btn" style="
          padding: 10px 14px;
          background: #89b4fa;
          color: #1e1e2e;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: bold;
          cursor: pointer;
          text-align: left;
        ">
          GLB — Modelo 3D binario
          <span style="display:block; font-size:11px; font-weight:normal; margin-top:2px; opacity:0.7;">Compatible con Unity, Godot, Blender</span>
        </button>

        <button id="export-gltf-btn" class="export-btn" style="
          padding: 10px 14px;
          background: #a6e3a1;
          color: #1e1e2e;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: bold;
          cursor: pointer;
          text-align: left;
        ">
          GLTF — Modelo 3D texto (JSON)
          <span style="display:block; font-size:11px; font-weight:normal; margin-top:2px; opacity:0.7;">Legible, editable, para inspección</span>
        </button>

        <button id="export-json-btn" class="export-btn" style="
          padding: 10px 14px;
          background: #fab387;
          color: #1e1e2e;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: bold;
          cursor: pointer;
          text-align: left;
        ">
          JSON — Escena de Gamefy
          <span style="display:block; font-size:11px; font-weight:normal; margin-top:2px; opacity:0.7;">Para reabrir en Gamefy (guardar sesión)</span>
        </button>
      </div>

      <div id="export-status" style="
        margin-top:14px;
        font-size:12px;
        color:#a6adc8;
        min-height:18px;
        text-align:center;
      "></div>
    `;

    document.body.appendChild(this.panel);
    this._bindEvents();
  }

  _bindEvents() {
    this.panel.querySelector("#export-close-btn").addEventListener("click", () => this.hide());
    this.panel.querySelector("#export-glb-btn").addEventListener("click", () => this._export("glb"));
    this.panel.querySelector("#export-gltf-btn").addEventListener("click", () => this._export("gltf"));
    this.panel.querySelector("#export-json-btn").addEventListener("click", () => this._exportJSON());
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  _getScope() {
    return this.panel.querySelector("#export-scope").value;
  }

  _setStatus(msg) {
    this.panel.querySelector("#export-status").textContent = msg;
  }

  _setButtonsDisabled(disabled) {
    this.panel.querySelectorAll(".export-btn").forEach((btn) => {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? "0.5" : "1";
    });
  }

  // Construye un Group de Three.js con los objetos a exportar
  _buildExportGroup() {
    const scope = this._getScope();
    const objects =
      scope === "selected" && this.editor.selectedObjects?.length
        ? this.editor.selectedObjects
        : this.editor.getAllObjects();

    if (objects.length === 0) return null;

    const group = new THREE.Group();
    objects.forEach((obj) => group.add(obj.clone()));
    return group;
  }

  // ── Export GLB / GLTF ────────────────────────────────────────────────────

  _export(format) {
    const group = this._buildExportGroup();
    if (!group) {
      this._setStatus("No hay objetos para exportar.");
      return;
    }

    this._setStatus("Exportando...");
    this._setButtonsDisabled(true);

    const exporter = new GLTFExporter();
    const options = { binary: format === "glb" };

    exporter.parse(
      group,
      (result) => {
        const ext = format === "glb" ? "glb" : "gltf";
        const mimeType = format === "glb" ? "model/gltf-binary" : "application/json";
        const filename = `gamefy_export_${this._timestamp()}.${ext}`;

        if (result instanceof ArrayBuffer) {
          this._download(result, filename, mimeType);
        } else {
          // GLTF devuelve un objeto JSON
          const json = JSON.stringify(result, null, 2);
          this._download(json, filename, "application/json");
        }

        this._setStatus(`Descargado: ${filename}`);
        this._setButtonsDisabled(false);
      },
      (error) => {
        console.error("Error exportando:", error);
        this._setStatus("Error al exportar. Ver consola.");
        this._setButtonsDisabled(false);
      },
      options,
    );
  }

  // ── Export JSON de escena Gamefy ─────────────────────────────────────────

  _exportJSON() {
    const scope = this._getScope();
    const objects =
      scope === "selected" && this.editor.selectedObjects?.length
        ? this.editor.selectedObjects
        : this.editor.getAllObjects();

    if (objects.length === 0) {
      this._setStatus("No hay objetos para exportar.");
      return;
    }

    const sceneData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      app: "Gamefy",
      objects: objects.map((obj) => ({
        id: obj.userData.id || null,
        name: obj.name || null,
        type: obj.userData.type || "unknown",
        position: obj.position.toArray(),
        rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
        scale: obj.scale.toArray(),
        color: obj.material?.color?.getHexString() ?? null,
        userData: obj.userData,
      })),
    };

    const json = JSON.stringify(sceneData, null, 2);
    const filename = `gamefy_scene_${this._timestamp()}.json`;
    this._download(json, filename, "application/json");
    this._setStatus(`Descargado: ${filename}`);
  }

  // ── Descarga de archivo en el navegador ─────────────────────────────────

  _download(data, filename, mimeType) {
    const blob =
      data instanceof ArrayBuffer
        ? new Blob([data], { type: mimeType })
        : new Blob([data], { type: mimeType });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  _timestamp() {
    return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  }

  // ── Ciclo de vida ────────────────────────────────────────────────────────

  show() {
    this._setStatus("");
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
