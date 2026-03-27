// js/ui/PanelManager.js
export class PanelManager {
  constructor() {
    this.panels = [];
  }

  register(panel) {
    this.panels.push(panel);
  }

  open(panelToOpen) {
    this.panels.forEach((panel) => {
      if (panel === panelToOpen) {
        if (panel.visible) {
          panel.hide();
        } else {
          panel.show();
        }
      } else {
        panel.hide();
      }
    });
  }

  closeAll() {
    this.panels.forEach((panel) => panel.hide());
  }
}
