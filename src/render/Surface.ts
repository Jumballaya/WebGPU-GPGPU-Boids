import { mat4 } from "gl-matrix";
import surfaceShaderSource from "../shaders/surface.render.wgsl?raw";
import { Camera } from "./Camera";

export class Surface {
  private size: [number, number];
  private texture: GPUTexture;
  private bindGroup: GPUBindGroup;
  private bindGroupLayout: GPUBindGroupLayout;

  private pipeline: GPURenderPipeline;
  private vertexBuffer: GPUBuffer;
  private uniformData: Float32Array;
  private uniformBuffer: GPUBuffer;

  public backgroundColor: GPUColor = {
    r: 0.2 * 0.75,
    g: 0.125 * 0.75,
    b: 0.15 * 0.75,
    a: 1,
  };

  constructor(device: GPUDevice, gpu: GPU, size: [number, number]) {
    this.size = size;

    const shader = device.createShaderModule({ code: surfaceShaderSource });
    this.texture = device.createTexture({
      size: [size[0], size[1]],
      dimension: "2d",
      format: gpu.getPreferredCanvasFormat(),
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    this.uniformData = new Float32Array(16); // model matrix
    mat4.identity(this.uniformData);
    mat4.scale(this.uniformData, this.uniformData, [0.25, 0.25, 1]); // ratio between this size : screen size
    mat4.translate(this.uniformData, this.uniformData, [2.9, 2.9, 1]); // (screen size : this size) - 1 - 0.9
    this.uniformBuffer = device.createBuffer({
      size: this.uniformData.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
    device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformData);

    this.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: "uniform",
          },
        },
      ],
    });

    this.bindGroup = device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: device.createSampler(),
        },
        {
          binding: 1,
          resource: this.texture.createView(),
        },
        {
          binding: 2,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    });

    const vertexData = new Float32Array([
      -1, -1, 0, 0, -1, 1, 0, 1, 1, 1, 1, 1, -1, -1, 0, 0, 1, 1, 1, 1, 1, -1, 1,
      0,
    ]);
    this.vertexBuffer = device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
    });
    device.queue.writeBuffer(this.vertexBuffer, 0, vertexData);

    this.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout],
      }),
      vertex: {
        module: shader,
        buffers: [
          {
            arrayStride: 16,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x2",
              },
              {
                shaderLocation: 1,
                offset: 8,
                format: "float32x2",
              },
            ],
          },
        ],
      },
      fragment: {
        module: shader,
        targets: [
          {
            format: gpu.getPreferredCanvasFormat(),
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
        frontFace: "ccw",
        cullMode: "none",
      },
    });
  }

  public getFormat(): GPUTextureFormat {
    return this.texture.format;
  }

  public begin(encoder: GPUCommandEncoder): GPURenderPassEncoder {
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.texture.createView(),
          clearValue: this.backgroundColor,
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setViewport(0, 0, this.size[0], this.size[1], 0, 1);

    return pass;
  }

  public draw(pass: GPURenderPassEncoder) {
    pass.setPipeline(this.pipeline);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(6);
  }
}
