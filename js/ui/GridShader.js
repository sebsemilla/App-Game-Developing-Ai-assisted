// js/ui/GridShader.js - Versión corregida
import * as THREE from "three";

// #f49090 #0084ff

export class GridShader {
  constructor(editor) {
    this.editor = editor;
    this.gridMesh = null;
    this.uniforms = {
      gridSize: { value: 50.0 },
      cellSize: { value: 1.0 },
      lineThickness: { value: 0.05 },
      crossThickness: { value: 0.1 },
      gridColor: { value: new THREE.Color(0x888888) },
      crossColor: { value: new THREE.Color(0xff5500) },
    };
  }

  getFragmentShader() {
    return `
            uniform float gridSize;
            uniform float cellSize;
            uniform float lineThickness;
            uniform float crossThickness;
            uniform vec3 gridColor;
            uniform vec3 crossColor;
            varying vec2 vUv;

            void main() {
                // Convertir UV a coordenadas centradas en 0,0
                // uv va de 0 a 1, lo convertimos a -gridSize/2 a +gridSize/2
                float halfSize = gridSize / 2.0;
                float x = (vUv.x - 0.5) * gridSize;
                float z = (vUv.y - 0.5) * gridSize;
                
                // Líneas regulares (cuadrícula)
                float fx = fract((x + halfSize) / cellSize);
                float fz = fract((z + halfSize) / cellSize);
                float lineX = step(1.0 - lineThickness, fx) + step(fx, lineThickness);
                float lineZ = step(1.0 - lineThickness, fz) + step(fz, lineThickness);
                float isLine = max(lineX, lineZ);
                
                // CRUZ CENTRAL: SOLO en x=0 y z=0 (el centro real)
                float distToCenterX = abs(x);
                float distToCenterZ = abs(z);
                float isCenterX = step(0.0, crossThickness - distToCenterX);
                float isCenterZ = step(0.0, crossThickness - distToCenterZ);
                float isCross = max(isCenterX, isCenterZ);
                
                vec3 color;
                
                // PRIORIDAD: la cruz se dibuja sobre las líneas regulares
                if (isCross > 0.5) {
                    color = crossColor;
                } else if (isLine > 0.5) {
                    color = gridColor;
                } else {
                    discard;
                }
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
  }

  addToScene() {
    if (this.gridMesh) {
      this.editor.scene.remove(this.gridMesh);
      if (this.gridMesh.geometry) this.gridMesh.geometry.dispose();
      if (this.gridMesh.material) this.gridMesh.material.dispose();
    }

    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = 1.0;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
      fragmentShader: this.getFragmentShader(),
      transparent: true,
      side: THREE.DoubleSide,
    });

    this.gridMesh = new THREE.Mesh(geometry, material);
    this.gridMesh.rotation.x = -Math.PI / 2;
    this.gridMesh.position.y = -0.01;
    this.editor.scene.add(this.gridMesh);

    console.log("✅ GridShader: grid con cruz central añadido");
    console.log("   Centro del grid en (0,0)");
    console.log(
      "   Cruz color:",
      this.uniforms.crossColor.value.getHexString(),
    );
    console.log("   Cruz grosor:", this.uniforms.crossThickness.value);
  }

  update(params) {
    for (const [key, value] of Object.entries(params)) {
      if (this.uniforms[key]) {
        console.log(`Actualizando ${key}:`, value);

        if (key === "gridColor" || key === "crossColor") {
          if (typeof value === "string") {
            this.uniforms[key].value.set(value);
          } else if (value instanceof THREE.Color) {
            this.uniforms[key].value = value;
          }
        } else {
          this.uniforms[key].value = value;
        }
      }
    }

    if (this.gridMesh && this.gridMesh.material) {
      this.gridMesh.material.needsUpdate = true;
    }
  }
}
