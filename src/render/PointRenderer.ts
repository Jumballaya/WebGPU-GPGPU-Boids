import pointShaderSource from "../shaders/point.render.wgsl?raw";
import { Camera } from "./Camera";

export class PointRenderer {
  private device: GPUDevice;
  private pipeline: GPURenderPipeline;

  private maxPointsToDraw = 3000;
  private vertexData: Float32Array;
  private vertexBuffer: GPUBuffer;
  private vertexStride = 5; // x, y, r, g, b
  private pointsToDraw: Set<{
    position: [number, number];
    color: [number, number, number];
  }> = new Set();

  constructor(
    device: GPUDevice,
    textureFormat: GPUTextureFormat,
    cameraBGL: GPUBindGroupLayout
  ) {
    this.device = device;

    const pointShader = device.createShaderModule({
      code: pointShaderSource,
    });

    this.vertexData = new Float32Array(
      this.maxPointsToDraw * this.vertexStride
    );
    this.vertexBuffer = this.device.createBuffer({
      size: this.vertexData.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
    });

    this.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [cameraBGL],
      }),

      vertex: {
        module: pointShader,
        buffers: [
          {
            arrayStride: this.vertexStride * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x2",
              },
              {
                shaderLocation: 1,
                offset: 2 * Float32Array.BYTES_PER_ELEMENT,
                format: "float32x3",
              },
            ],
          },
        ],
      },

      fragment: {
        module: pointShader,
        targets: [
          {
            format: textureFormat,
          },
        ],
      },

      primitive: {
        topology: "point-list",
      },
    });
  }

  public point(position: [number, number], color: [number, number, number]) {
    this.pointsToDraw.add({ position, color });
  }

  public draw(pass: GPURenderPassEncoder, camera: Camera) {
    if (this.pointsToDraw.size === 0) return;

    const vertexCount = this.pointsToDraw.size;
    this.vertexData.fill(0);

    let ptr = 0;
    for (const point of this.pointsToDraw) {
      let offset = ptr * this.vertexStride;

      this.vertexData[offset + 0] = point.position[0];
      this.vertexData[offset + 1] = point.position[1];
      this.vertexData[offset + 2] = point.color[0];
      this.vertexData[offset + 3] = point.color[1];
      this.vertexData[offset + 4] = point.color[2];

      ptr++;
    }
    this.device.queue.writeBuffer(this.vertexBuffer, 0, this.vertexData);

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, camera.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.draw(vertexCount);

    this.pointsToDraw.clear();
  }
}
