import lineShaderSource from "../shaders/line.render.wgsl?raw";
import { Camera } from "./Camera";

type LineVertex = {
  position: [number, number];
  color: [number, number, number];
};

export class LineRenderer {
  private device: GPUDevice;
  private pipeline: GPURenderPipeline;

  private maxLinesPerDraw = 1000;
  private vertexData: Float32Array;
  private vertexBuffer: GPUBuffer;
  private vertexStride = 5; // x, y, r, g, b
  private linesToDraw: Set<{
    from: [number, number];
    to: [number, number];
    color: [number, number, number];
  }> = new Set();

  constructor(device: GPUDevice, gpu: GPU, camera: Camera) {
    this.device = device;

    const lineShader = device.createShaderModule({
      code: lineShaderSource,
    });

    this.vertexData = new Float32Array(
      this.maxLinesPerDraw * this.vertexStride * 2
    );
    this.vertexBuffer = this.device.createBuffer({
      size: this.vertexData.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
    });

    this.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [camera.bindGroupLayout],
      }),

      vertex: {
        module: lineShader,
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
                format: "float32x2",
              },
            ],
          },
        ],
      },

      fragment: {
        module: lineShader,
        targets: [
          {
            format: gpu.getPreferredCanvasFormat(),
          },
        ],
      },

      primitive: {
        topology: "line-list",
      },
    });
  }

  public line(
    from: [number, number],
    to: [number, number],
    color: [number, number, number]
  ) {
    this.linesToDraw.add({ from, to, color });
  }

  public rect(
    x: number,
    y: number,
    w: number,
    h: number,
    color: [number, number, number]
  ) {
    // top
    this.line([x, y], [x + w, y], color);
    // right
    this.line([x + w, y], [x + w, y + h], color);
    // bottom
    this.line([x, y + h], [x + w, y + h], color);
    // left
    this.line([x, y], [x, y + h], color);
  }

  public draw(pass: GPURenderPassEncoder, camera: Camera) {
    if (this.linesToDraw.size === 0) return;

    const vertexCount = this.linesToDraw.size * 2; // 2 vertices per line
    this.vertexData.fill(0);

    let ptr = 0;
    for (const line of this.linesToDraw) {
      let offset = ptr * this.vertexStride * 2;

      this.vertexData[offset + 0] = line.from[0];
      this.vertexData[offset + 1] = line.from[1];
      this.vertexData[offset + 2] = line.color[0];
      this.vertexData[offset + 3] = line.color[1];
      this.vertexData[offset + 4] = line.color[2];

      this.vertexData[offset + 5] = line.to[0];
      this.vertexData[offset + 6] = line.to[1];
      this.vertexData[offset + 7] = line.color[0];
      this.vertexData[offset + 8] = line.color[1];
      this.vertexData[offset + 9] = line.color[2];

      ptr++;
    }
    this.device.queue.writeBuffer(this.vertexBuffer, 0, this.vertexData);

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, camera.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.draw(vertexCount);

    this.linesToDraw.clear();
  }
}
