// js/ui/GridShader.js
import * as THREE from "three";

export class GridShader {
  constructor(editor) {
    this.editor = editor;
    this.gridMesh = null;
    this.uniforms = {
      gridSize: { value: 50.0 },
      cellSize: { value: 1.0 },
      lineThickness: { value: 0.05 },
      gridColor: { value: new THREE.Color(0x888888) },
      centerColor: { value: new THREE.Color(0xdddddd) },
    };
  }

  addToScene() {
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
      fragmentShader: `
                uniform float gridSize;
                uniform float cellSize;
                uniform float lineThickness;
                uniform vec3 gridColor;
                uniform vec3 centerColor;
                varying vec2 vUv;

                void main() {
                    float x = vUv.x * gridSize;
                    float z = vUv.y * gridSize;
                    float fx = fract(x / cellSize);
                    float fz = fract(z / cellSize);
                    float lineX = step(1.0 - lineThickness, fx) + step(fx, lineThickness);
                    float lineZ = step(1.0 - lineThickness, fz) + step(fz, lineThickness);
                    float isLine = max(lineX, lineZ);
                    vec3 color = gridColor;
                    if (abs(x) < 0.1 || abs(z) < 0.1) color = centerColor;
                    gl_FragColor = vec4(color, isLine);
                }
            `,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.gridMesh = new THREE.Mesh(geometry, material);
    this.gridMesh.rotation.x = -Math.PI / 2;
    this.gridMesh.position.y = -0.01;
    this.editor.scene.add(this.gridMesh);
  }

  update(params) {
    for (const [key, value] of Object.entries(params)) {
      if (this.uniforms[key]) {
        if (value instanceof THREE.Color) this.uniforms[key].value = value;
        else this.uniforms[key].value = value;
      }
    }
  }
}
