// js/ui/AICharacterPanel.js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class AICharacterPanel {
  constructor(editor) {
    this.editor = editor;
    this.panel = null;
    this.visible = false;
    this.previewScene = null;
    this.previewCamera = null;
    this.previewRenderer = null;
    this.previewModel = null;
    this.previewAnimationId = null;
    this.currentImageData = null;
    this.generatedModel = null;
    this.currentModifiers = null;
    this.init();
  }

  init() {
    this.panel = document.createElement("div");
    this.panel.className = "ai-character-panel";
    this.panel.style.display = "none";
    this.panel.innerHTML = this.getHTML();
    document.body.appendChild(this.panel);
    this.setupEventListeners();
    this.positionPanel();
    window.addEventListener("resize", () => this.positionPanel());
  }

  getHTML() {
    return `
            <div class="panel-header">
                <span>🤖 AI Character Creation</span>
                <button id="close-ai-panel" class="close-btn">×</button>
            </div>
            <div class="panel-content">
                <div class="section">
                    <div class="section-left">
                        <div class="upload-area" id="upload-area">
                            <input type="file" id="image-upload" accept="image/*" style="display: none;">
                            <div class="upload-placeholder">📸 Arrastra una imagen o haz clic</div>
                        </div>
                        <textarea id="prompt-input" rows="3" placeholder="Describe el personaje que deseas... (opcional)"></textarea>
                    </div>
                    <div class="section-right">
                        <img id="image-preview" style="display: none; max-width: 100%; max-height: 150px;">
                        <div class="button-group">
                            <button id="generate-btn" class="generate-btn">✨ Generar con IA</button>
                            <button id="parametric-btn" class="parametric-btn">🪄 Crear paramétrico</button>
                        </div>
                        <div id="progress-message" style="display: none; margin-top: 8px; color: #aaa;">Generando...</div>
                    </div>
                </div>
                <div class="section">
                    <div class="section-left">
                        <div class="modifiers">
                            <label>Estilo: <select id="mod-style"><option value="realista">Realista</option><option value="cartoon">Cartoon</option><option value="fantasy">Fantasía</option></select></label>
                            <label>Altura: <select id="mod-height"><option value="0.8">Pequeño</option><option value="1.0" selected>Normal</option><option value="1.2">Alto</option></select></label>
                            <label>Ancho: <select id="mod-width"><option value="0.8">Delgado</option><option value="1.0" selected>Normal</option><option value="1.2">Ancho</option></select></label>
                            <label>Color: <select id="mod-color"><option value="#ffaa88">Piel clara</option><option value="#ccaa88">Piel media</option><option value="#aa8866">Piel oscura</option><option value="#88aaff">Azul</option><option value="#88ffaa">Verde</option></select></label>
                        </div>
                        <button id="apply-modifiers-btn" class="apply-btn">🔄 Aplicar cambios</button>
                    </div>
                    <div class="section-right">
                        <div id="preview-3d-container" style="width: 100%; height: 200px; background: #1e2a36; border-radius: 8px; overflow: hidden;"></div>
                        <button id="add-to-scene-btn" class="add-btn" style="margin-top: 10px; width: 100%;">➕ Añadir a escena</button>
                    </div>
                </div>
            </div>
        `;
  }

  setupEventListeners() {
    const closeBtn = this.panel.querySelector("#close-ai-panel");
    closeBtn.addEventListener("click", () => this.hide());

    const uploadArea = this.panel.querySelector("#upload-area");
    const fileInput = this.panel.querySelector("#image-upload");
    uploadArea.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => this.handleImageUpload(e));

    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.classList.add("drag-over");
    });
    uploadArea.addEventListener("dragleave", () =>
      uploadArea.classList.remove("drag-over"),
    );
    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("drag-over");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) this.handleImageFile(file);
    });

    const generateBtn = this.panel.querySelector("#generate-btn");
    generateBtn.addEventListener("click", () => this.generateCharacter());

    const parametricBtn = this.panel.querySelector("#parametric-btn");
    parametricBtn.addEventListener("click", () =>
      this.createParametricCharacter(),
    );

    const applyBtn = this.panel.querySelector("#apply-modifiers-btn");
    applyBtn.addEventListener("click", () => this.applyModifiers());

    const addToSceneBtn = this.panel.querySelector("#add-to-scene-btn");
    addToSceneBtn.addEventListener("click", () => this.addCharacterToScene());
  }

  handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) this.handleImageFile(file);
  }

  handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = this.panel.querySelector("#image-preview");
      img.src = e.target.result;
      img.style.display = "block";
      const placeholder = this.panel.querySelector(".upload-placeholder");
      placeholder.style.display = "none";
      this.currentImageData = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async generateCharacter() {
    if (!this.currentImageData) {
      alert("Primero sube una imagen.");
      return;
    }

    const progressMsg = this.panel.querySelector("#progress-message");
    const generateBtn = this.panel.querySelector("#generate-btn");
    progressMsg.style.display = "block";
    generateBtn.disabled = true;

    try {
      const response = await fetch("http://localhost:3001/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: this.currentImageData,
          prompt: this.panel.querySelector("#prompt-input").value,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error en el servidor");

      const loader = new GLTFLoader();
      loader.load(
        data.url,
        (gltf) => {
          if (this.previewModel) this.previewScene.remove(this.previewModel);
          this.previewModel = gltf.scene;
          this.previewScene.add(this.previewModel);
          this.applyModifiers();
          this.generatedModel = { url: data.url, name: "AI_Character" };
        },
        undefined,
        (error) => {
          console.error("Error cargando GLB:", error);
          this.createParametricCharacter();
        },
      );

      progressMsg.style.display = "none";
      alert("¡Personaje generado con éxito!");
    } catch (error) {
      console.error("Error:", error);
      this.createParametricCharacter();
      alert(
        "No se pudo generar con IA. Se ha creado un personaje paramétrico.",
      );
      progressMsg.style.display = "none";
    } finally {
      generateBtn.disabled = false;
    }
  }

  createParametricCharacter() {
    if (this.previewModel) this.previewScene.remove(this.previewModel);
    const group = new THREE.Group();

    const torsoGeo = new THREE.BoxGeometry(0.8, 1.2, 0.6);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x88aaff });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.6;
    group.add(torso);

    const headGeo = new THREE.SphereGeometry(0.6, 32, 32);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc88 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.4;
    group.add(head);

    const armGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.9, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x88aaff });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.6, 1.1, 0);
    leftArm.rotation.z = 0.3;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.6, 1.1, 0);
    rightArm.rotation.z = -0.3;
    group.add(rightArm);

    const legGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.0, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x88aaff });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.3, 0.1, 0);
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.3, 0.1, 0);
    group.add(rightLeg);

    this.previewModel = group;
    this.previewScene.add(this.previewModel);
    this.applyModifiers();
    this.generatedModel = { name: "Parametric_Character" };
  }

  addCharacterToScene() {
    if (!this.previewModel) return;
    const clone = this.previewModel.clone();
    clone.position.set(0, 0.5, 0);
    clone.castShadow = true;
    clone.receiveShadow = true;
    clone.userData = {
      type: "ai_character",
      name: this.generatedModel?.name || "Parametric_Character",
      generated: !!this.generatedModel?.url,
      modifiers: this.currentModifiers,
    };
    this.editor.addObject(clone);
    this.hide();
  }

  positionPanel() {
    if (!this.panel) return;
    this.panel.style.left = "50%";
    this.panel.style.top = "50%";
    this.panel.style.transform = "translate(-50%, -50%)";
  }

  show() {
    this.panel.style.display = "block";
    this.visible = true;
    this.initPreview3D();
    this.positionPanel();
    this.applyModifiers();
    this.startPreviewAnimation();
  }

  hide() {
    this.panel.style.display = "none";
    this.visible = false;
    this.stopPreviewAnimation();
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  initPreview3D() {
    if (this.previewRenderer) return;
    const container = this.panel.querySelector("#preview-3d-container");
    if (!container) return;

    const createRenderer = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) {
        setTimeout(createRenderer, 50);
        return;
      }

      this.previewScene = new THREE.Scene();
      this.previewScene.background = new THREE.Color(0x1e2a36);

      this.previewCamera = new THREE.PerspectiveCamera(
        45,
        width / height,
        0.1,
        1000,
      );
      this.previewCamera.position.set(2, 2, 3);
      this.previewCamera.lookAt(0, 0, 0);

      this.previewRenderer = new THREE.WebGLRenderer({ antialias: true });
      this.previewRenderer.setSize(width, height);
      container.appendChild(this.previewRenderer.domElement);
      this.previewRenderer.domElement.style.width = "100%";
      this.previewRenderer.domElement.style.height = "100%";

      const ambientLight = new THREE.AmbientLight(0x404040);
      this.previewScene.add(ambientLight);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1);
      dirLight.position.set(1, 2, 1);
      this.previewScene.add(dirLight);
      const backLight = new THREE.DirectionalLight(0x88aaff, 0.5);
      backLight.position.set(-1, 1, -1);
      this.previewScene.add(backLight);

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0x88aaff });
      this.previewModel = new THREE.Mesh(geometry, material);
      this.previewScene.add(this.previewModel);

      const gridHelper = new THREE.GridHelper(3, 10, 0x888888, 0x444444);
      gridHelper.position.y = -0.6;
      this.previewScene.add(gridHelper);

      const resizeObserver = new ResizeObserver(() => {
        if (this.previewRenderer && container) {
          const newWidth = container.clientWidth;
          const newHeight = container.clientHeight;
          this.previewRenderer.setSize(newWidth, newHeight);
          this.previewCamera.aspect = newWidth / newHeight;
          this.previewCamera.updateProjectionMatrix();
        }
      });
      resizeObserver.observe(container);
      this.resizeObserver = resizeObserver;
    };
    createRenderer();
  }

  startPreviewAnimation() {
    if (this.previewAnimationId) return;
    const animate = () => {
      if (!this.visible) return;
      if (this.previewModel) {
        this.previewModel.rotation.y += 0.01;
        this.previewModel.rotation.x += 0.005;
      }
      if (this.previewRenderer) {
        this.previewRenderer.render(this.previewScene, this.previewCamera);
      }
      this.previewAnimationId = requestAnimationFrame(animate);
    };
    animate();
  }

  stopPreviewAnimation() {
    if (this.previewAnimationId) {
      cancelAnimationFrame(this.previewAnimationId);
      this.previewAnimationId = null;
    }
  }

  applyModifiers() {
    const height = parseFloat(this.panel.querySelector("#mod-height").value);
    const width = parseFloat(this.panel.querySelector("#mod-width").value);
    const color = this.panel.querySelector("#mod-color").value;

    if (this.previewModel) {
      this.previewModel.scale.set(width, height, width);
      this.previewModel.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.color.set(color);
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.color.set(color));
          }
        }
      });
    }
    this.currentModifiers = { height, width, color };
  }
}
