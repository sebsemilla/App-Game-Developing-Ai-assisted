// js/ui/UIComponents.js
export class UIComponents {
  constructor(editor) {
    this.editor = editor;
    this.colorPicker = document.getElementById("color-picker");
  }

  getColor() {
    return this.colorPicker ? this.colorPicker.value : "#ff0000";
  }

  showMessage(message, duration = 3000) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "ui-message";
    msgDiv.textContent = message;
    msgDiv.style.position = "fixed";
    msgDiv.style.bottom = "20px";
    msgDiv.style.left = "50%";
    msgDiv.style.transform = "translateX(-50%)";
    msgDiv.style.backgroundColor = "rgba(0,0,0,0.7)";
    msgDiv.style.color = "white";
    msgDiv.style.padding = "8px 16px";
    msgDiv.style.borderRadius = "8px";
    msgDiv.style.zIndex = "3000";
    document.body.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), duration);
  }
}
