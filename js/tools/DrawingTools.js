// js/tools/DrawingTools.js
export class DrawingTools {
    constructor(editor) {
        this.editor = editor;
        this.currentTool = 'select';
        this.isDrawing = false;
        this.startPoint = null;
        this.tempMesh = null;
    }

    activateTool(tool) {
        this.currentTool = tool;
        this.editor.renderer.domElement.style.cursor =
            tool === 'select' ? 'default' : 'crosshair';
    }

    // Dibujo 2D (en plano)
    startDrawing2D(event) {
        const point = this.getIntersectionWithPlane(event);
        if (!point) return;

        this.isDrawing = true;
        this.startPoint = point;

        // Crear preview según la herramienta
        switch (this.currentTool) {
            case 'rect2d':
                this.createRectPreview(point);
                break;
            case 'circle2d':
                this.createCirclePreview(point);
                break;
            case 'line':
                this.createLinePreview(point);
                break;
            case 'freehand':
                this.startFreehand(point);
                break;
        }
    }

    // Dibujo 3D
    startDrawing3D(event) {
        const point = this.getIntersectionWithGrid(event);
        if (!point) return;

        this.isDrawing = true;
        this.startPoint = point;

        switch (this.currentTool) {
            case 'cube':
                this.createCubePreview(point);
                break;
            case 'sphere':
                this.createSpherePreview(point);
                break;
            case 'cylinder':
                this.createCylinderPreview(point);
                break;
        }
    }

    createRectPreview(point) {
        // Preview para rectángulo 2D (usando LineSegments)
        const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(1, 0, 1),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0)
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        this.tempMesh = new THREE.Line(geometry, material);

        this.tempMesh.position.copy(point);
        this.editor.scene.add(this.tempMesh);
    }

    createCubePreview(point) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });

        this.tempMesh = new THREE.Mesh(geometry, material);
        this.tempMesh.position.copy(point);
        this.tempMesh.position.y += 0.5;
        this.editor.scene.add(this.tempMesh);
    }
}