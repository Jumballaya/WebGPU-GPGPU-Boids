import "./style.css";
import { BoidRenderer } from "./BoidRenderer";
import { Camera } from "./Camera";
import { BoidSimulation } from "./BoidSimulation";
import { SimUniforms } from "./SimUniforms";
import { BoidsUI } from "./BoidsUI";

//
//                    Renderer
//        BoidSim  ------|------  BoidRenderer
//           |                          |
//           |                          |
// Compute --|-- Buffers       Render --|-- Buffers
//                 |                          |
//                 |--------------------------|
//                     ---> Move Data --->
//
//
//    Renderer instantiates BoidSimulator & BoidRenderer
//    Renderer cycle:
//        1. Update BoidSimulator
//            1a. Run 3 flocking constraints shaders
//            1b. Run boid update shader, using the values from the previous 3 shaders
//        2. Update BoidRenderer
//            2a. Update renderer buffers
//        3. Draw with BoidRenderer & Camera
//

type BoidsAppConfig = {
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  gpu: GPU;
  adapter: GPUAdapter;
  device: GPUDevice;
  boidCount: number;
  screenSize: [number, number];
  worldMultiplier: number;
};

export class BoidsApp {
  private canvas: HTMLCanvasElement;
  private ctx: GPUCanvasContext;
  private gpu: GPU;
  private device: GPUDevice;
  private worldSize: [number, number];

  private camera: Camera;
  private renderer: BoidRenderer;
  private simulation: BoidSimulation;
  private uniforms: SimUniforms;
  private boidCount: number;
  private worldMultiplier: number;

  constructor(config: BoidsAppConfig) {
    this.canvas = config.canvas;
    this.ctx = config.context;
    this.gpu = config.gpu;
    this.device = config.device;
    this.boidCount = config.boidCount;
    this.worldMultiplier = config.worldMultiplier;
    this.camera = new Camera(this.device, config.screenSize);
    this.worldSize = [
      config.worldMultiplier * config.screenSize[0],
      config.worldMultiplier * config.screenSize[1],
    ];
    this.uniforms = new SimUniforms(this.device, this.worldSize, 50);
    this.renderer = new BoidRenderer(
      this.device,
      this.gpu,
      this.camera,
      this.boidCount
    );
    this.simulation = new BoidSimulation(
      this.device,
      this.worldSize,
      this.uniforms.bindGroupLayout,
      this.boidCount
    );

    new BoidsUI(this.uniforms, this.canvas);
    this.setupListeners();
  }

  public update(deltaTime: number) {
    const { uniforms, camera, simulation, renderer, device, ctx } = this;
    uniforms.deltaTime = deltaTime / 1000;
    const encoder = device.createCommandEncoder();

    // Compute Pass
    const computePass = encoder.beginComputePass();
    simulation.run(computePass, uniforms.bindGroup);
    computePass.end();

    // Copy Data to renderer
    encoder.copyBufferToBuffer(
      simulation.boidsBuffer,
      0,
      renderer.instanceBuffer,
      0,
      simulation.boidsBuffer.size
    );

    // Render Pass
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: ctx.getCurrentTexture().createView(),
          clearValue: { r: 0.2, g: 0.125, b: 0.15, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderer.draw(renderPass, camera);

    const buffer = encoder.finish();
    device.queue.submit([buffer]);
  }

  private setupListeners() {
    const { canvas, camera, worldMultiplier } = this;
    canvas.addEventListener("wheel", (e) => {
      const zoom = e.deltaY === 0 ? 0 : e.deltaY > 0 ? 1 : -1;
      camera.zoom += zoom * 0.125;
      if (camera.zoom < 0.0625) {
        camera.zoom = 0.0625;
      }
      if (camera.zoom > worldMultiplier) {
        camera.zoom = worldMultiplier;
      }
    });
  }
}
