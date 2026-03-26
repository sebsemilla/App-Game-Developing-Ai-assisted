// js/ui/CameraPanel.js
export class CameraPanel {
  constructor(editor, cameraManager, buttonId) {
    this.editor = editor;
    this.cameraManager = cameraManager;
    this.button = document.getElementById(buttonId);
    this.panel = null;
    this.visible = false;
    this.init();
  }

  init() {
    this.panel = document.createElement("div");
    this.panel.className = "camera-panel";
    this.panel.style.display = "none";
    this.panel.innerHTML = this.getHTML();
    document.body.appendChild(this.panel);
    this.positionPanel();
    window.addEventListener("resize", () => this.positionPanel());
    if (this.button) {
      this.button.addEventListener("click", () => this.toggle());
    }
    this.setupEventListeners();
  }

  getHTML() {
    return `
            <div class="panel-header">🎥 Cámaras</div>
            <div class="panel-content">
                <div class="camera-option">
                    <button id="add-camera-btn" class="option-btn">+ Nueva cámara</button>
                </div>
                <div id="camera-list" class="camera-list">
                    <div class="empty-message">No hay cámaras guardadas</div>
                </div>
            </div>
        `;
  }

  setupEventListeners() {
    const addBtn = this.panel.querySelector("#add-camera-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const name = prompt("Nombre de la cámara:");
        if (name) {
          const pos = this.editor.camera.position;
          this.cameraManager.createCamera(name, "perspective", {
            x: pos.x,
            y: pos.y,
            z: pos.z,
          });
          this.updateCameraList();
        }
      });
    }
  }

  updateCameraList() {
    const container = this.panel.querySelector("#camera-list");
    if (!container) return;
    const cameras = this.cameraManager.getCameras();
    if (cameras.length === 0) {
      container.innerHTML =
        '<div class="empty-message">No hay cámaras guardadas</div>';
      return;
    }
    container.innerHTML = "";
    cameras.forEach(([id, camera]) => {
      const item = document.createElement("div");
      item.className = "camera-item";
      item.innerHTML = `
                <span class="camera-name">${camera.userData.name || id}</span>
                <button class="use-camera-btn" data-id="${id}">Usar</button>
            `;
      const useBtn = item.querySelector(".use-camera-btn");
      useBtn.addEventListener("click", () => {
        this.cameraManager.switchCamera(id);
        this.updateIndicator();
      });
      container.appendChild(item);
    });
  }

  updateIndicator() {
    let indicator = document.getElementById("camera-indicator");
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.id = "camera-indicator";
      indicator.className = "camera-indicator";
      document.body.appendChild(indicator);
    }
    const currentCam = this.cameraManager.getCurrentCamera();
    const name = currentCam.userData?.name || "Cámara principal";
    indicator.textContent = `📷 ${name}`;
  }

  positionPanel() {
    if (!this.button || !this.panel) return;
    const rect = this.button.getBoundingClientRect();
    this.panel.style.top = rect.bottom + 5 + "px";
    this.panel.style.left = rect.left + "px";
  }

  toggle() {
    if (this.visible) {
      this.panel.style.display = "none";
    } else {
      this.updateCameraList();
      this.positionPanel();
      this.panel.style.display = "block";
    }
    this.visible = !this.visible;
  }

  hide() {
    this.panel.style.display = "none";
    this.visible = false;
  }
}
