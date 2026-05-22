// js/tools/MarqueeSelector.js
import * as THREE from "three";

export class MarqueeSelector {
  constructor(editor, transformManager) {
    this.editor = editor;
    this.transformManager = transformManager;

    this.marqueeMode = false;
    this.isMarqueeDragging = false;
    this.marqueeStart = null;
    this.marqueeEnd = null;
    this.marqueeDiv = null;
  }

  setMode(active) {
    this.marqueeMode = active;
    const marqueeBtn = document.getElementById("btn-marquee");
    if (marqueeBtn) {
      marqueeBtn.classList.toggle("active", active);
    }
  }

  start(event) {
    this.isMarqueeDragging = true;
    this.marqueeStart = { x: event.clientX, y: event.clientY };
    this.marqueeEnd = this.marqueeStart;
    this._createDiv();
    this._updateDiv();
    if (this.editor.controls) this.editor.controls.enabled = false;
    if (this.transformManager) this.transformManager.setEnabled(false);
  }

  update(event) {
    this.marqueeEnd = { x: event.clientX, y: event.clientY };
    this._updateDiv();
  }

  cancel() {
    this.isMarqueeDragging = false;
    this.marqueeStart = null;
    this.marqueeEnd = null;
    this._updateDiv();
    if (this.editor.controls) this.editor.controls.enabled = true;
    if (this.transformManager) this.transformManager.setEnabled(true);
  }

  finish(event, propertiesPanel) {
    if (!this.marqueeStart || !this.marqueeEnd) return;
    const objects = this._getObjectsInRect(this.marqueeStart, this.marqueeEnd);
    let newSelection = [];
    if (event.shiftKey) {
      newSelection = [...(this.editor.selectedObjects || []), ...objects];
    } else if (event.ctrlKey) {
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
    this.cancel();
    if (propertiesPanel) {
      propertiesPanel.updateForObject(newSelection.length === 1 ? newSelection[0] : null);
    }
  }

  _createDiv() {
    if (this.marqueeDiv) return;
    this.marqueeDiv = document.createElement("div");
    this.marqueeDiv.style.position = "fixed";
    this.marqueeDiv.style.border = "2px dashed #00ff00";
    this.marqueeDiv.style.backgroundColor = "rgba(0,255,0,0.1)";
    this.marqueeDiv.style.pointerEvents = "none";
    this.marqueeDiv.style.zIndex = "10000";
    document.body.appendChild(this.marqueeDiv);
  }

  _updateDiv() {
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

  _getObjectsInRect(start, end) {
    const rect = {
      left: Math.min(start.x, end.x),
      right: Math.max(start.x, end.x),
      top: Math.min(start.y, end.y),
      bottom: Math.max(start.y, end.y),
    };
    const camera = this.editor.camera;
    const domElement = this.editor.renderer.domElement;
    const selected = [];

    this.editor.getAllObjects().forEach((obj) => {
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
        return {
          x: (vector.x * 0.5 + 0.5) * domElement.clientWidth,
          y: -(vector.y * 0.5 - 0.5) * domElement.clientHeight,
        };
      });
      const minX = Math.min(...screenCorners.map((p) => p.x));
      const maxX = Math.max(...screenCorners.map((p) => p.x));
      const minY = Math.min(...screenCorners.map((p) => p.y));
      const maxY = Math.max(...screenCorners.map((p) => p.y));
      if (maxX >= rect.left && minX <= rect.right && maxY >= rect.top && minY <= rect.bottom) {
        selected.push(obj);
      }
    });
    return selected;
  }
}
