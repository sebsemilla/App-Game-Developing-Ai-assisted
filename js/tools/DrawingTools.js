// js/tools/DrawingTools.js
import * as THREE from "three";

export class DrawingTools {
  constructor(editor, inputHandler) {
    this.editor = editor;
    this.inputHandler = inputHandler;
    this.currentTool = "select";
    this.isDrawing = false;
    this.startPoint = null;
    this.tempMesh = null;
  }

  activateTool(tool) {
    this.currentTool = tool;
    this.inputHandler.setTool(
      tool,
      tool === "cube" || tool === "sphere" || tool === "cylinder" ? "3d" : "2d",
    );
    this.editor.renderer.domElement.style.cursor =
      tool === "select" ? "default" : "crosshair";
  }

  getIntersectionWithPlane(event) {
    const rect = this.editor.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.editor.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      return intersectionPoint;
    }
    return null;
  }
}
