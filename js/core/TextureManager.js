// js/core/TextureManager.js
import * as THREE from "three";

export class TextureManager {
  constructor(editor) {
    this.editor = editor;
    this.loader = new THREE.TextureLoader();
  }

  loadTexture(url, material, mapName = "map", onComplete) {
    this.loader.load(
      url,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        material[mapName] = texture;
        material.needsUpdate = true;
        if (onComplete) onComplete(texture);
      },
      undefined,
      (err) => {
        console.error("Error loading texture:", err);
      },
    );
  }

  setRepeat(material, repeatX, repeatY, mapName = "map") {
    if (material[mapName]) {
      material[mapName].repeat.set(repeatX, repeatY);
      material[mapName].needsUpdate = true;
    }
  }
}
