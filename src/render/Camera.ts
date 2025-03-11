import { mat4 } from "gl-matrix";
import { Rectangle } from "./type";

export class Camera {
  private device: GPUDevice;
  private buffer: GPUBuffer;
  public readonly bindGroup: GPUBindGroup;
  public readonly bindGroupLayout: GPUBindGroupLayout;
  public noZoom = false;
  public noPan = false;
  public speed = 12;

  private scale = 1;
  private translation: [number, number] = [0, 0];

  private data: Float32Array = new Float32Array(16 + 16 + 16); // view & projection matrices & scale

  private screenSize: [number, number];

  constructor(
    device: GPUDevice,
    screenSize: [number, number],
    left = -screenSize[0] / 2,
    right = screenSize[0] / 2,
    bottom = screenSize[1] / 2,
    top = -screenSize[1] / 2,
    near = 0,
    far = 1000
  ) {
    this.device = device;
    this.screenSize = screenSize;

    this.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });
    const ortho = mat4.create();
    mat4.orthoZO(ortho, left, right, bottom, top, near, far);
    this.buffer = device.createBuffer({
      size: this.data.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
    this.data.set(ortho, 16);
    this.data.set(mat4.identity(mat4.create()));
    this.data.set([this.scale], 32);
    device.queue.writeBuffer(this.buffer, 0, this.data);
    this.bindGroup = device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.buffer },
        },
      ],
    });

    document.body.addEventListener("wheel", (e) => {
      if (this.noZoom) return;
      let zoom = e.deltaY === 0 ? 0 : e.deltaY > 0 ? 1 : -1;
      zoom = zoom * 0.125 + this.zoom;
      if (zoom < 0.0625) {
        zoom = 0.0625;
      }
      if (zoom > 4) {
        zoom = 4;
      }
      this.zoom = zoom;
    });
  }

  public update(inputs: Record<string, boolean>, worldMultiplier = 1) {
    if (!this.noPan) {
      const position: [number, number] = [
        this.translation[0],
        this.translation[1],
      ];
      const rect = this.rect;
      const xBounds = (this.screenSize[0] / 2) * worldMultiplier;
      const yBounds = (this.screenSize[1] / 2) * worldMultiplier;
      if (inputs["w"]) {
        position[1] -= this.speed * this.zoom;
      }
      if (inputs["a"]) {
        position[0] -= this.speed * this.zoom;
      }
      if (inputs["s"]) {
        position[1] += this.speed * this.zoom;
      }
      if (inputs["d"]) {
        position[0] += this.speed * this.zoom;
      }

      if (rect.x <= -xBounds) {
        position[0] += -rect.x - xBounds;
      }
      if (rect.y <= -yBounds) {
        position[1] += -rect.y - yBounds;
      }
      if (rect.x >= xBounds - this.rect.w) {
        position[0] -= rect.x + rect.w - xBounds;
      }
      if (rect.y >= yBounds - this.rect.h) {
        position[1] -= rect.y + rect.h - yBounds;
      }
      this.position = position;
    }
  }

  public get rect(): Rectangle {
    const zoom = this.noZoom ? 1 : this.zoom;
    return {
      x: this.position[0] - (this.size[0] / 2) * zoom,
      y: this.position[1] - (this.size[1] / 2) * zoom,
      w: this.size[0] * zoom,
      h: this.size[1] * zoom,
    };
  }

  public get size(): [number, number] {
    return this.screenSize;
  }

  public set zoom(z: number) {
    this.scale = z;
    this.setViewMatrix();
  }

  public get zoom(): number {
    return this.scale;
  }

  public set position(p: [number, number]) {
    this.translation[0] = p[0];
    this.translation[1] = p[1];
    this.setViewMatrix();
  }

  public get position(): [number, number] {
    return this.translation;
  }

  private setViewMatrix() {
    const scale = this.noZoom ? 1 : this.scale;
    const view = mat4.create();
    mat4.translate(view, view, [this.translation[0], this.translation[1], 0]);
    mat4.scale(view, view, [scale, scale, 1]);
    mat4.invert(view, view);
    this.data.set(view);
    this.data.set([this.scale], 32);
    this.device.queue.writeBuffer(this.buffer, 0, this.data);
  }
}
