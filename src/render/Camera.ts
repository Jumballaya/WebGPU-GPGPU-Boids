import { mat4 } from "gl-matrix";

export class Camera {
  private device: GPUDevice;
  private buffer: GPUBuffer;
  public readonly bindGroup: GPUBindGroup;
  public readonly bindGroupLayout: GPUBindGroupLayout;

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
  }

  public update(inputs: Record<string, boolean>) {}

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
    const view = mat4.create();
    mat4.translate(view, view, [this.translation[0], this.translation[1], 0]);
    mat4.scale(view, view, [this.scale, this.scale, 1]);
    mat4.invert(view, view);
    this.data.set(view);
    this.data.set([this.scale], 32);
    this.device.queue.writeBuffer(this.buffer, 0, this.data);
  }
}
