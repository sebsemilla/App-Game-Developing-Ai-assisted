// js/ui/VectorImportPanel.js
// Importación de vectores SVG y DXF como referencia o geometría en escena.
//
// SVG  → usa SVGLoader (incluido en Three.js addons, sin dependencias extra)
// DXF  → usa dxf-parser (debe instalarse: npm install dxf-parser en la raíz,
//         o cargarse desde CDN). Si no está disponible, el panel lo indica.

import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

export class VectorImportPanel {
  constructor(editor) {
    this.editor = editor;
    this.panel = null;
    this.visible = false;
    this.activeFormat = "svg"; // 'svg' | 'dxf'
    this._pendingContent = null;
    this._pendingFileName = null;
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
      min-width: 380px;
      max-width: 480px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      color: #cdd6f4;
      font-family: sans-serif;
      font-size: 13px;
    `;

    this.panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="margin:0; font-size:15px; color:#cba6f7;">Importar vector</h3>
        <button id="vec-close" style="background:none;border:none;color:#cdd6f4;font-size:18px;cursor:pointer;">✕</button>
      </div>

      <!-- Selector de formato -->
      <div style="display:flex; gap:8px; margin-bottom:16px;">
        <button id="vec-tab-svg" class="vec-tab active-tab" style="
          flex:1; padding:8px; border-radius:6px; border:1px solid #89b4fa;
          background:#89b4fa22; color:#89b4fa; cursor:pointer; font-size:12px; font-weight:bold;">
          SVG
        </button>
        <button id="vec-tab-dxf" class="vec-tab" style="
          flex:1; padding:8px; border-radius:6px; border:1px solid #555;
          background:transparent; color:#a6adc8; cursor:pointer; font-size:12px;">
          DXF (AutoCAD)
        </button>
      </div>

      <!-- Info del formato activo -->
      <div id="vec-format-info" style="
        background:#313244; border-radius:6px; padding:10px 12px;
        font-size:11px; color:#a6adc8; margin-bottom:14px; line-height:1.5;
      "></div>

      <!-- Dropzone -->
      <div id="vec-dropzone" style="
        border: 2px dashed #555;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        color: #a6adc8;
        cursor: pointer;
        margin-bottom: 14px;
      ">
        <div style="font-size:24px; margin-bottom:6px;">📄</div>
        <div id="vec-dropzone-label">Arrastrá un archivo SVG o hacé click</div>
        <input id="vec-file-input" type="file" style="display:none;">
      </div>

      <!-- Opciones SVG -->
      <div id="vec-options-svg" style="display:flex; flex-direction:column; gap:10px; margin-bottom:14px;">

        <label style="color:#a6adc8; font-size:12px;">Modo de importación
          <select id="svg-mode" style="width:100%; margin-top:4px; padding:5px 8px;
            background:#313244; border:1px solid #555; border-radius:6px; color:#cdd6f4;">
            <option value="reference">Referencia plana (imagen en escena)</option>
            <option value="geometry">Geometría extruída (objeto 3D)</option>
            <option value="lines">Solo líneas (wireframe de paths)</option>
          </select>
        </label>

        <div id="svg-extrude-options" style="display:none; flex-direction:column; gap:8px;">
          <label style="color:#a6adc8; font-size:12px;">Profundidad de extrusión
            <input id="svg-extrude-depth" type="number" value="0.5" min="0.01" step="0.1"
              style="width:100%; margin-top:4px; padding:5px 8px; box-sizing:border-box;
              background:#313244; border:1px solid #555; border-radius:6px; color:#cdd6f4;">
          </label>
        </div>

        <label style="color:#a6adc8; font-size:12px;">Escala
          <input id="svg-scale" type="number" value="0.01" min="0.001" step="0.001"
            style="width:100%; margin-top:4px; padding:5px 8px; box-sizing:border-box;
            background:#313244; border:1px solid #555; border-radius:6px; color:#cdd6f4;">
          <span style="font-size:10px; opacity:0.6;">SVG usa píxeles — 0.01 ≈ 1 unidad por cada 100px</span>
        </label>

        <label style="color:#a6adc8; font-size:12px;">Color de geometría
          <input id="svg-color" type="color" value="#89b4fa"
            style="width:100%; margin-top:4px; height:32px; border-radius:6px; border:1px solid #555; background:#313244; cursor:pointer;">
        </label>
      </div>

      <!-- Opciones DXF -->
      <div id="vec-options-dxf" style="display:none; flex-direction:column; gap:10px; margin-bottom:14px;">

        <div style="background:#45475a; border-radius:6px; padding:10px; font-size:11px; color:#f9e2af;">
          ⚠️ El soporte DXF requiere la librería <code>dxf-parser</code>.<br>
          Si no está cargada, los archivos DXF no se podrán procesar.
        </div>

        <label style="color:#a6adc8; font-size:12px;">Escala (mm → unidades escena)
          <select id="dxf-unit" style="width:100%; margin-top:4px; padding:5px 8px;
            background:#313244; border:1px solid #555; border-radius:6px; color:#cdd6f4;">
            <option value="0.001">Milímetros → metros (÷1000)</option>
            <option value="0.01">Centímetros → metros (÷100)</option>
            <option value="1" selected>Sin conversión (1:1)</option>
          </select>
        </label>

        <label style="color:#a6adc8; font-size:12px;">Capas a importar
          <input id="dxf-layers" type="text" placeholder="Todas (dejar vacío) o: 0, WALLS, DOORS"
            style="width:100%; margin-top:4px; padding:5px 8px; box-sizing:border-box;
            background:#313244; border:1px solid #555; border-radius:6px; color:#cdd6f4;">
        </label>

        <label style="color:#a6adc8; font-size:12px; display:flex; align-items:center; gap:8px;">
          <input id="dxf-extrude" type="checkbox">
          Extruír líneas cerradas como muros
        </label>

        <div id="dxf-extrude-opts" style="display:none;">
          <label style="color:#a6adc8; font-size:12px;">Altura de extrusión
            <input id="dxf-wall-height" type="number" value="3" min="0.1" step="0.1"
              style="width:100%; margin-top:4px; padding:5px 8px; box-sizing:border-box;
              background:#313244; border:1px solid #555; border-radius:6px; color:#cdd6f4;">
          </label>
        </div>
      </div>

      <button id="vec-import-btn" disabled style="
        width: 100%;
        padding: 10px;
        background: #cba6f7;
        color: #1e1e2e;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: bold;
        cursor: not-allowed;
        opacity: 0.5;
      ">Importar</button>

      <div id="vec-status" style="margin-top:10px; font-size:11px; color:#a6adc8; min-height:16px; text-align:center;"></div>
    `;

    document.body.appendChild(this.panel);
    this._bindEvents();
    this._updateFormatInfo("svg");
  }

  _bindEvents() {
    this.panel.querySelector("#vec-close").addEventListener("click", () => this.hide());

    // Tabs de formato
    this.panel.querySelector("#vec-tab-svg").addEventListener("click", () => this._setFormat("svg"));
    this.panel.querySelector("#vec-tab-dxf").addEventListener("click", () => this._setFormat("dxf"));

    // Dropzone
    const dropzone = this.panel.querySelector("#vec-dropzone");
    const fileInput = this.panel.querySelector("#vec-file-input");
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "#cba6f7";
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
      if (e.target.files[0]) this._handleFile(e.target.files[0]);
    });

    // Modo SVG — mostrar/ocultar extrude options
    this.panel.querySelector("#svg-mode").addEventListener("change", (e) => {
      const extOpts = this.panel.querySelector("#svg-extrude-options");
      extOpts.style.display = e.target.value === "geometry" ? "flex" : "none";
    });

    // DXF extrude toggle
    this.panel.querySelector("#dxf-extrude").addEventListener("change", (e) => {
      this.panel.querySelector("#dxf-extrude-opts").style.display =
        e.target.checked ? "block" : "none";
    });

    this.panel.querySelector("#vec-import-btn").addEventListener("click", () => this._import());
  }

  _setFormat(format) {
    this.activeFormat = format;
    this._pendingContent = null;
    this._pendingFileName = null;
    this._setImportReady(false);
    this._resetDropzone();

    // Tabs
    const svgTab = this.panel.querySelector("#vec-tab-svg");
    const dxfTab = this.panel.querySelector("#vec-tab-dxf");
    if (format === "svg") {
      svgTab.style.cssText += "border-color:#89b4fa; background:#89b4fa22; color:#89b4fa; font-weight:bold;";
      dxfTab.style.cssText += "border-color:#555; background:transparent; color:#a6adc8; font-weight:normal;";
    } else {
      dxfTab.style.cssText += "border-color:#cba6f7; background:#cba6f722; color:#cba6f7; font-weight:bold;";
      svgTab.style.cssText += "border-color:#555; background:transparent; color:#a6adc8; font-weight:normal;";
    }

    // Opciones
    this.panel.querySelector("#vec-options-svg").style.display = format === "svg" ? "flex" : "none";
    this.panel.querySelector("#vec-options-dxf").style.display = format === "dxf" ? "flex" : "none";

    // Filtro del file input
    this.panel.querySelector("#vec-file-input").accept =
      format === "svg" ? ".svg,image/svg+xml" : ".dxf";

    this._updateFormatInfo(format);
  }

  _updateFormatInfo(format) {
    const info = this.panel.querySelector("#vec-format-info");
    if (format === "svg") {
      info.innerHTML = `
        <strong style="color:#cdd6f4;">SVG</strong> — Formato vectorial estándar.<br>
        Podés importarlo como referencia plana, extruírlo en 3D, o como wireframe de paths.
        Compatible con Illustrator, Inkscape, Figma.
      `;
    } else {
      info.innerHTML = `
        <strong style="color:#cdd6f4;">DXF</strong> — Formato estándar de AutoCAD / CAD.<br>
        Ideal para planos de arquitectura. Permite importar capas específicas
        y extruír contornos cerrados como muros. Requiere <code>dxf-parser</code>.
      `;
    }
  }

  _resetDropzone() {
    const dz = this.panel.querySelector("#vec-dropzone");
    dz.innerHTML = `
      <div style="font-size:24px; margin-bottom:6px;">📄</div>
      <div id="vec-dropzone-label">Arrastrá un archivo o hacé click</div>
      <input id="vec-file-input" type="file" style="display:none;"
        accept="${this.activeFormat === "svg" ? ".svg,image/svg+xml" : ".dxf"}">
    `;
    // Re-bind el nuevo input
    const newInput = dz.querySelector("#vec-file-input");
    dz.addEventListener("click", () => newInput.click());
    newInput.addEventListener("change", (e) => {
      if (e.target.files[0]) this._handleFile(e.target.files[0]);
    });
  }

  _handleFile(file) {
    const isSvg = file.name.toLowerCase().endsWith(".svg") || file.type === "image/svg+xml";
    const isDxf = file.name.toLowerCase().endsWith(".dxf");

    if (this.activeFormat === "svg" && !isSvg) {
      this._setStatus("Seleccioná un archivo .svg");
      return;
    }
    if (this.activeFormat === "dxf" && !isDxf) {
      this._setStatus("Seleccioná un archivo .dxf");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this._pendingContent = e.target.result;
      this._pendingFileName = file.name;

      const dz = this.panel.querySelector("#vec-dropzone");
      const label = dz.querySelector("#vec-dropzone-label");
      if (label) {
        label.textContent = `✓ ${file.name}`;
        label.style.color = "#a6e3a1";
      }
      this._setImportReady(true);
      this._setStatus("");
    };
    reader.onerror = () => this._setStatus("Error al leer el archivo.");
    reader.readAsText(file);
  }

  _setImportReady(ready) {
    const btn = this.panel.querySelector("#vec-import-btn");
    btn.disabled = !ready;
    btn.style.opacity = ready ? "1" : "0.5";
    btn.style.cursor = ready ? "pointer" : "not-allowed";
  }

  // ── Import SVG ────────────────────────────────────────────────────────────

  _import() {
    if (!this._pendingContent) return;
    if (this.activeFormat === "svg") this._importSVG();
    else this._importDXF();
  }

  _importSVG() {
    const mode = this.panel.querySelector("#svg-mode").value;
    const scale = parseFloat(this.panel.querySelector("#svg-scale").value) || 0.01;
    const color = this.panel.querySelector("#svg-color").value;
    const extrudeDepth = parseFloat(this.panel.querySelector("#svg-extrude-depth").value) || 0.5;

    const loader = new SVGLoader();
    const svgData = loader.parse(this._pendingContent);
    const paths = svgData.paths;

    if (paths.length === 0) {
      this._setStatus("El SVG no contiene paths procesables.");
      return;
    }

    const group = new THREE.Group();
    group.name = this._pendingFileName;
    group.userData.type = "svg_import";
    group.userData.svgMode = mode;

    paths.forEach((path) => {
      const pathColor = path.color ?? new THREE.Color(color);

      if (mode === "reference" || mode === "lines") {
        // Modo wireframe: líneas de los paths
        path.subPaths.forEach((subPath) => {
          const points = subPath.getPoints();
          const geom = new THREE.BufferGeometry().setFromPoints(points);
          const mat = new THREE.LineBasicMaterial({ color: pathColor });
          group.add(new THREE.Line(geom, mat));
        });

      } else if (mode === "geometry") {
        // Modo extrusión: shapes 3D
        const shapes = SVGLoader.createShapes(path);
        shapes.forEach((shape) => {
          const geom = new THREE.ExtrudeGeometry(shape, {
            depth: extrudeDepth / scale, // Compensar la escala que aplicamos al grupo
            bevelEnabled: false,
          });
          const mat = new THREE.MeshStandardMaterial({
            color: pathColor,
            side: THREE.DoubleSide,
          });
          group.add(new THREE.Mesh(geom, mat));
        });
      }
    });

    // SVG usa coordenadas Y invertidas respecto a Three.js
    group.scale.set(scale, -scale, scale);
    group.position.y = mode === "geometry" ? extrudeDepth / 2 : 0.02;

    // Centrar el grupo en el origen
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.x -= center.x;
    group.position.z -= center.z;

    this.editor.addObject(group);
    this._setStatus(`SVG importado: ${paths.length} paths.`);
  }

  // ── Import DXF ────────────────────────────────────────────────────────────

  _importDXF() {
    // dxf-parser debe estar disponible globalmente como window.DxfParser
    if (typeof window.DxfParser === "undefined") {
      this._setStatus("dxf-parser no está cargado. Revisá la documentación.");
      console.warn(
        "VectorImportPanel: para soporte DXF, incluir dxf-parser:\n" +
        '<script src="https://cdn.jsdelivr.net/npm/dxf-parser/dist/dxf-parser.min.js"></script>'
      );
      return;
    }

    const unitScale = parseFloat(this.panel.querySelector("#dxf-unit").value);
    const layerFilter = this.panel.querySelector("#dxf-layers").value
      .split(",").map((s) => s.trim()).filter(Boolean);
    const extrudeWalls = this.panel.querySelector("#dxf-extrude").checked;
    const wallHeight = parseFloat(this.panel.querySelector("#dxf-wall-height").value) || 3;

    let dxf;
    try {
      const parser = new window.DxfParser();
      dxf = parser.parseSync(this._pendingContent);
    } catch (err) {
      console.error("Error parseando DXF:", err);
      this._setStatus("Error al parsear el DXF. Verificá el archivo.");
      return;
    }

    const group = new THREE.Group();
    group.name = this._pendingFileName;
    group.userData.type = "dxf_import";

    const entities = dxf.entities || [];
    let importedCount = 0;

    entities.forEach((entity) => {
      // Filtrar por capa si se especificó
      if (layerFilter.length > 0 && !layerFilter.includes(entity.layer)) return;

      if (entity.type === "LINE") {
        const points = [
          new THREE.Vector3(entity.vertices[0].x * unitScale, 0, -entity.vertices[0].y * unitScale),
          new THREE.Vector3(entity.vertices[1].x * unitScale, 0, -entity.vertices[1].y * unitScale),
        ];
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: 0x89b4fa });
        group.add(new THREE.Line(geom, mat));
        importedCount++;

      } else if (entity.type === "LWPOLYLINE" || entity.type === "POLYLINE") {
        const pts = entity.vertices.map(
          (v) => new THREE.Vector3(v.x * unitScale, 0, -v.y * unitScale)
        );
        if (entity.closed && pts.length > 0) pts.push(pts[0].clone()); // Cerrar

        if (extrudeWalls && entity.closed && pts.length >= 3) {
          // Extruír como muro
          const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, p.z)));
          const geom = new THREE.ExtrudeGeometry(shape, {
            depth: wallHeight,
            bevelEnabled: false,
          });
          // Rotar para que la extrusión vaya en Y
          geom.rotateX(-Math.PI / 2);
          const mat = new THREE.MeshStandardMaterial({ color: 0xa6e3a1, side: THREE.DoubleSide });
          group.add(new THREE.Mesh(geom, mat));
        } else {
          const geom = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineBasicMaterial({ color: 0x89b4fa });
          group.add(new THREE.Line(geom, mat));
        }
        importedCount++;
      }
      // Otros tipos (CIRCLE, ARC, TEXT) pueden agregarse como extensión futura
    });

    if (importedCount === 0) {
      this._setStatus("No se encontraron entidades LINE o POLYLINE en el DXF.");
      return;
    }

    this.editor.addObject(group);
    this._setStatus(`DXF importado: ${importedCount} entidades.`);
  }

  _setStatus(msg) {
    this.panel.querySelector("#vec-status").textContent = msg;
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
