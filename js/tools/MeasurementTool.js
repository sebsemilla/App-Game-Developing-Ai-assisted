// js/tools/MeasurementTool.js
// Herramienta de medición con dos modos:
//
// 1. DIMENSIONES: muestra W x H x D del objeto seleccionado en tiempo real (overlay 2D)
// 2. DISTANCIA:   click en punto A → click en punto B → dibuja línea con etiqueta de distancia
//
import * as THREE from "three";
import { getIntersectionWithPlane } from "../utils/MathUtils.js";

export class MeasurementTool {
  constructor(editor) {
    this.editor = editor;
    this.active = false;

    // Estado de medición por puntos
    this._measuring = false;      // Esperando segundo click
    this._pointA = null;          // THREE.Vector3 del primer punto
    this._markers = [];           // Esferas indicadoras de puntos
    this._measurements = [];      // { line, label, spriteA, spriteB } — mediciones guardadas

    // Overlay 2D para dimensiones del objeto seleccionado
    this._dimensionOverlay = null;

    // Línea fantasma mientras se mueve el mouse
    this._ghostLine = null;
    this._ghostLabel = null;

    this._createOverlay();
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
  }

  // ── API pública ───────────────────────────────────────────────────────────

  activate() {
    this.active = true;
    this._dimensionOverlay.style.display = "block";
    this.editor.renderer.domElement.addEventListener("mousedown", this._onMouseDown);
    this.editor.renderer.domElement.addEventListener("mousemove", this._onMouseMove);
    this.editor.renderer.domElement.style.cursor = "crosshair";
  }

  deactivate() {
    this.active = false;
    this._measuring = false;
    this._pointA = null;
    this._removeGhost();
    this._dimensionOverlay.style.display = "none";
    this.editor.renderer.domElement.removeEventListener("mousedown", this._onMouseDown);
    this.editor.renderer.domElement.removeEventListener("mousemove", this._onMouseMove);
    this.editor.renderer.domElement.style.cursor = "default";
  }

  toggle() {
    this.active ? this.deactivate() : this.activate();
    return this.active;
  }

  // Actualizar el overlay de dimensiones — llamar desde el loop de render
  // o cuando cambie la selección
  updateDimensionOverlay() {
    const obj = this.editor.selectedObject;
    if (!this.active || !obj) {
      this._dimensionOverlay.style.display = this.active ? "block" : "none";
      this._dimensionOverlay.querySelector("#dim-text").textContent =
        this.active ? "Seleccioná un objeto para ver sus dimensiones" : "";
      return;
    }

    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);

    const fmt = (n) => n.toFixed(2);
    this._dimensionOverlay.querySelector("#dim-text").textContent =
      `${obj.name || obj.userData.type || "Objeto"}  ·  W ${fmt(size.x)}  ·  H ${fmt(size.y)}  ·  D ${fmt(size.z)}`;

    // Posicionar el overlay sobre el objeto en pantalla
    const center = new THREE.Vector3();
    box.getCenter(center);
    const screenPos = this._toScreen(center);
    if (screenPos) {
      this._dimensionOverlay.style.left = screenPos.x + "px";
      this._dimensionOverlay.style.top = (screenPos.y - 36) + "px";
      this._dimensionOverlay.style.transform = "translateX(-50%)";
      this._dimensionOverlay.style.display = "block";
    }
  }

  clearAll() {
    this._measurements.forEach((m) => this._disposeMeasurement(m));
    this._measurements = [];
    this._markers.forEach((m) => {
      this.editor.scene.remove(m);
      m.geometry.dispose();
    });
    this._markers = [];
    this._measuring = false;
    this._pointA = null;
    this._removeGhost();
  }

  // ── Eventos del canvas ────────────────────────────────────────────────────

  _onMouseDown(event) {
    if (event.button !== 0) return;
    event.stopPropagation();

    const point = getIntersectionWithPlane(
      event,
      this.editor.camera,
      this.editor.renderer.domElement,
    );
    if (!point) return;

    if (!this._measuring) {
      // Primer click: registrar punto A
      this._pointA = point.clone();
      this._measuring = true;
      this._addMarker(point);
    } else {
      // Segundo click: medir y guardar
      const pointB = point.clone();
      this._addMarker(pointB);
      this._addMeasurement(this._pointA, pointB);
      this._removeGhost();
      this._measuring = false;
      this._pointA = null;
    }
  }

  _onMouseMove(event) {
    if (!this._measuring || !this._pointA) return;
    const point = getIntersectionWithPlane(
      event,
      this.editor.camera,
      this.editor.renderer.domElement,
    );
    if (!point) return;
    this._updateGhost(this._pointA, point);
  }

  // ── Marcadores de puntos ──────────────────────────────────────────────────

  _addMarker(position) {
    const geom = new THREE.SphereGeometry(0.08, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xf38ba8 });
    const sphere = new THREE.Mesh(geom, mat);
    sphere.position.copy(position);
    sphere.userData.isMeasurement = true;
    this.editor.scene.add(sphere);
    this._markers.push(sphere);
  }

  // ── Línea de medición guardada ────────────────────────────────────────────

  _addMeasurement(a, b) {
    const distance = a.distanceTo(b);

    // Línea
    const points = [a.clone(), b.clone()];
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0xf38ba8 });
    const line = new THREE.Line(geom, mat);
    line.userData.isMeasurement = true;
    this.editor.scene.add(line);

    // Etiqueta en el punto medio
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const label = this._createLabel(`${distance.toFixed(2)} u`);
    label.position.copy(mid);
    label.position.y += 0.15;
    this.editor.scene.add(label);

    this._measurements.push({ line, label, geom, mat });
  }

  // ── Línea fantasma (preview mientras se mueve el mouse) ───────────────────

  _updateGhost(a, b) {
    this._removeGhost();
    const distance = a.distanceTo(b);

    const points = [a.clone(), b.clone()];
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({ color: 0xfab387, dashSize: 0.2, gapSize: 0.1 });
    this._ghostLine = new THREE.Line(geom, mat);
    this._ghostLine.computeLineDistances();
    this.editor.scene.add(this._ghostLine);

    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    this._ghostLabel = this._createLabel(`${distance.toFixed(2)} u`, 0xfab387);
    this._ghostLabel.position.copy(mid);
    this._ghostLabel.position.y += 0.15;
    this.editor.scene.add(this._ghostLabel);
  }

  _removeGhost() {
    if (this._ghostLine) {
      this.editor.scene.remove(this._ghostLine);
      this._ghostLine.geometry.dispose();
      this._ghostLine = null;
    }
    if (this._ghostLabel) {
      this.editor.scene.remove(this._ghostLabel);
      this._ghostLabel.material.map?.dispose();
      this._ghostLabel = null;
    }
  }

  // ── Sprite de etiqueta de texto ───────────────────────────────────────────

  _createLabel(text, color = 0xf38ba8) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(30,30,46,0.85)";
    ctx.beginPath();
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 8);
    ctx.fill();

    const hexColor = "#" + color.toString(16).padStart(6, "0");
    ctx.fillStyle = hexColor;
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.5, 0.4, 1);
    sprite.userData.isMeasurement = true;
    return sprite;
  }

  // ── Overlay 2D de dimensiones ─────────────────────────────────────────────

  _createOverlay() {
    this._dimensionOverlay = document.createElement("div");
    this._dimensionOverlay.id = "measurement-overlay";
    this._dimensionOverlay.style.cssText = `
      display: none;
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(30,30,46,0.9);
      color: #f38ba8;
      padding: 6px 14px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 13px;
      pointer-events: none;
      z-index: 8000;
      white-space: nowrap;
      border: 1px solid #f38ba8;
    `;
    this._dimensionOverlay.innerHTML = `<span id="dim-text">Seleccioná un objeto para ver sus dimensiones</span>`;
    document.body.appendChild(this._dimensionOverlay);
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  _toScreen(worldPos) {
    const canvas = this.editor.renderer.domElement;
    const v = worldPos.clone().project(this.editor.camera);
    return {
      x: (v.x * 0.5 + 0.5) * canvas.clientWidth,
      y: -(v.y * 0.5 - 0.5) * canvas.clientHeight,
    };
  }

  _disposeMeasurement(m) {
    this.editor.scene.remove(m.line);
    this.editor.scene.remove(m.label);
    m.geom?.dispose();
    m.mat?.dispose();
    m.label?.material?.map?.dispose();
  }
}
