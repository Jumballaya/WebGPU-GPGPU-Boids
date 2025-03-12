import { SimUniforms } from "./simulation/SimUniforms";
import { BoidStruct } from "./simulation/types";

export class BoidsUI {
  private uniforms: SimUniforms;
  private canvas: HTMLCanvasElement;

  private container: HTMLDivElement;
  private selectedBoid: BoidStruct | undefined;
  private originalColor: [number, number, number, number] = [1, 1, 1, 1];

  private _needsUpdate = false;

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

  public update(selectedBoid: BoidStruct | undefined) {
    if (selectedBoid !== this.selectedBoid) {
      this.selectedBoid = selectedBoid;
      if (selectedBoid) {
        this.container
          .querySelector("#selected_tracker")!
          .removeAttribute("hidden");
        const boidColor = selectedBoid.color;
        const color = this.container.querySelector(
          "#selected_color"
        ) as HTMLInputElement;
        color.value =
          "#" +
          [boidColor[0], boidColor[1], boidColor[1]]
            .map((c) =>
              Math.floor(c * 256)
                .toString(16)
                .padStart(2, "0")
            )
            .join("");
      }
    }
    if (!this.selectedBoid) {
      this.container
        .querySelector("#selected_tracker")!
        .setAttribute("hidden", "true");
      return;
    }

    const x = Math.floor(this.selectedBoid.position[0]);
    const y = Math.floor(this.selectedBoid.position[1]);

    const position = this.container.querySelector(
      "#selected_position"
    ) as HTMLInputElement;

    position.innerText = `(${x}, ${y})`;
  }

  public get needsUpdate(): boolean {
    const needed = this._needsUpdate;
    this._needsUpdate = false;
    return needed;
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

    const color = this.container.querySelector(
      "#selected_color"
    ) as HTMLInputElement;

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

    color.addEventListener("change", () => {
      if (!this.selectedBoid) return;
      let val = color.value.replace("#", "");
      const col = [val.slice(0, 2), val.slice(2, 4), val.slice(4, 6)].map(
        (s) => parseInt(s, 16) / 256
      );
      this.selectedBoid.color = [col[0], col[1], col[2], 1];
      this._needsUpdate = true;
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
  <div id="selected_tracker" class="boids-control-panel-section" hidden=true>
    <h3>Selected</h3>
    <label>
      <h4>Position</h4>
      <span class="boids-selected-position" id="selected_position"></span>
    </label>
    <label>
      <h4>Color</h4>
      <input id="selected_color" type="color" value="#ffffff"/>
    </label>
  </div>
</div>
<div class="boids-display" id="canvas">
</div>
`;
