// js/utils/MathUtils.js
import * as THREE from "three";

export function getIntersectionWithPlane(event, camera, domElement) {
  const rect = domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersectionPoint = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
    return intersectionPoint;
  }
  return null;
}

export function applySnap(point, gridConfig) {
  if (!point) return null;
  if (gridConfig && gridConfig.snapEnabled) {
    return gridConfig.snapToGrid(point);
  }
  return point.clone();
}
