import boidShader from "./shaders/boid.render.wgsl?raw";
import { Camera } from "./Camera";

export class BoidRenderer {
  private pipeline: GPURenderPipeline;
  public instanceBuffer: GPUBuffer;
  private instanceCount = 0;
  private bindGroup: GPUBindGroup;

  private vertexBuffer: GPUBuffer;
  private indexBuffer: GPUBuffer;

  constructor(
    device: GPUDevice,
    gpu: GPU,
    camera: Camera,
    instanceCount = 1000
  ) {
    this.instanceCount = instanceCount;

    const shader = device.createShaderModule({
      label: "Boids Render Shader",
      code: boidShader,
    });

    this.instanceBuffer = device.createBuffer({
      label: "Boids Render Buffer",
      size: 4 * 4 * 4 * instanceCount,
      usage:
        GPUBufferUsage.VERTEX |
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(
      this.instanceBuffer,
      0,
      new Float32Array(4 * 4 * instanceCount)
    );

    const bindGroupLayout = device.createBindGroupLayout({
      label: "Boids Render BindGroupLayout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: "read-only-storage",
          },
        },
      ],
    });

    this.bindGroup = device.createBindGroup({
      label: "Boids Render BindGroup",
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.instanceBuffer },
        },
      ],
    });

    this.pipeline = device.createRenderPipeline({
      label: "Render Pipeline",
      layout: device.createPipelineLayout({
        label: "Render Pipeline Layout",
        bindGroupLayouts: [bindGroupLayout, camera.bindGroupLayout],
      }),
      vertex: {
        module: shader,
        buffers: [
          {
            arrayStride: 7 * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x2",
              },
              {
                shaderLocation: 1,
                offset: 2 * Float32Array.BYTES_PER_ELEMENT,
                format: "float32x2",
              },
              {
                shaderLocation: 2,
                offset: 4 * Float32Array.BYTES_PER_ELEMENT,
                format: "float32x3",
              },
            ],
          },
        ],
      },
      fragment: {
        module: shader,
        targets: [{ format: gpu.getPreferredCanvasFormat() }],
      },
    });

    const vertexData = new Float32Array([
      -0.75, -0.75, 0, 0, 1, 0, 0,

      0, 0.75, 0.5, 1, 0, 1, 0,

      0.75, -0.75, 1, 0, 0, 0, 1,
    ]);
    this.vertexBuffer = device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
    });
    device.queue.writeBuffer(this.vertexBuffer, 0, vertexData);

    const indexData = new Uint32Array([0, 1, 2]);
    this.indexBuffer = device.createBuffer({
      size: indexData.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX,
    });
    device.queue.writeBuffer(this.indexBuffer, 0, indexData);
  }

  public draw(pass: GPURenderPassEncoder, camera: Camera) {
    pass.setPipeline(this.pipeline);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setIndexBuffer(this.indexBuffer, "uint32");
    pass.setBindGroup(0, this.bindGroup);
    pass.setBindGroup(1, camera.bindGroup);
    pass.drawIndexed(3, this.instanceCount);
    pass.end();
  }
}
