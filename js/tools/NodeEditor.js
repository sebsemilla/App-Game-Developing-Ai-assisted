// js/tools/NodeEditor.js
import * as THREE from "three";

export class NodeEditor {
  constructor(editor, transformManager) {
    this.editor = editor;
    this.transformManager = transformManager;

    this.selectedNode = null;
    this.selectedNodeGroup = null;
    this.nodeDragging = false;
    this.nodeDragStartMouse = null;
    this.nodeDragStartPos = null;
    this.nodeDragAxis = null;
    this.nodeGizmo = null;
  }

  // Returns hit node from a raycaster intersect list, or null
  getNodeHit(intersects) {
    return intersects.find((i) => i.object.userData?.isNode === true) || null;
  }

  selectNode(node) {
    if (this.selectedNode) this.deselectNode();
    this.selectedNode = node;
    this.selectedNodeGroup = node.userData.parentGroup;
    node.material.color.setHex(0xff0000);
    this._showGizmo(node);
    if (this.transformManager) this.transformManager.setEnabled(false);
  }

  deselectNode() {
    if (this.selectedNode) {
      this.selectedNode.material.color.setHex(0xffaa00);
      this.selectedNode = null;
      this.selectedNodeGroup = null;
    }
    this._hideGizmo();
    this.nodeDragging = false;
    if (this.transformManager && this.editor.selectedObjects?.length === 1) {
      this.transformManager.setEnabled(true);
    }
  }

  startDrag(event) {
    this.nodeDragging = true;
    this.nodeDragStartMouse = { x: event.clientX, y: event.clientY };
    this.nodeDragStartPos = this.selectedNode.position.clone();
    this.nodeDragAxis = null;
    if (this.editor.controls) this.editor.controls.enabled = false;
  }

  updateDrag(event) {
    if (!this.nodeDragging || !this.selectedNode) return;
    const dx = (event.clientX - this.nodeDragStartMouse.x) * 0.008;
    const dz = (event.clientY - this.nodeDragStartMouse.y) * 0.008;
    if (!this.nodeDragAxis) {
      this.nodeDragAxis = Math.abs(dx) > Math.abs(dz) ? "x" : "z";
    }
    const newPos = this.nodeDragStartPos.clone();
    if (this.nodeDragAxis === "x") newPos.x += dx;
    else newPos.z += dz;
    this.selectedNode.position.copy(newPos);
    this._updateShapeFromNodes(this.selectedNodeGroup);
    this._updateGizmoPosition(this.selectedNode);
  }

  endDrag() {
    this.nodeDragging = false;
    this.nodeDragStartMouse = null;
    this.nodeDragStartPos = null;
    this.nodeDragAxis = null;
    if (this.editor.controls) this.editor.controls.enabled = true;
    this.editor.saveState?.();
  }

  _showGizmo(node) {
    this._hideGizmo();
    const pos = node.position.clone();
    const length = 0.8;
    const lineX = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pos.x - length, pos.y, pos.z),
        new THREE.Vector3(pos.x + length, pos.y, pos.z),
      ]),
      new THREE.LineBasicMaterial({ color: 0xff0000 })
    );
    const lineZ = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pos.x, pos.y, pos.z - length),
        new THREE.Vector3(pos.x, pos.y, pos.z + length),
      ]),
      new THREE.LineBasicMaterial({ color: 0x00ff00 })
    );
    this.nodeGizmo = new THREE.Group();
    this.nodeGizmo.add(lineX, lineZ);
    this.editor.scene.add(this.nodeGizmo);
  }

  _hideGizmo() {
    if (this.nodeGizmo) {
      this.editor.scene.remove(this.nodeGizmo);
      this.nodeGizmo = null;
    }
  }

  _updateGizmoPosition(node) {
    if (this.nodeGizmo) this.nodeGizmo.position.copy(node.position);
  }

  _updateShapeFromNodes(group) {
    const nodes = group.userData.nodes;
    if (!nodes || nodes.length === 0) return;
    const points = nodes
      .slice()
      .sort((a, b) => a.userData.nodeIndex - b.userData.nodeIndex)
      .map((node) => node.position.clone());
    const oldGeom = group.userData.lineObject.geometry;
    oldGeom.dispose();
    group.userData.lineObject.geometry = new THREE.BufferGeometry().setFromPoints(points);
    group.userData.points = points;
  }
}
