import "./style.css";
import { BoidRenderer } from "./render/BoidRenderer";
import { Camera } from "./render/Camera";
import { BoidSimulation } from "./simulation/BoidSimulation";
import { SimUniforms } from "./simulation/SimUniforms";
import { BoidsUI } from "./BoidsUI";
import { Minimap } from "./render/Minimap";
import { LineRenderer } from "./render/LineRenderer";
import { Surface } from "./render/Surface";
import { PointRenderer } from "./render/PointRenderer";

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
  private minimapCamera: Camera;

  private minimapSurface: Surface;
  private minimap: Minimap;

  private boidsRenderer: BoidRenderer;
  private lineRenderer: LineRenderer;
  private pointRenderer: PointRenderer;
  private simulation: BoidSimulation;
  private uniforms: SimUniforms;
  private boidCount: number;
  private worldMultiplier: number;

  private inputs: Record<string, boolean> = {};

  constructor(config: BoidsAppConfig) {
    this.canvas = config.canvas;
    this.ctx = config.context;
    this.gpu = config.gpu;
    this.device = config.device;
    this.boidCount = config.boidCount;
    this.worldMultiplier = config.worldMultiplier;
    this.camera = new Camera(this.device, config.screenSize);

    this.minimapCamera = new Camera(this.device, config.screenSize);
    this.minimapCamera.zoom = 1;
    this.camera.zoom = 4;
    this.minimapSurface = new Surface(this.device, this.gpu, [
      config.screenSize[0] / 4,
      config.screenSize[1] / 4,
    ]);

    this.worldSize = [
      config.worldMultiplier * config.screenSize[0],
      config.worldMultiplier * config.screenSize[1],
    ];
    this.uniforms = new SimUniforms(this.device, this.worldSize, 50);
    this.lineRenderer = new LineRenderer(
      this.device,
      this.gpu.getPreferredCanvasFormat(),
      this.minimapCamera.bindGroupLayout
    );
    this.pointRenderer = new PointRenderer(
      this.device,
      this.gpu.getPreferredCanvasFormat(),
      this.minimapCamera.bindGroupLayout
    );
    this.boidsRenderer = new BoidRenderer(
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
    this.minimap = new Minimap(
      this.lineRenderer,
      this.pointRenderer,
      this.worldMultiplier
    );

    new BoidsUI(this.uniforms, this.canvas);
  }

  public async update(deltaTime: number) {
    const { camera, simulation, minimap } = this;

    await simulation.copyFromGPU();
    camera.update(this.inputs);
    minimap.update(camera, simulation.boids);
  }

  public render(deltaTime: number) {
    const {
      uniforms,
      camera,
      minimapCamera,
      simulation,
      boidsRenderer,
      device,
      ctx,
    } = this;

    uniforms.deltaTime = deltaTime / 1000;
    const encoder = device.createCommandEncoder();

    // Compute Pass
    const computePass = encoder.beginComputePass();
    simulation.run(computePass, uniforms.bindGroup);
    computePass.end();
    encoder.copyBufferToBuffer(
      simulation.boidsBuffer,
      0,
      boidsRenderer.instanceBuffer,
      0,
      simulation.boidsBuffer.size
    );
    simulation.syncStaging(encoder);

    // Render Pass

    // Minimap Render to texture
    const mmCreationPass = this.minimapSurface.begin(encoder);
    this.lineRenderer.draw(mmCreationPass, minimapCamera);
    this.pointRenderer.draw(mmCreationPass, minimapCamera);
    mmCreationPass.end();

    // Boids Render
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
    boidsRenderer.draw(renderPass, camera);
    renderPass.end();

    // MiniMap Render to screen
    const mmRenderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: ctx.getCurrentTexture().createView(),
          clearValue: { r: 0.2, g: 0.125, b: 0.15, a: 1 },
          loadOp: "load",
          storeOp: "store",
        },
      ],
    });
    mmRenderPass.setViewport(0, 0, camera.size[0], camera.size[1], 0, 1);
    this.minimapSurface.draw(mmRenderPass);
    mmRenderPass.end();

    const buffer = encoder.finish();
    device.queue.submit([buffer]);
  }
}
