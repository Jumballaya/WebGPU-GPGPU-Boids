/**
 *  struct SimUniforms {
 *    world_data: vec4f,      // [ world_size.x, world_size.y, deltaTime, _ ]
 *    sim_data: vec4f,        // [ alignment, cohesion, separation, _ ]
 *    view_distance: vec4f,   // [ alignment, cohesion, separation, _ ]
 * }
 *
 */

import BufferWrap from "buffwrap";

type UniformStruct = {
  worldData: [number, number, number, number]; // [ world_size.x, world_size.y, deltaTime, _ ]
  simData: [number, number, number, number]; // [ alignment, cohesion, separation, _ ]
  viewDistance: [number, number, number, number]; // [ alignment, cohesion, separation, _ ]
};

export class SimUniforms {
  private device: GPUDevice;
  private data: BufferWrap<UniformStruct>;

  public readonly bindGroupLayout: GPUBindGroupLayout;
  public readonly bindGroup: GPUBindGroup;

  private uniformBuffer: GPUBuffer;

  constructor(
    device: GPUDevice,
    worldSize: [number, number],
    viewDistance = 50
  ) {
    this.data = new BufferWrap<UniformStruct>({
      capacity: 1,
      struct: {
        worldData: 4,
        simData: 4,
        viewDistance: 4,
      },
      types: {
        worldData: Float32Array,
        simData: Float32Array,
        viewDistance: Float32Array,
      },
    });
    this.device = device;
    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "uniform",
          },
        },
      ],
    });
    this.uniformBuffer = this.device.createBuffer({
      size: this.data.buffer.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
    this.bindGroup = this.device.createBindGroup({
      label: "Boids Compute Uniforms",
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    });

    this.data.at(0).worldData = [worldSize[0], worldSize[1], 0, 0];
    this.data.at(0).simData = [1, 1, 1, 0];
    this.data.at(0).viewDistance = [
      viewDistance,
      viewDistance,
      viewDistance / 1.5,
      0,
    ];
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.data.buffer);
  }

  public set worldSize(ws: [number, number]) {
    const data = this.data.at(0).worldData;
    this.data.at(0).worldData = [ws[0], ws[1], data[2], 0];
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.data.buffer);
  }

  public set deltaTime(dt: number) {
    const data = this.data.at(0).worldData;
    this.data.at(0).worldData = [data[0], data[1], dt, 0];
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.data.buffer);
  }

  public set alignmentWeight(a: number) {
    const data = this.data.at(0).simData;
    this.data.at(0).simData = [a, data[1], data[2], 0];
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.data.buffer);
  }

  public get alignmentWeight() {
    return this.data.at(0).simData[0];
  }

  public set alignmentDistance(a: number) {
    const data = this.data.at(0).viewDistance;
    this.data.at(0).viewDistance = [a, data[1], data[2], 0];
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.data.buffer);
  }

  public get alignmentDistance(): number {
    return this.data.at(0).viewDistance[0];
  }

  public set cohesionWeight(c: number) {
    const data = this.data.at(0).simData;
    this.data.at(0).simData = [data[0], c, data[2], 0];
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.data.buffer);
  }

  public get cohesionWeight() {
    return this.data.at(0).simData[1];
  }

  public set cohesionDistance(c: number) {
    const data = this.data.at(0).viewDistance;
    this.data.at(0).viewDistance = [data[0], c, data[2], 0];
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.data.buffer);
  }

  public get cohesionDistance(): number {
    return this.data.at(0).viewDistance[1];
  }

  public set separationWeight(s: number) {
    const data = this.data.at(0).simData;
    this.data.at(0).simData = [data[0], data[1], s, 0];
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.data.buffer);
  }

  public get separationWeight() {
    return this.data.at(0).simData[2];
  }

  public set separationDistance(s: number) {
    const data = this.data.at(0).viewDistance;
    this.data.at(0).viewDistance = [data[0], data[1], s, 0];
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.data.buffer);
  }

  public get separationDistance(): number {
    return this.data.at(0).viewDistance[2];
  }
}
