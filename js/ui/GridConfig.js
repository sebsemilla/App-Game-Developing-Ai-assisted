// js/ui/GridConfig.js
import * as THREE from 'three';
export class GridConfig {
    constructor(editor) {
        console.log('📦 GridConfig constructor - Iniciando');
        this.editor = editor;
        this.visible = true;
        this.size = 50;
        this.divisions = 50;
        this.cellSize = 1;
        this.snapEnabled = true;
        console.log('✅ GridConfig inicializado');
    }

    snapToGrid(point) {
        if (!this.snapEnabled) return point;

        // Asegurar que point es un THREE.Vector3
        if (!(point instanceof THREE.Vector3)) {
            console.warn('snapToGrid: point no es Vector3', point);
            return point;
        }

        // Crear un nuevo Vector3 con las coordenadas ajustadas
        return new THREE.Vector3(
            Math.round(point.x / this.cellSize) * this.cellSize,
            point.y,
            Math.round(point.z / this.cellSize) * this.cellSize
        );
    }

    createUI() {
        console.log('Creando UI del Grid');
        const panel = document.createElement('div');
        panel.className = 'grid-config-panel';
        panel.innerHTML = `
            <h4>Configuración del Grid</h4>
            <label>
                <input type="checkbox" id="grid-visible" checked> Visible
            </label>
            <label>
                Tamaño: <input type="range" id="grid-size" min="10" max="100" value="50">
            </label>
            <label>
                Divisiones: <input type="range" id="grid-divisions" min="10" max="100" value="50">
            </label>
            <label>
                <input type="checkbox" id="grid-snap" checked> Snap a grid
            </label>
            <label>
                Tamaño de celda: <input type="number" id="grid-cellsize" value="1" step="0.1">
            </label>
        `;

        // Event listeners del panel
        panel.querySelector('#grid-visible').addEventListener('change', (e) => {
            this.visible = e.target.checked;
            if (this.editor && this.editor.grid) {
                this.editor.grid.visible = this.visible;
            }
        });

        panel.querySelector('#grid-size').addEventListener('input', (e) => {
            this.size = parseInt(e.target.value);
            if (this.editor && this.editor.createGrid) {
                this.editor.createGrid(this.size, this.divisions, 0x888888, 0xdddddd);
            }
        });

        panel.querySelector('#grid-divisions').addEventListener('input', (e) => {
            this.divisions = parseInt(e.target.value);
            if (this.editor && this.editor.createGrid) {
                this.editor.createGrid(this.size, this.divisions, 0x888888, 0xdddddd);
            }
        });

        panel.querySelector('#grid-snap').addEventListener('change', (e) => {
            this.snapEnabled = e.target.checked;
            console.log('Snap:', this.snapEnabled ? 'activado' : 'desactivado');
        });

        panel.querySelector('#grid-cellsize').addEventListener('change', (e) => {
            this.cellSize = parseFloat(e.target.value);
            console.log('Cell size:', this.cellSize);
        });

        return panel;
    }
}