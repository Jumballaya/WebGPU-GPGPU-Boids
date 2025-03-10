import minimapShader from "../shaders/minimap.render.wgsl?raw";
import { Camera } from "./Camera";
import { LineRenderer } from "./LineRenderer";

export class MinimapRenderer {
  private device: GPUDevice;
  private lineRenderer: LineRenderer;

  private position = [0, 0];
  private size = [1024, 768];

  private zoom = 1;

  private rect: { x: number; y: number; w: number; h: number } = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  };

  constructor(device: GPUDevice, gpu: GPU, camera: Camera) {
    this.device = device;
    this.lineRenderer = new LineRenderer(this.device, gpu, camera);

    document.body.addEventListener("keydown", (e) => {
      if (e.key === "w") {
        this.position[1] -= 10;
      }
      if (e.key === "a") {
        this.position[0] -= 10;
      }
      if (e.key === "s") {
        this.position[1] += 10;
      }
      if (e.key === "d") {
        this.position[0] += 10;
      }
      this.setRect();
    });

    document.body.addEventListener("wheel", (e) => {
      const zoom = e.deltaY === 0 ? 0 : e.deltaY > 0 ? 1 : -1;
      this.zoom += zoom * 0.125;
      if (this.zoom < 0.0625) {
        this.zoom = 0.0625;
      }
      if (this.zoom > 4) {
        this.zoom = 4;
      }

      this.setRect();
    });
  }

  public draw(pass: GPURenderPassEncoder, camera: Camera) {
    // console.log(this.zoom, [this.rect.x, this.rect.y]);
    this.lineRenderer.rect(
      this.rect.x,
      this.rect.y,
      this.rect.w,
      this.rect.h,
      [1, 1, 0]
    );

    this.rect.x = this.position[0] - ((this.size[0] / 2) * this.zoom) / 4;
    this.rect.y = this.position[1] - ((this.size[1] / 2) * this.zoom) / 4;
    this.rect.w = (this.size[0] * this.zoom) / 4;
    this.rect.h = (this.size[1] * this.zoom) / 4;

    this.lineRenderer.draw(pass, camera);
  }

  private setRect() {
    const xPos = this.position[0] - this.rect.w / 2;
    const yPos = this.position[1] - this.rect.h / 2;
    if (xPos < -512) {
      this.position[0] += -xPos - 512;
    }
    if (yPos < -384) {
      this.position[1] += -yPos - 384;
    }
    if (xPos > 512 - this.rect.w) {
      this.position[0] -= xPos + this.rect.w - 512;
    }
    if (yPos > 384 - this.rect.h) {
      this.position[1] -= yPos + this.rect.h - 384;
    }

    this.rect.x = this.position[0] - ((this.size[0] / 2) * this.zoom) / 4;
    this.rect.y = this.position[1] - ((this.size[1] / 2) * this.zoom) / 4;
    this.rect.w = (this.size[0] * this.zoom) / 4;
    this.rect.h = (this.size[1] * this.zoom) / 4;
  }
}
