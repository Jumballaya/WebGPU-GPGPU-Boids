import "./style.css";
import { initialize_canvas } from "./render/canvas";
import { BoidsApp } from "./BoidsApp";
import { LineRenderer } from "./render/LineRenderer";
import { Camera } from "./render/Camera";
import { Surface } from "./render/Surface";

async function main() {
  const screenSize: [number, number] = [1024, 768];
  const webgpu = await initialize_canvas(screenSize);
  const app = new BoidsApp({
    ...webgpu,
    boidCount: 3000,
    screenSize,
    worldMultiplier: 4,
  });

  let time = performance.now();
  const loop = () => {
    const curTime = performance.now();
    const deltaTime = curTime - time;
    time = curTime;
    app.update(deltaTime);
    requestAnimationFrame(loop);
  };
  loop();
}
main();

async function demo() {
  const screenSize: [number, number] = [1024, 768];
  const webgpu = await initialize_canvas(screenSize);
  // const app = new BoidsApp({
  //   ...webgpu,
  //   boidCount: 3000,
  //   screenSize,
  //   worldMultiplier: 4,
  // });
  document.body.appendChild(webgpu.canvas);

  const camera = new Camera(webgpu.device, screenSize);
  const surface = new Surface(webgpu.device, webgpu.gpu, screenSize);
  const lineRenderer = new LineRenderer(
    webgpu.device,
    surface.getFormat(),
    camera
  );

  let time = performance.now();
  const loop = () => {
    const curTime = performance.now();
    const deltaTime = curTime - time;
    time = curTime;

    const encoder = webgpu.device.createCommandEncoder();

    const surfacePass = surface.begin(encoder);
    lineRenderer.rect(100, 100, 100, 100, [1, 1, 0]);
    lineRenderer.draw(surfacePass, camera);
    surfacePass.end();

    const drawPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: webgpu.context.getCurrentTexture().createView(),
          clearValue: { r: 0.2, g: 0.125, b: 0.15, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    surface.draw(drawPass);
    drawPass.end();

    const cmd = encoder.finish();
    webgpu.device.queue.submit([cmd]);

    //
    // app.update(deltaTime);
    //

    requestAnimationFrame(loop);
  };
  loop();
}
