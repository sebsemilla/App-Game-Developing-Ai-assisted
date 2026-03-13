import * as THREE from 'three';
import { createShape } from './objects.js';

export class DrawingTool {
    constructor(scene, raycaster, mouse) {
        this.scene = scene;
        this.raycaster = raycaster;
        this.mouse = mouse;
        this.isDrawing = false;
        this.startPoint = null;
        this.currentTool = null; // 'rect', 'circle', 'select'
        this.tempMesh = null;
    }

    onMouseDown(event, color) {
        if (this.currentTool === 'select') return;

        this.isDrawing = true;
        const intersect = this.getIntersection(event);
        if (!intersect) return;

        this.startPoint = intersect.point;
        this.startPoint.y = 0; // Asegurar que empieza en el suelo

        // Crear un objeto temporal visual
        const material = new THREE.MeshBasicMaterial({ color: color, opacity: 0.5, transparent: true });
        if (this.currentTool === 'rect') {
            this.tempMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
        } else if (this.currentTool === 'circle') {
            this.tempMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32), material);
        }

        this.tempMesh.position.copy(this.startPoint);
        this.tempMesh.position.y += 0.5;
        this.scene.add(this.tempMesh);
    }

    onMouseMove(event, color) {
        if (!this.isDrawing || !this.tempMesh) return;

        const intersect = this.getIntersection(event);
        if (!intersect) return;

        const endPoint = intersect.point;
        endPoint.y = 0;

        // Calcular dimensiones
        const width = Math.abs(endPoint.x - this.startPoint.x);
        const depth = Math.abs(endPoint.z - this.startPoint.z);

        if (this.currentTool === 'rect') {
            this.tempMesh.scale.set(width, 1, depth);
            // Centrar el objeto
            this.tempMesh.position.x = (this.startPoint.x + endPoint.x) / 2;
            this.tempMesh.position.z = (this.startPoint.z + endPoint.z) / 2;
        } else if (this.currentTool === 'circle') {
            const radius = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(depth / 2, 2));
            this.tempMesh.scale.set(radius, 1, radius);
            this.tempMesh.position.x = (this.startPoint.x + endPoint.x) / 2;
            this.tempMesh.position.z = (this.startPoint.z + endPoint.z) / 2;
        }
    }

    onMouseUp(event, color) {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (this.tempMesh) {
            // Convertir el objeto temporal en uno real
            const finalGeo = this.tempMesh.geometry.clone();
            const finalMat = new THREE.MeshStandardMaterial({ color: color });
            const finalMesh = new THREE.Mesh(finalGeo, finalMat);

            // Copiar posición y escala
            finalMesh.position.copy(this.tempMesh.position);
            finalMesh.scale.copy(this.tempMesh.scale);
            finalMesh.castShadow = true;
            finalMesh.receiveShadow = true;

            // Asignar metadatos
            finalMesh.userData = {
                id: Date.now(),
                type: this.currentTool,
                isSelected: false
            };

            this.scene.add(finalMesh);
            this.scene.remove(this.tempMesh); // Eliminar el ghost
            this.tempMesh = null;
        }
    }

    getIntersection(event) {
        const rect = event.target.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera); // Necesitas pasar la cámara aquí
        // Nota: En una implementación real, necesitas pasar la cámara a esta clase
        return null; // Simplificado para el ejemplo
    }
}