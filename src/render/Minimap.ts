import BufferWrap from "buffwrap";
import { Camera } from "./Camera";
import { LineRenderer } from "./LineRenderer";
import { PointRenderer } from "./PointRenderer";
import type { BoidStruct } from "../simulation/types";

export class Minimap {
  private lineRenderer: LineRenderer;
  private pointRenderer: PointRenderer;
  private worldMultiplier: number = 1;

  constructor(
    lineRenderer: LineRenderer,
    pointRenderer: PointRenderer,
    worldMultiplier = 1
  ) {
    this.worldMultiplier = worldMultiplier;
    this.lineRenderer = lineRenderer;
    this.pointRenderer = pointRenderer;
  }

  public update(camera: Camera, boids: BufferWrap<BoidStruct>) {
    for (let i = 0; i < boids.buffer.byteLength / (16 * 4); i++) {
      const boid = boids.at(i);
      const pos = boid.position;
      const color = boid.color;
      this.pointRenderer.point(
        [pos[0] / this.worldMultiplier, pos[1] / this.worldMultiplier],
        [color[0], color[1], color[2]]
      );
    }
    const rect = camera.rect;
    this.lineRenderer.rect(
      rect.x / this.worldMultiplier + 1,
      rect.y / this.worldMultiplier + 1,
      rect.w / this.worldMultiplier - 1,
      rect.h / this.worldMultiplier - 1,
      [0.99609375, 0.640625, 0.5]
    );
  }
}
