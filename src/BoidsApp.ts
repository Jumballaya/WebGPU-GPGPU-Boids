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
import { Inputs } from "./Inputs";
import { vec2 } from "gl-matrix";
import { BoidStruct } from "./simulation/types";

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
  private screenSize: [number, number];

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

  private inputs: Inputs;
  private selectedBoid: BoidStruct | undefined;

  private ui: BoidsUI;

  constructor(config: BoidsAppConfig) {
    this.canvas = config.canvas;
    this.ctx = config.context;
    this.gpu = config.gpu;
    this.device = config.device;
    this.boidCount = config.boidCount;
    this.worldMultiplier = config.worldMultiplier;
    this.screenSize = config.screenSize;
    this.inputs = new Inputs(config.canvas);
    this.camera = new Camera(this.device, config.screenSize);
    this.minimapCamera = new Camera(this.device, config.screenSize);
    this.minimapCamera.zoom = 1;
    this.minimapCamera.noZoom = true;
    this.minimapCamera.noPan = true;
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
      this.camera.bindGroupLayout,
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

    this.ui = new BoidsUI(this.uniforms, this.canvas);
  }

  public async update(deltaTime: number) {
    const { camera, minimapCamera, simulation, minimap } = this;

    this.ui.update(this.selectedBoid);
    if (this.ui.needsUpdate) {
      this.device.queue.writeBuffer(
        this.simulation.boidsBuffer,
        0,
        this.simulation.boids.buffer
      );
    }
    await simulation.copyFromGPU();

    camera.update(this.inputs, deltaTime, this.worldMultiplier);
    minimapCamera.update(this.inputs, deltaTime, this.worldMultiplier);
    minimap.update(this.camera, simulation.boids);

    const camRect = this.camera.rect;
    const mouseWorldPos = vec2.fromValues(
      this.inputs.mousePosition[0],
      this.inputs.mousePosition[1]
    );
    vec2.sub(mouseWorldPos, mouseWorldPos, [
      this.camera.size[0] / 2,
      this.camera.size[1] / 2,
    ]);
    vec2.mul(mouseWorldPos, mouseWorldPos, [
      this.worldMultiplier,
      this.worldMultiplier,
    ]);
    vec2.div(mouseWorldPos, mouseWorldPos, [
      this.screenSize[0] * this.worldMultiplier,
      this.screenSize[1] * this.worldMultiplier,
    ]);

    const x = (mouseWorldPos[0] + 0.5) * camRect.w + camRect.x;
    const y = (mouseWorldPos[1] + 0.5) * camRect.h + camRect.y;
    vec2.set(mouseWorldPos, x, y);

    for (
      let i = 0;
      i < this.simulation.boids.buffer.byteLength / (16 * 4);
      i++
    ) {
      const boid = this.simulation.boids.at(i);
      const pos = boid.position;
      const distV = vec2.create();
      vec2.sub(distV, mouseWorldPos, [pos[0], pos[1]]);
      const dist = vec2.len(distV);
      if (dist < 10) {
        if (this.inputs.mousePressed()) {
          this.selectedBoid = boid;
        }
      }
    }
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
    renderPass.setViewport(0, 0, camera.size[0], camera.size[1], 0, 1);
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
