// js/ui/LightingPanel.js
import * as THREE from "three";

export class LightingPanel {
  constructor(editor, buttonId) {
    this.editor = editor;
    this.panel = null;
    this.visible = false;
    this.button = document.getElementById(buttonId);
    this.lights = []; // Array de objetos luz { helper, light, type, name }

    this.init();
    this.setupDefaultLight();
  }

  init() {
    this.panel = document.createElement("div");
    this.panel.className = "lighting-panel";
    this.panel.style.display = "none";
    this.panel.innerHTML = this.getHTML();
    document.body.appendChild(this.panel);

    // Listener para el botón de añadir luz
    this.panel.querySelector("#add-light-btn").addEventListener("click", () => {
      const typeSelect = this.panel.querySelector("#light-type-select");
      const type = typeSelect.value;
      const nameInput = this.panel.querySelector("#new-light-name");
      let name = nameInput.value.trim();
      if (!name) {
        name = `Luz ${this.lights.length + 1}`;
      }
      this.addLight(type, name);
      nameInput.value = ""; // Limpiar campo
    });

    this.positionPanel();
    window.addEventListener("resize", () => this.positionPanel());
  }

  getHTML() {
    return `
        <div class="panel-header">Iluminación</div>
        <div class="panel-content">
            <div style="margin-bottom: 10px;">
                <select id="light-type-select" style="width: 100%; padding: 5px; margin-bottom: 5px;">
                    <option value="ambient">Ambiental</option>
                    <option value="directional">Direccional</option>
                    <option value="point">Puntual</option>
                    <option value="spot">Foco</option>
                </select>
                <input type="text" id="new-light-name" placeholder="Nombre de la luz" style="width: 100%; padding: 5px; margin-bottom: 5px; box-sizing: border-box;">
                <button id="add-light-btn" style="width: 100%; padding: 5px;">+ Añadir luz</button>
            </div>
            <div class="lights-list" id="lights-list"></div>
        </div>
    `;
  }

  positionPanel() {
    if (!this.button || !this.panel) return;
    const rect = this.button.getBoundingClientRect();
    const panelHeight = this.panel.offsetHeight;
    const windowHeight = window.innerHeight;
    let top = rect.top;
    if (top + panelHeight > windowHeight) {
      top = Math.max(0, windowHeight - panelHeight);
    }
    this.panel.style.top = top + "px";
    this.panel.style.left = rect.right + 5 + "px";
  }

  show() {
    this.positionPanel();
    this.panel.style.display = "block";
    this.visible = true;
  }

  hide() {
    this.panel.style.display = "none";
    this.visible = false;
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  renderLightsList() {
    const container = document.getElementById("lights-list");
    if (!container) return;
    container.innerHTML = "";
    this.lights.forEach((lightObj, index) => {
      const item = document.createElement("div");
      item.className = "light-item";
      item.dataset.index = index;
      item.style.backgroundColor = this.getColorForType(lightObj.type);
      item.innerHTML = `
                <span>${lightObj.name}</span>
                <span class="light-type">${lightObj.type}</span>
            `;
      item.addEventListener("click", () => this.selectLight(lightObj));
      container.appendChild(item);
    });
  }

  addLight(type, name) {
    const color = 0xffffff;
    const intensity = 1;
    let light;

    switch (type) {
      case "ambient":
        light = new THREE.AmbientLight(color, intensity);
        break;
      case "directional":
        light = new THREE.DirectionalLight(color, intensity);
        light.position.set(5, 10, 5);
        light.target.position.set(0, 0, 0);
        this.editor.scene.add(light.target);
        break;
      case "point":
        light = new THREE.PointLight(color, intensity, 10);
        light.position.set(0, 5, 0);
        break;
      case "spot":
        light = new THREE.SpotLight(color, intensity);
        light.position.set(5, 10, 5);
        light.target.position.set(0, 0, 0);
        this.editor.scene.add(light.target);
        break;
      default:
        return;
    }

    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    this.editor.scene.add(light);

    const helper = this.createLightHelper(type);
    helper.position.copy(light.position);
    helper.userData.light = light;
    helper.userData.type = type;
    helper.userData.name = name;
    this.editor.scene.add(helper);

    // Registrar helper en el sistema de selección (Editor.objects)
    // Para que sea seleccionable, debe ser añadido con editor.addObject
    // Esto le asignará un ID y lo incluirá en editor.getAllObjects()
    const helperId = this.editor.addObject(helper);

    this.lights.push({ helper, light, type, name });
    this.renderLightsList();
  }

  getColorForType(type) {
    const colors = {
      ambient: "rgba(100,100,100,0.3)",
      directional: "rgba(255,200,100,0.3)",
      point: "rgba(255,150,150,0.3)",
      spot: "rgba(150,255,150,0.3)",
    };
    return colors[type] || "rgba(200,200,200,0.3)";
  }

  selectLight(lightObj) {
    // Seleccionar el helper visual (que es un Object3D)
    if (this.editor.selectedObject) {
      this.editor.selectedObject.material.emissive?.setHex(0x000000);
    }
    this.editor.selectedObject = lightObj.helper;
    lightObj.helper.material.emissive?.setHex(0x333333);
    // Mostrar propiedades en el panel (expandir)
    this.showLightProperties(lightObj);
  }

  showLightProperties(lightObj) {
    // Aquí mostraremos los controles para la luz seleccionada
    // Por ahora, solo un placeholder
    console.log("Mostrar propiedades de", lightObj.name);
  }

  setupDefaultLight() {
    // La luz direccional existente en la escena (la que crea Editor.js)
    const dirLight = this.editor.scene.children.find(
      (c) => c.type === "DirectionalLight",
    );
    if (dirLight) {
      this.addLightFromExisting(dirLight, "directional", "Luz direccional");
    }
  }

  addLightFromExisting(light, type, name) {
    // Crear un helper visual para la luz (por ejemplo, una esfera o un cono)
    const helper = this.createLightHelper(type);
    helper.position.copy(light.position);
    // Asociar helper y luz
    light.userData.helper = helper;
    helper.userData.light = light;
    helper.userData.type = type;
    helper.userData.name = name;
    this.editor.scene.add(helper);
    this.lights.push({ helper, light, type, name });
  }

  syncLights() {
    this.lights.forEach((item) => {
      // Las luces ambientales no tienen posición
      if (item.light.type !== "AmbientLight") {
        item.light.position.copy(item.helper.position);
        // Para luces direccionales y spot, el target podría necesitar actualizarse
        // Por ahora, mantenemos el target en el origen
      }
    });
  }

  createLightHelper(type) {
    let geometry, material;
    const color = 0xffaa00; // Color base del helper

    switch (type) {
      case "directional":
        geometry = new THREE.ConeGeometry(0.5, 1, 8);
        material = new THREE.MeshStandardMaterial({
          color: 0xffaa00,
          emissive: 0x442200,
        });
        break;
      case "point":
        geometry = new THREE.SphereGeometry(0.5, 16, 16);
        material = new THREE.MeshStandardMaterial({
          color: 0xff5500,
          emissive: 0x331100,
        });
        break;
      case "spot":
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
        material = new THREE.MeshStandardMaterial({
          color: 0x00ffaa,
          emissive: 0x004422,
        });
        break;
      case "ambient":
        geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        material = new THREE.MeshStandardMaterial({
          color: 0xaaaaff,
          emissive: 0x222244,
        });
        break;
      default:
        geometry = new THREE.SphereGeometry(0.5, 8, 8);
        material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x333333,
        });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    // Añadir userData para identificarlo como helper de luz
    mesh.userData.isLightHelper = true;
    mesh.userData.type = type;

    return mesh;
  }
}
