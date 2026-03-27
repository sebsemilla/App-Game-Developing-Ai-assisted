// js/tools/PreviewManager.js
import * as THREE from "three";

export class PreviewManager {
  constructor(editor) {
    this.editor = editor;
    this.currentTool = "select";
    this.drawingMode = "2d";
    this.tempMesh = null;
    this.tempLine = null;
  }

  setTool(tool, mode) {
    this.currentTool = tool;
    this.drawingMode = mode;
  }

  hasPreview() {
    return this.tempMesh !== null || this.tempLine !== null;
  }

  create2DPreview(point, color) {
    const material = new THREE.LineBasicMaterial({ color: color });
    const points = [
      new THREE.Vector3(0, 0.01, 0),
      new THREE.Vector3(1, 0.01, 0),
      new THREE.Vector3(1, 0.01, 1),
      new THREE.Vector3(0, 0.01, 1),
      new THREE.Vector3(0, 0.01, 0),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.tempLine = new THREE.Line(geometry, material);
    this.tempLine.position.copy(point);
    this.editor.scene.add(this.tempLine);
  }

  create3DPreview(point, color) {
    const material = new THREE.MeshBasicMaterial({
      color: color,
      opacity: 0.5,
      transparent: true,
      wireframe: true,
    });
    this.tempMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    this.tempMesh.position.copy(point);
    this.tempMesh.position.y += 0.5;
    this.editor.scene.add(this.tempMesh);
  }

  updatePreview(currentPoint) {
    if (!this.tempMesh && !this.tempLine) return;

    if (this.drawingMode === "2d" && this.tempLine) {
      const width = Math.abs(currentPoint.x - this.tempLine.position.x);
      const depth = Math.abs(currentPoint.z - this.tempLine.position.z);
      const center = new THREE.Vector3(
        (this.tempLine.position.x + currentPoint.x) / 2,
        0.01,
        (this.tempLine.position.z + currentPoint.z) / 2,
      );
      const points = [
        new THREE.Vector3(-width / 2, 0.01, -depth / 2),
        new THREE.Vector3(width / 2, 0.01, -depth / 2),
        new THREE.Vector3(width / 2, 0.01, depth / 2),
        new THREE.Vector3(-width / 2, 0.01, depth / 2),
        new THREE.Vector3(-width / 2, 0.01, -depth / 2),
      ];
      this.tempLine.geometry.dispose();
      this.tempLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
      this.tempLine.position.copy(center);
    } else if (this.drawingMode === "3d" && this.tempMesh) {
      const width = Math.abs(currentPoint.x - this.tempMesh.position.x);
      const depth = Math.abs(currentPoint.z - this.tempMesh.position.z);
      const center = new THREE.Vector3(
        (this.tempMesh.position.x + currentPoint.x) / 2,
        0,
        (this.tempMesh.position.z + currentPoint.z) / 2,
      );
      this.tempMesh.scale.set(width, 1, depth);
      this.tempMesh.position.x = center.x;
      this.tempMesh.position.z = center.z;
    }
  }

  finishDrawing(endPoint, mode, tool, color) {
    let finalObject = null;

    if (mode === "2d" && this.tempLine) {
      const material = new THREE.LineBasicMaterial({ color: color });
      const geometry = this.tempLine.geometry.clone();
      finalObject = new THREE.Line(geometry, material);
      finalObject.position.copy(this.tempLine.position);
      finalObject.userData = { type: tool, mode: "2d" };
      this.editor.addObject(finalObject);
      this.editor.scene.remove(this.tempLine);
      this.tempLine.geometry.dispose();
      this.tempLine = null;
    } else if (mode === "3d" && this.tempMesh) {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: color });
      finalObject = new THREE.Mesh(geometry, material);
      finalObject.position.copy(this.tempMesh.position);
      finalObject.scale.copy(this.tempMesh.scale);
      finalObject.castShadow = true;
      finalObject.receiveShadow = true;
      finalObject.userData = { type: tool, mode: "3d" };
      this.editor.addObject(finalObject);
      this.editor.scene.remove(this.tempMesh);
      this.tempMesh.geometry.dispose();
      this.tempMesh.material.dispose();
      this.tempMesh = null;
    }

    return finalObject;
  }

  cleanup() {
    if (this.tempMesh) {
      this.editor.scene.remove(this.tempMesh);
      this.tempMesh.geometry?.dispose();
      this.tempMesh.material?.dispose();
      this.tempMesh = null;
    }
    if (this.tempLine) {
      this.editor.scene.remove(this.tempLine);
      this.tempLine.geometry?.dispose();
      this.tempLine = null;
    }
  }
}
