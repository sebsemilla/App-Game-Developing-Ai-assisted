// js/main.js
import { Editor } from './core/Editor.js';
import * as THREE from 'three';
import { GridConfig } from './ui/GridConfig.js';  // ¡Ojo! es 'ui' no 'config'
import { DrawingTools } from './tools/DrawingTools.js';
import { CameraManager } from './cameras/CameraManager.js';

// Inicializar el editor
const editor = new Editor();
editor.init('canvas-container');

const heightIndicator = document.createElement('div');
heightIndicator.style.position = 'fixed';
heightIndicator.style.bottom = '20px';
heightIndicator.style.left = '20px';
heightIndicator.style.backgroundColor = 'rgba(0,0,0,0.8)';
heightIndicator.style.color = '#4CAF50';
heightIndicator.style.padding = '10px 20px';
heightIndicator.style.borderRadius = '8px';
heightIndicator.style.fontFamily = 'monospace';
heightIndicator.style.fontSize = '16px';
heightIndicator.style.fontWeight = 'bold';
heightIndicator.style.zIndex = '1000';
heightIndicator.style.display = 'none';
heightIndicator.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
heightIndicator.style.border = '1px solid #4CAF50';
heightIndicator.id = 'height-indicator';
heightIndicator.innerHTML = `
    <div>📏 Ajustando altura</div>
    <div id="height-value" style="font-size: 24px;">1.00</div>
    <div style="font-size: 12px; color: #aaa;">Arrastra verticalmente</div>
`;
document.body.appendChild(heightIndicator);
console.log('✅ Indicador de altura creado');

const gridConfig = new GridConfig(editor);

// Variables para dibujo
let drawingMode = '2d';
let isDrawing = false;
let isAdjustingHeight = false;
let startPoint = null;
let tempMesh = null;
let startMouseY = 0;
let currentTool = 'select';
let tempLine = null;
let freehandPoints = [];

// Función para resetear todo el estado de dibujo
function resetDrawingState() {
    console.log('🔄 Reseteando estado de dibujo');

    isDrawing = false;
    isAdjustingHeight = false;
    startPoint = null;
    startMouseY = 0;

    // Limpiar previews
    if (tempLine) {
        editor.scene.remove(tempLine);
        if (tempLine.geometry) tempLine.geometry.dispose();
        tempLine = null;
    }

    if (tempMesh) {
        editor.scene.remove(tempMesh);
        if (tempMesh.geometry) tempMesh.geometry.dispose();
        if (tempMesh.material) {
            if (Array.isArray(tempMesh.material)) {
                tempMesh.material.forEach(m => m.dispose());
            } else {
                tempMesh.material.dispose();
            }
        }
        tempMesh = null;
    }

    // Reactivar controles de cámara
    if (editor && editor.controls) {
        editor.controls.enabled = true;
    }

    // Resetear cursor
    editor.renderer.domElement.style.cursor = 'default';

    // Ocultar indicador
    const indicator = document.getElementById('height-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }

    console.log('✅ Estado reseteado');
}

// Elementos UI
const modeSelect = document.getElementById('drawing-mode');
const colorPicker = document.getElementById('color-picker');

// Cambiar modo 2D/3D
modeSelect.addEventListener('change', (e) => {
    drawingMode = e.target.value;
    console.log('Modo cambiado a:', drawingMode);

    // Desactivar herramienta actual si no es compatible
    if (drawingMode === '2d' && ['cube', 'sphere', 'cylinder'].includes(currentTool)) {
        currentTool = 'select';
        updateActiveButton();
    } else if (drawingMode === '3d' && ['rect2d', 'circle2d', 'line', 'freehand'].includes(currentTool)) {
        currentTool = 'select';
        updateActiveButton();
    }
});

editor.renderer.domElement.addEventListener('mousedown', (event) => {
    console.log('🖱️ mousedown - botón:', event.button, 'tool:', currentTool);
    // Prevenir menú contextual del clic derecho
    event.preventDefault();

    if (currentTool === 'select') {
        return;
    }

    // CLIC IZQUIERDO (button === 0) - Empezar a dibujar base
    if (event.button === 0) {
        // 🚫 Desactivar controles de cámara mientras dibujamos
        console.log('🎯 Clic izquierdo detectado');
        // Si ya hay un dibujo en progreso, resetear primero
        if (isDrawing || tempMesh || tempLine) {
            resetDrawingState();
        }
        // Desactivar controles de cámara
        editor.controls.enabled = false;

        const point = getIntersectionWithPlane(event);
        if (!point) {
            console.log('❌ No hay intersección con el plano');
            editor.controls.enabled = true;
            return;
        }

        // Aplicar snap
        let snappedPoint;

        if (gridConfig.snapEnabled) {
            snappedPoint = gridConfig.snapToGrid(point);
        } else {
            snappedPoint = point.clone();
        }

        // Asegurar que snappedPoint es un Vector3
        if (!snappedPoint.clone) {
            console.warn('Creando Vector3 desde objeto:', snappedPoint);
            snappedPoint = new THREE.Vector3(snappedPoint.x, snappedPoint.y, snappedPoint.z);
        }

        startPoint = snappedPoint.clone();
        console.log('📍 Punto de inicio (snap):', startPoint);
        isDrawing = true;

        const color = colorPicker.value;

        // Crear preview según la herramienta
        if (drawingMode === '2d') {
            create2DPreview(snappedPoint, color);
        } else {
            create3DPreview(snappedPoint, color);
        }
    }
    // CLIC DERECHO (button === 2) - Modo ajuste de altura
    else if (event.button === 2 && drawingMode === '3d' && tempMesh) {
        console.log('🎯 Clic derecho detectado');

        // Solo si estamos en modo 3D y hay un preview activo
        if (drawingMode === '3d' && tempMesh && isDrawing) {
            console.log('📏 Activando modo ajuste de altura');
            isAdjustingHeight = true;
            startMouseY = event.clientY;
            editor.renderer.domElement.style.cursor = 'ns-resize';

            // Mostrar indicador
            const indicator = document.getElementById('height-indicator');
            const heightValue = document.getElementById('height-value');
            indicator.style.display = 'block';
            heightValue.textContent = tempHeight.toFixed(2);
        } else {
            console.log('❌ No se puede ajustar altura:', {
                drawingMode,
                tieneTempMesh: !!tempMesh,
                isDrawing
            });
        }
    }
});

// Evento mousemove
editor.renderer.domElement.addEventListener('mousemove', (event) => {
    // MODO AJUSTE DE ALTURA (prioridad máxima)
    if (isAdjustingHeight && tempMesh && isDrawing) {
        console.log('📐 Ajustando altura:', event.clientY);

        const deltaY = (startMouseY - event.clientY) * 0.02;
        tempHeight = Math.max(0.2, Math.min(10, tempHeight + deltaY)); // Límite máximo de 10

        console.log('📏 Nueva altura calculada:', tempHeight.toFixed(2));

        // Actualizar preview
        tempMesh.scale.y = tempHeight;
        tempMesh.position.y = startPoint.y + tempHeight / 2;

        // Actualizar posición de referencia para próximo movimiento
        startMouseY = event.clientY;

        // Actualizar indicador
        const heightValue = document.getElementById('height-value');
        if (heightValue) {
            heightValue.textContent = tempHeight.toFixed(2);
        }
        return; // Importante: salir para no procesar como dibujo normal
    }

    // MODO DIBUJO NORMAL
    if (isDrawing && startPoint && !isAdjustingHeight) {
        const point = getIntersectionWithPlane(event);
        if (!point) return;

        const snappedPoint = gridConfig.snapEnabled ?
            gridConfig.snapToGrid(point) : point.clone();

        updatePreview(snappedPoint);
    }
});
// Evento mouseup
editor.renderer.domElement.addEventListener('mouseup', (event) => {
    console.log('🖱️ mouseup - botón:', event.button, 'isAdjustingHeight:', isAdjustingHeight);

    // Si estábamos ajustando altura con clic derecho
    if (isAdjustingHeight) {
        console.log('📏 Fin ajuste de altura - altura final:', tempHeight.toFixed(2));
        isAdjustingHeight = false;
        editor.renderer.domElement.style.cursor = 'crosshair';

        // Ocultar indicador
        const indicator = document.getElementById('height-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }

        // IMPORTANTE: No reseteamos el dibujo, solo el modo ajuste
        // El dibujo continúa con el preview actualizado
        return;
    }

    // Si estábamos dibujando con clic izquierdo
    if (isDrawing && event.button === 0) {
        console.log('🖱️ Finalizando dibujo');

        const point = getIntersectionWithPlane(event);
        if (point && startPoint) {
            const snappedPoint = gridConfig.snapEnabled ?
                gridConfig.snapToGrid(point) : point.clone();

            finishDrawing(snappedPoint);
        }

        // Resetear todo el estado de dibujo
        resetDrawingState();

        // Reactivar controles de cámara (resetDrawingState ya lo hace, pero por seguridad)
        editor.controls.enabled = true;
    }
});

// Prevenir menú contextual en el canvas
editor.renderer.domElement.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

// Evento mouseleave (el mouse sale del canvas)
editor.renderer.domElement.addEventListener('mouseleave', () => {
    console.log('🖱️ mouseleave - limpiando estado');

    // Si hay algo en progreso, resetear todo
    if (isDrawing || isAdjustingHeight || tempMesh || tempLine) {
        console.log('🧹 Limpiando dibujo cancelado');
        resetDrawingState(); // ✅ resetDrawingState ya hace todo el trabajo
    }
});

// Botones de la toolbar
document.getElementById('btn-rect2d').addEventListener('click', () => {
    currentTool = 'rect2d';
    drawingMode = '2d';
    modeSelect.value = '2d';
    updateActiveButton();
    console.log('Modo: Rectángulo 2D');
});

document.getElementById('btn-circle2d').addEventListener('click', () => {
    currentTool = 'circle2d';
    drawingMode = '2d';
    modeSelect.value = '2d';
    updateActiveButton();
    console.log('Modo: Círculo 2D');
});

document.getElementById('btn-line').addEventListener('click', () => {
    currentTool = 'line';
    drawingMode = '2d';
    modeSelect.value = '2d';
    updateActiveButton();
    console.log('Modo: Línea');
});

document.getElementById('btn-freehand').addEventListener('click', () => {
    currentTool = 'freehand';
    drawingMode = '2d';
    modeSelect.value = '2d';
    updateActiveButton();
    console.log('Modo: Mano alzada');
});

document.getElementById('btn-cube').addEventListener('click', () => {
    currentTool = 'cube';
    drawingMode = '3d';
    modeSelect.value = '3d';
    updateActiveButton();
    console.log('Modo: Cubo 3D');
});

document.getElementById('btn-sphere').addEventListener('click', () => {
    currentTool = 'sphere';
    drawingMode = '3d';
    modeSelect.value = '3d';
    updateActiveButton();
    console.log('Modo: Esfera 3D');
});

document.getElementById('btn-cylinder').addEventListener('click', () => {
    currentTool = 'cylinder';
    drawingMode = '3d';
    modeSelect.value = '3d';
    updateActiveButton();
    console.log('Modo: Cilindro 3D');
});

document.getElementById('btn-select').addEventListener('click', () => {
    currentTool = 'select';
    updateActiveButton();
    console.log('Modo: Selección');
});

document.getElementById('btn-grid-config').addEventListener('click', () => {
    // Mostrar/ocultar panel de grid
    const existingPanel = document.querySelector('.grid-config-panel');
    if (existingPanel) {
        existingPanel.remove();
    } else {
        const panel = gridConfig.createUI();
        document.body.appendChild(panel);
    }
});

document.getElementById('btn-clear').addEventListener('click', () => {
    editor.clearScene();
    console.log('Escena limpiada');
});

// Botones de deshacer/rehacer (los añadiremos después)
document.getElementById('btn-undo')?.addEventListener('click', () => {
    editor.undo();
});

document.getElementById('btn-redo')?.addEventListener('click', () => {
    editor.redo();
});

// Función para actualizar botón activo
function updateActiveButton() {
    document.querySelectorAll('#toolbar button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Encontrar y activar el botón correspondiente
    const activeButton = document.querySelector(`[id="btn-${currentTool}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// ============================================
// FUNCIONES AUXILIARES (añade aquí todo esto)
// ============================================

// Función auxiliar para obtener intersección con el plano
function getIntersectionWithPlane(event) {
    const rect = editor.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, editor.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
        return intersectionPoint;
    }
    return null;
}

// Funciones de preview
function create2DPreview(point, color) {
    const material = new THREE.LineBasicMaterial({ color: color });

    switch (currentTool) {
        case 'rect2d':
            const points = [
                new THREE.Vector3(0, 0.01, 0),
                new THREE.Vector3(1, 0.01, 0),
                new THREE.Vector3(1, 0.01, 1),
                new THREE.Vector3(0, 0.01, 1),
                new THREE.Vector3(0, 0.01, 0)
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            tempLine = new THREE.Line(geometry, material);
            tempLine.position.copy(point);
            editor.scene.add(tempLine);
            break;

        case 'circle2d':
            const curve = new THREE.EllipseCurve(0, 0, 1, 1);
            const circlePoints = curve.getPoints(32);
            const circleGeometry = new THREE.BufferGeometry().setFromPoints(
                circlePoints.map(p => new THREE.Vector3(p.x, 0.01, p.y))
            );
            tempLine = new THREE.Line(circleGeometry, material);
            tempLine.position.copy(point);
            editor.scene.add(tempLine);
            break;

        case 'line':
            const linePoints = [
                new THREE.Vector3(0, 0.01, 0),
                new THREE.Vector3(0, 0.01, 0)
            ];
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
            tempLine = new THREE.Line(lineGeometry, material);
            tempLine.position.copy(point);
            editor.scene.add(tempLine);
            break;
    }
}

function create3DPreview(point, color) {
    console.log('🎨 Creando preview 3D en:', point);

    const material = new THREE.MeshBasicMaterial({
        color: color,
        opacity: 0.5,
        transparent: true,
        wireframe: true
    });

    switch (currentTool) {
        case 'cube':
            tempMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
            tempMesh.position.copy(point);
            tempMesh.position.y += 0.5;
            editor.scene.add(tempMesh);
            break;

        case 'sphere':
            tempMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), material);
            tempMesh.position.copy(point);
            tempMesh.position.y += 0.5;
            editor.scene.add(tempMesh);
            break;

        case 'cylinder':
            tempMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 16), material);
            tempMesh.position.copy(point);
            tempMesh.position.y += 0.5;
            editor.scene.add(tempMesh);
            break;
    }
    // Guardar startPoint para referencia en ajuste de altura
    startPoint = point.clone();
}

function updatePreview(currentPoint) {
    if (!startPoint) return;

    const width = Math.abs(currentPoint.x - startPoint.x);
    const depth = Math.abs(currentPoint.z - startPoint.z);
    const center = new THREE.Vector3(
        (startPoint.x + currentPoint.x) / 2,
        0,
        (startPoint.z + currentPoint.z) / 2
    );

    if (drawingMode === '2d' && tempLine) {
        switch (currentTool) {
            case 'rect2d':
                const points = [
                    new THREE.Vector3(-width / 2, 0.01, -depth / 2),
                    new THREE.Vector3(width / 2, 0.01, -depth / 2),
                    new THREE.Vector3(width / 2, 0.01, depth / 2),
                    new THREE.Vector3(-width / 2, 0.01, depth / 2),
                    new THREE.Vector3(-width / 2, 0.01, -depth / 2)
                ];
                tempLine.geometry.dispose();
                tempLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
                tempLine.position.copy(center);
                break;

            case 'circle2d':
                const radius = Math.max(width, depth) / 2;
                const curve = new THREE.EllipseCurve(0, 0, radius, radius);
                const circlePoints = curve.getPoints(32);
                tempLine.geometry.dispose();
                tempLine.geometry = new THREE.BufferGeometry().setFromPoints(
                    circlePoints.map(p => new THREE.Vector3(p.x, 0.01, p.y))
                );
                tempLine.position.copy(center);
                break;

            case 'line':
                const linePoints = [
                    new THREE.Vector3(startPoint.x - center.x, 0.01, startPoint.z - center.z),
                    new THREE.Vector3(currentPoint.x - center.x, 0.01, currentPoint.z - center.z)
                ];
                tempLine.geometry.dispose();
                tempLine.geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                tempLine.position.copy(center);
                break;
        }
    } else if (drawingMode === '3d' && tempMesh) {
        tempMesh.scale.set(width, 1, depth);
        tempMesh.position.x = center.x;
        tempMesh.position.z = center.z;
    }
}

function finishDrawing(endPoint) {
    const color = colorPicker.value;

    if (drawingMode === '2d') {
        if (tempLine) {
            // Convertir línea temporal en objeto permanente
            const material = new THREE.LineBasicMaterial({ color: color });
            const geometry = tempLine.geometry.clone();
            const finalLine = new THREE.Line(geometry, material);
            finalLine.position.copy(tempLine.position);

            finalLine.userData = {
                type: currentTool,
                mode: '2d',
                createdAt: new Date().toISOString()
            };

            editor.scene.add(finalLine);
            editor.scene.remove(tempLine);
            tempLine.geometry.dispose();
            tempLine = null;
        }
    } else {
        if (tempMesh) {
            // Crear objeto 3D permanente
            let geometry;
            switch (currentTool) {
                case 'cube':
                    geometry = new THREE.BoxGeometry(1, 1, 1);
                    break;
                case 'sphere':
                    geometry = new THREE.SphereGeometry(0.5, 16, 16);
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
                    break;
            }

            const material = new THREE.MeshStandardMaterial({ color: color });
            const finalMesh = new THREE.Mesh(geometry, material);
            finalMesh.position.copy(tempMesh.position);
            finalMesh.scale.copy(tempMesh.scale);
            finalMesh.castShadow = true;
            finalMesh.receiveShadow = true;

            finalMesh.userData = {
                type: currentTool,
                mode: '3d',
                createdAt: new Date().toISOString()
            };

            editor.scene.add(finalMesh);
            editor.scene.remove(tempMesh);
            tempMesh.geometry.dispose();
            tempMesh.material.dispose();
            tempMesh = null;
        }
    }
}


// Iniciar animación
editor.animate();

// Hacer editor accesible desde consola para debugging
window.editor = editor;