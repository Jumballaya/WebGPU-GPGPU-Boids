import "./style.css";
import { initialize_canvas } from "./render/canvas";
import { BoidsApp } from "./BoidsApp";

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
  const loop = async () => {
    const curTime = performance.now();
    const deltaTime = curTime - time;
    time = curTime;
    await app.update(deltaTime);
    app.render(deltaTime);
    requestAnimationFrame(loop);
  };
  loop();
}
main();
