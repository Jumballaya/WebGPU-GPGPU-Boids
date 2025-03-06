import { mat4 } from "gl-matrix";

export class Camera {
  private device: GPUDevice;
  private buffer: GPUBuffer;
  public readonly bindGroup: GPUBindGroup;
  public readonly bindGroupLayout: GPUBindGroupLayout;

  private scale = 1;

  private data: Float32Array = new Float32Array(16 + 16); // view & projection matrices

  constructor(device: GPUDevice, screenSize: [number, number]) {
    this.device = device;

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
    mat4.orthoZO(
      ortho,
      -screenSize[0] / 2,
      screenSize[0] / 2,
      screenSize[1] / 2,
      -screenSize[1] / 2,
      0,
      1000
    );
    this.buffer = device.createBuffer({
      size: this.data.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
    this.data.set(ortho, 16);
    this.data.set(mat4.identity(mat4.create()));
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

  public set zoom(z: number) {
    this.scale = z;
    this.setViewMatrix();
  }

  public get zoom(): number {
    return this.scale;
  }

  private setViewMatrix() {
    const view = mat4.create();
    mat4.scale(view, view, [this.scale, this.scale, 1]);
    mat4.invert(view, view);
    this.data.set(view);
    this.device.queue.writeBuffer(this.buffer, 0, this.data);
  }
}
