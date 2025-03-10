import BufferWrap from "buffwrap";
import shaderSource from "../shaders/boids.compute.wgsl?raw";

type BoidStruct = {
  position: [number, number, number, number]; // [ x, y, _, _ ]
  velocity: [number, number, number, number]; // [ x, y, _, _ ]
  data: [number, number, number, number]; // [ rot, size, _, _ ]
  color: [number, number, number, number]; // [ r, g, b, a ]
};

export class BoidSimulation {
  private device: GPUDevice;
  private shader: GPUShaderModule;

  public boids: BufferWrap<BoidStruct>;
  private boidCount;

  private worldSize: [number, number];

  private bindGroupLayout: GPUBindGroupLayout;
  private bindGroup: GPUBindGroup;

  // Buffers
  public boidsBuffer: GPUBuffer;
  private forcesBuffer: GPUBuffer;

  // Pipelines
  private updatePipeline: GPUComputePipeline;
  private alignmentPipeline: GPUComputePipeline;
  private cohesionPipeline: GPUComputePipeline;
  private separationPipeline: GPUComputePipeline;

  constructor(
    device: GPUDevice,
    worldSize: [number, number],
    uniBGL: GPUBindGroupLayout,
    boidCount = 100
  ) {
    this.device = device;
    this.worldSize = worldSize;
    this.boidCount = boidCount;
    this.boids = new BufferWrap<BoidStruct>({
      capacity: boidCount,
      struct: {
        position: 4,
        velocity: 4,
        data: 4,
        color: 4,
      },
      types: {
        position: Float32Array,
        velocity: Float32Array,
        data: Float32Array,
        color: Float32Array,
      },
    });

    this.shader = device.createShaderModule({
      label: "Boids Compute Shader",
      code: shaderSource,
    });
    const buffers = this.createBuffers();
    this.boidsBuffer = buffers.boids;
    this.forcesBuffer = buffers.forces;

    const bindGroup = this.createBindGroup();
    this.bindGroupLayout = bindGroup.layout;
    this.bindGroup = bindGroup.bindGroup;

    const pipelines = this.createPipelines(uniBGL);
    this.updatePipeline = pipelines.update;
    this.alignmentPipeline = pipelines.alignment;
    this.cohesionPipeline = pipelines.cohesion;
    this.separationPipeline = pipelines.separation;

    this.generateRandomBoids();
  }

  public run(pass: GPUComputePassEncoder, uniBindGroup: GPUBindGroup) {
    // Alignment Phase
    pass.setPipeline(this.alignmentPipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setBindGroup(1, uniBindGroup);
    pass.dispatchWorkgroups(this.boidCount);

    // Cohesion Phase
    pass.setPipeline(this.cohesionPipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setBindGroup(1, uniBindGroup);
    pass.dispatchWorkgroups(this.boidCount);

    // Separation Phase
    pass.setPipeline(this.separationPipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setBindGroup(1, uniBindGroup);
    pass.dispatchWorkgroups(this.boidCount);

    // Final Update
    pass.setPipeline(this.updatePipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setBindGroup(1, uniBindGroup);
    pass.dispatchWorkgroups(this.boidCount);
  }

  private generateRandomBoids() {
    for (let i = 0; i < this.boidCount; i++) {
      const rand = Math.random() * Math.PI * 2;
      const dir: [number, number] = [Math.sin(rand), Math.cos(rand)];
      this.boids.at(i).position = [
        Math.random() * this.worldSize[0] - this.worldSize[0] / 2,
        Math.random() * this.worldSize[1] - this.worldSize[1] / 2,
        0,
        0,
      ];
      this.boids.at(i).velocity = [dir[0], dir[1], 0, 0];
      this.boids.at(i).data = [rand, 16, 0, 0];
      this.boids.at(i).color = [0.94, 0.015, 0.13, 1];
    }
    this.device.queue.writeBuffer(this.boidsBuffer, 0, this.boids.buffer);
  }

  private createBuffers() {
    const forces = this.device.createBuffer({
      label: "Boids Forces Compute Buffer",
      size: 2 * this.boidCount * Float32Array.BYTES_PER_ELEMENT,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    const boids = this.device.createBuffer({
      label: "Boids Compute Buffer",
      size: this.boids.buffer.byteLength,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    return { forces, boids };
  }

  private createBindGroup() {
    const layout = this.device.createBindGroupLayout({
      label: "Boids Compute BindGroupLayout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "storage",
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "storage",
          },
        },
      ],
    });

    const bindGroup = this.device.createBindGroup({
      label: "Boids Compute BindGroup",
      layout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.boidsBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.forcesBuffer },
        },
      ],
    });

    return { layout, bindGroup };
  }

  private createPipelines(uniBGL: GPUBindGroupLayout) {
    const update = this.device.createComputePipeline({
      label: "Update Boids Pipeline",
      layout: this.device.createPipelineLayout({
        label: "Update Boids Pipeline Layout",
        bindGroupLayouts: [this.bindGroupLayout, uniBGL],
      }),
      compute: {
        entryPoint: "update",
        module: this.shader,
      },
    });

    const alignment = this.device.createComputePipeline({
      label: "Boids Alignment Pipeline",
      layout: this.device.createPipelineLayout({
        label: "Boids Alignment Pipeline Layout",
        bindGroupLayouts: [this.bindGroupLayout, uniBGL],
      }),
      compute: {
        entryPoint: "alignment",
        module: this.shader,
      },
    });

    const cohesion = this.device.createComputePipeline({
      label: "Boids Cohesion Pipeline",
      layout: this.device.createPipelineLayout({
        label: "Boids Cohesion Pipeline Layout",
        bindGroupLayouts: [this.bindGroupLayout, uniBGL],
      }),
      compute: {
        entryPoint: "cohesion",
        module: this.shader,
      },
    });

    const separation = this.device.createComputePipeline({
      label: "Boids Separation Pipeline",
      layout: this.device.createPipelineLayout({
        label: "Boids Separation Pipeline Layout",
        bindGroupLayouts: [this.bindGroupLayout, uniBGL],
      }),
      compute: {
        entryPoint: "separation",
        module: this.shader,
      },
    });

    return { update, alignment, cohesion, separation };
  }
}
