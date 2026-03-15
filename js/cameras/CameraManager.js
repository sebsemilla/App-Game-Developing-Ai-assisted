// js/cameras/CameraManager.js
export class CameraManager {
    constructor(editor) {
        this.editor = editor;
        this.cameras = new Map();
        this.activeCamera = editor.camera;
        this.cameraHelpers = [];
    }

    createCamera(name, type = 'perspective', position = { x: 0, y: 10, z: 20 }) {
        let camera;

        if (type === 'perspective') {
            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        } else {
            camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
        }

        camera.position.set(position.x, position.y, position.z);
        camera.lookAt(0, 0, 0);

        const cameraId = 'cam_' + Date.now();
        camera.userData = {
            id: cameraId,
            name: name,
            type: type
        };

        this.cameras.set(cameraId, camera);

        // Crear helper visual para la cámara
        const helper = new THREE.CameraHelper(camera);
        helper.userData = { cameraId: cameraId, isHelper: true };
        this.editor.scene.add(helper);
        this.cameraHelpers.push(helper);

        return cameraId;
    }

    switchCamera(cameraId) {
        const camera = this.cameras.get(cameraId);
        if (camera) {
            this.activeCamera = camera;

            // Actualizar controles para usar la nueva cámara
            this.editor.controls.object = camera;
        }
    }

    createCameraUI() {
        const panel = document.createElement('div');
        panel.className = 'camera-panel';
        panel.innerHTML = `
            <h4>Cámaras</h4>
            <button id="add-camera">➕ Nueva Cámara</button>
            <div id="camera-list"></div>
        `;

        panel.querySelector('#add-camera').addEventListener('click', () => {
            const name = prompt('Nombre de la cámara:');
            if (name) {
                this.createCamera(name);
                this.updateCameraList();
            }
        });

        return panel;
    }

    updateCameraList() {
        const list = document.getElementById('camera-list');
        if (!list) return;

        list.innerHTML = '';
        this.cameras.forEach((camera, id) => {
            const item = document.createElement('div');
            item.className = 'camera-item';
            item.innerHTML = `
                <span>${camera.userData.name}</span>
                <button class="use-camera" data-id="${id}">Usar</button>
            `;

            item.querySelector('.use-camera').addEventListener('click', () => {
                this.switchCamera(id);
            });

            list.appendChild(item);
        });
    }
}