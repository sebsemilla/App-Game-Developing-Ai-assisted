// js/ui/Tools2dPanel.js
export class Tools2DPanel {
  constructor(editor, inputHandler, buttonId) {
    this.editor = editor;
    this.inputHandler = inputHandler;
    this.button = document.getElementById(buttonId);
    this.panel = null;
    this.visible = false;
    this.init();
  }

  init() {
    this.panel = document.createElement("div");
    this.panel.className = "tools-2d-panel";
    this.panel.style.display = "none";
    this.panel.innerHTML = this.getHTML();
    document.body.appendChild(this.panel);
    this.positionPanel();
    window.addEventListener("resize", () => this.positionPanel());
    if (this.button) {
      this.button.addEventListener("click", () => this.toggle());
    }
    this.setupToolButtons();
  }

  getHTML() {
    return `
            <div class="panel-header">📐 Herramientas 2D</div>
            <div class="panel-content">
                <button class="tool-btn" data-tool="rect2d">📐 Rectángulo</button>
                <button class="tool-btn" data-tool="circle2d">⭕ Círculo</button>
                <button class="tool-btn" data-tool="line">📏 Línea</button>
                <button class="tool-btn" data-tool="freehand">✏️ Mano alzada</button>
            </div>
        `;
  }

  setupToolButtons() {
    const buttons = this.panel.querySelectorAll(".tool-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tool = btn.dataset.tool;
        console.log("🛠️ Herramienta 2D seleccionada:", tool);
        // Activar herramienta en modo 2D
        this.inputHandler.setTool(tool, "2d");
        this.updateActiveTool(tool);
        this.hide(); // Opcional: cerrar panel después de seleccionar
      });
    });
  }

  updateActiveTool(tool) {
    const buttons = this.panel.querySelectorAll(".tool-btn");
    buttons.forEach((btn) => {
      if (btn.dataset.tool === tool) btn.classList.add("active");
      else btn.classList.remove("active");
    });
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
