// js/ui/AssetsPanel.js
export class AssetsPanel {
  constructor(
    editor,
    textureManager,
    propertiesPanel,
    transformManager,
    buttonId,
  ) {
    this.editor = editor;
    this.textureManager = textureManager;
    this.propertiesPanel = propertiesPanel;
    this.transformManager = transformManager;
    this.button = document.getElementById(buttonId);
    this.panel = null;
    this.visible = false;
    this.currentObject = null;
    this.assets = {
      "favorite-textures": [],
      "objects-3d": [],
      sprites: [],
    };
    this.init();
  }

  init() {
    this.panel = document.createElement("div");
    this.panel.className = "assets-panel";
    this.panel.style.display = "none";
    this.panel.innerHTML = this.getHTML();
    document.body.appendChild(this.panel);
    this.positionPanel();
    window.addEventListener("resize", () => this.positionPanel());
    if (this.button) {
      this.button.addEventListener("click", () => this.toggle());
    }
  }

  getHTML() {
    return `
            <div class="assets-header">📁 Assets</div>
            <div class="assets-content">
                <div class="asset-section">
                    <h4>Texturas favoritas</h4>
                    <div id="favorite-textures-grid" class="asset-grid"></div>
                </div>
                <div class="asset-section">
                    <h4>Objetos 3D</h4>
                    <div id="objects-3d-grid" class="asset-grid"></div>
                </div>
                <div class="asset-section">
                    <h4>Sprites</h4>
                    <div id="sprites-grid" class="asset-grid"></div>
                </div>
            </div>
        `;
  }

  addAsset(category, id, name, iconUrl, onClick) {
    if (!this.assets[category]) return;
    const asset = { id, name, iconUrl, onClick };
    this.assets[category].push(asset);
    this.renderCategory(category);
  }

  renderCategory(category) {
    const container = this.panel.querySelector(`#${category}-grid`);
    if (!container) return;
    container.innerHTML = "";
    this.assets[category].forEach((asset) => {
      const item = document.createElement("div");
      item.className = "asset-item";
      item.innerHTML = `
          <div class="asset-icon">📦</div>
          <div class="asset-name">${asset.name}</div>
        `;
      // item.innerHTML = `
      //          <img src="${asset.iconUrl}" alt="${asset.name}" onerror="this.src='https://via.placeholder.com/70'">
      //          <div class="asset-name">${asset.name}</div>
      //      `;
      item.addEventListener("click", () => asset.onClick());
      container.appendChild(item);
    });
  }

  setCurrentObject(object) {
    this.currentObject = object;
  }

  positionPanel() {
    if (!this.button || !this.panel) return;
    const rect = this.button.getBoundingClientRect();
    this.panel.style.top = rect.bottom + 5 + "px";
    this.panel.style.left = rect.left + "px";
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
}
