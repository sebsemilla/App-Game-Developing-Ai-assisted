// js/tools/SelectionHandler.js
import * as THREE from "three";

export class SelectionHandler {
  constructor(editor, transformManager, propertiesPanel, assetsPanel) {
    this.editor = editor;
    this.transformManager = transformManager;
    this.propertiesPanel = propertiesPanel;
    this.assetsPanel = assetsPanel;

    this.selectionMode = "marquee"; // 'marquee', 'face', 'edge'
    this.selectedFaceInfo = null;
    this.selectedEdgeInfo = null;
    this.faceHelper = null;
    this.edgeHelper = null;
  }

  setMode(mode) {
    this.selectionMode = mode;
    this.clearFaceSelection();
    this.clearEdgeSelection();
  }

  // Returns a raycaster mouse vector from a DOM event
  _getMouseVector(event) {
    const rect = this.editor.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return mouse;
  }

  _getRaycaster(event) {
    const mouse = this._getMouseVector(event);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.editor.camera);
    return raycaster;
  }

  // Returns the closest ancestor with userData.type, or fallback to obj
  _resolveTarget(obj) {
    let target = obj;
    while (target.parent && !target.userData?.type) {
      target = target.parent;
    }
    return target.userData?.type ? target : obj;
  }

  handleClick(event) {
    if (this.selectionMode === "face") {
      this.selectFace(event);
      return;
    }
    if (this.selectionMode === "edge") {
      this.selectEdge(event);
      return;
    }

    const raycaster = this._getRaycaster(event);
    const intersects = raycaster.intersectObjects(this.editor.getAllObjects());

    if (event.ctrlKey) {
      if (intersects.length > 0) {
        const target = this._resolveTarget(intersects[0].object);
        const idx = this.editor.selectedObjects.indexOf(target);
        if (idx === -1) {
          this.editor.selectedObjects.push(target);
          if (target.material?.emissive) target.material.emissive.setHex(0x333333);
        } else {
          this.editor.selectedObjects.splice(idx, 1);
          if (target.material?.emissive) target.material.emissive.setHex(0x000000);
        }
      }
    } else {
      if (intersects.length > 0) {
        const target = this._resolveTarget(intersects[0].object);
        this.editor.clearSelection();
        this.editor.selectObject(target);
        this.editor.selectedObjects = [target];
      } else {
        this.editor.clearSelection();
        this.editor.selectedObjects = [];
      }
    }

    this._syncAfterSelection();
  }

  _syncAfterSelection() {
    const sel = this.editor.selectedObjects;
    if (sel.length === 1) {
      this.transformManager?.attach(sel[0]);
      this.propertiesPanel?.updateForObject(sel[0]);
      this.assetsPanel?.setCurrentObject(sel[0]);
    } else {
      this.transformManager?.detach();
      this.propertiesPanel?.updateForObject(null);
      this.assetsPanel?.setCurrentObject(null);
    }
  }

  isClickOnGizmo(event) {
    if (!this.transformManager?.controls) return false;
    const raycaster = this._getRaycaster(event);
    const gizmoGroup = this.transformManager.controls._gizmo;
    if (!gizmoGroup) return false;
    const gizmoMeshes = gizmoGroup.children.filter((c) => c.isMesh);
    return raycaster.intersectObjects(gizmoMeshes).length > 0;
  }

  getNodeHit(event) {
    const raycaster = this._getRaycaster(event);
    const allObjects = [];
    this.editor.scene.traverse((obj) => allObjects.push(obj));
    const intersects = raycaster.intersectObjects(allObjects);
    return intersects.find((i) => i.object.userData?.isNode === true) || null;
  }

  getObjectsAtPoint(event) {
    const raycaster = this._getRaycaster(event);
    return raycaster.intersectObjects(this.editor.getAllObjects());
  }

  // ---- Face selection ----
  selectFace(event) {
    const raycaster = this._getRaycaster(event);
    const intersects = raycaster.intersectObjects(this.editor.getAllObjects(), true);
    if (intersects.length === 0) return;
    const { object, face, faceIndex } = intersects[0];
    this.clearFaceSelection();
    this.selectedFaceInfo = { object, faceIndex, face };
    this._highlightFace(object, face);
    this.editor.clearSelection();
    this.editor.selectObject(object);
    this.editor.selectedObjects = [object];
    this.propertiesPanel?.updateForObject(object);
  }

  _highlightFace(object, face) {
    const posAttr = object.geometry.attributes.position;
    const vertices = [face.a, face.b, face.c].map((idx) => {
      const i = idx * 3;
      return object.localToWorld(
        new THREE.Vector3(posAttr.array[i], posAttr.array[i + 1], posAttr.array[i + 2])
      );
    });
    const positions = [];
    vertices.forEach((v) => positions.push(v.x, v.y, v.z));
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    geom.setIndex([0, 1, 2]);
    this.faceHelper = new THREE.Mesh(
      geom,
      new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
    );
    this.editor.scene.add(this.faceHelper);
  }

  clearFaceSelection() {
    if (this.faceHelper) {
      this.editor.scene.remove(this.faceHelper);
      this.faceHelper = null;
    }
    this.selectedFaceInfo = null;
  }

  // ---- Edge selection ----
  selectEdge(event) {
    const raycaster = this._getRaycaster(event);
    const intersects = raycaster.intersectObjects(this.editor.getAllObjects(), true);
    if (intersects.length === 0) return;
    const object = intersects[0].object;
    const edgesPositions = new THREE.EdgesGeometry(object.geometry).attributes.position.array;
    const worldSegments = [];
    for (let i = 0; i < edgesPositions.length; i += 6) {
      worldSegments.push([
        object.localToWorld(new THREE.Vector3(edgesPositions[i], edgesPositions[i + 1], edgesPositions[i + 2])),
        object.localToWorld(new THREE.Vector3(edgesPositions[i + 3], edgesPositions[i + 4], edgesPositions[i + 5])),
      ]);
    }
    const ray = raycaster.ray;
    let closestDist = Infinity;
    let closestIdx = -1;
    worldSegments.forEach((seg, idx) => {
      const closestPoint = new THREE.Vector3();
      ray.closestPointToSegment(seg[0], seg[1], closestPoint);
      const dist = ray.origin.distanceTo(closestPoint);
      if (dist < closestDist && dist < 0.1) {
        closestDist = dist;
        closestIdx = idx;
      }
    });
    if (closestIdx === -1) return;
    this.clearEdgeSelection();
    const seg = worldSegments[closestIdx];
    this.selectedEdgeInfo = { object, edgeIndex: closestIdx, vertices: seg };
    const lineGeom = new THREE.BufferGeometry().setFromPoints(seg);
    this.edgeHelper = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: 0xff33ff, linewidth: 2 }));
    this.editor.scene.add(this.edgeHelper);
    this.editor.clearSelection();
    this.editor.selectObject(object);
    this.editor.selectedObjects = [object];
    this.propertiesPanel?.updateForObject(object);
  }

  clearEdgeSelection() {
    if (this.edgeHelper) {
      this.editor.scene.remove(this.edgeHelper);
      this.edgeHelper = null;
    }
    this.selectedEdgeInfo = null;
  }

  clearAll() {
    this.clearFaceSelection();
    this.clearEdgeSelection();
  }
}
