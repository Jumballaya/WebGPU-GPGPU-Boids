import { SimUniforms } from "./simulation/SimUniforms";

export class BoidsUI {
  private uniforms: SimUniforms;
  private canvas: HTMLCanvasElement;

  private container: HTMLDivElement;

  constructor(uniforms: SimUniforms, canvas: HTMLCanvasElement) {
    this.uniforms = uniforms;
    this.canvas = canvas;

    this.container = document.createElement("div");
    this.container.classList.add("boids-app-container");
    this.container.innerHTML = UI_MARKUP;
    this.container.querySelector("#canvas")!.appendChild(this.canvas);
    this.setupListeners();
    document.body.appendChild(this.container);
  }

  private setupListeners() {
    const strength = {
      alignment: this.container.querySelector(
        "#strength-alignment"
      ) as HTMLInputElement,
      cohesion: this.container.querySelector(
        "#strength-cohesion"
      ) as HTMLInputElement,
      separation: this.container.querySelector(
        "#strength-separation"
      ) as HTMLInputElement,
    };
    const radius = {
      alignment: this.container.querySelector(
        "#radius-alignment"
      ) as HTMLInputElement,
      cohesion: this.container.querySelector(
        "#radius-cohesion"
      ) as HTMLInputElement,
      separation: this.container.querySelector(
        "#radius-separation"
      ) as HTMLInputElement,
    };

    strength.alignment.addEventListener("change", () => {
      this.uniforms.alignmentWeight = parseFloat(strength.alignment.value);
    });
    strength.cohesion.addEventListener("change", () => {
      this.uniforms.cohesionWeight = parseFloat(strength.cohesion.value);
    });
    strength.separation.addEventListener("change", () => {
      this.uniforms.separationWeight = parseFloat(strength.separation.value);
    });

    radius.alignment.addEventListener("change", () => {
      this.uniforms.alignmentDistance = parseFloat(radius.alignment.value);
    });
    radius.cohesion.addEventListener("change", () => {
      this.uniforms.cohesionDistance = parseFloat(radius.cohesion.value);
    });
    radius.separation.addEventListener("change", () => {
      this.uniforms.separationDistance = parseFloat(radius.separation.value);
    });
  }
}

const UI_MARKUP = `
<div class="boids-control-panel">
  <h2>Boids</h2>
  <hr />
  <div class="boids-control-panel-section">
    <h3>Stage Strength</h3>
    <label>
      <h4>Alignment</h4>
      <input id="strength-alignment" type="number" value=1 step=1 />
    </label>
    <label>
      <h4>Cohesion</h4>
      <input id="strength-cohesion" type="number" value=1 step=1 />
    </label>
    <label>
      <h4>Separation</h4>
      <input id="strength-separation" type="number" value=1 step=1 />
    </label>
  </div>
  <hr />
  <div class="boids-control-panel-section">
    <h3>Flock Radius</h3>
    <label>
      <h4>Alignment</h4>
      <input id="radius-alignment" type="number" value=50 step=1 />
    </label>
    <label>
      <h4>Cohesion</h4>
      <input id="radius-cohesion" type="number" value=50 step=1 />
    </label>
    <label>
      <h4>Separation</h4>
      <input id="radius-separation" type="number" value=17 step=1 />
    </label>
  </div>
  <hr />
</div>
<div class="boids-display" id="canvas">
</div>
`;
