import * as THREE from 'three';

export class GamefyObject {
    constructor(type, geometry, material, position) {
        this.type = type; // 'wall', 'floor', 'prop'
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        const objectId = Date.now();

        // Metadatos para el editor
        this.userData = {
            id: objectId,
            name: `${type}_${objectId}`,
            isSelected: false,
            isDraggable: true
        };
    }

    select() {
        this.mesh.material.emissive.setHex(0x555555); // Brillo al seleccionar
        this.userData.isSelected = true;
    }

    deselect() {
        this.mesh.material.emissive.setHex(0x000000);
        this.userData.isSelected = false;
    }
}

// Fábrica rápida para crear formas básicas
export function createShape(type, color, size) {
    let geometry;
    if (type === 'rect') {
        geometry = new THREE.BoxGeometry(size.x, size.y || 1, size.z);
    } else if (type === 'circle') {
        geometry = new THREE.CylinderGeometry(size.r, size.r, size.h || 1, 32);
    }

    const material = new THREE.MeshStandardMaterial({ color: color });
    return new GamefyObject(type, geometry, material, new THREE.Vector3(0, size.h ? size.h / 2 : 0.5, 0));
}