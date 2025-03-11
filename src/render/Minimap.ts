import BufferWrap from "buffwrap";
import { Camera } from "./Camera";
import { LineRenderer } from "./LineRenderer";
import { PointRenderer } from "./PointRenderer";
import type { BoidStruct } from "../simulation/types";

export class Minimap {
  private lineRenderer: LineRenderer;
  private pointRenderer: PointRenderer;

  private position: [number, number] = [0, 0];
  private size: [number, number] = [1024, 768];
  private worldMultiplier: number = 1;

  private zoom = 1;

  private rect: { x: number; y: number; w: number; h: number } = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  };

  constructor(
    lineRenderer: LineRenderer,
    pointRenderer: PointRenderer,
    worldMultiplier = 1
  ) {
    this.worldMultiplier = worldMultiplier;
    this.lineRenderer = lineRenderer;
    this.pointRenderer = pointRenderer;
    this.setRect();

    document.body.addEventListener("keydown", (e) => {
      if (e.key === "w") {
        this.position[1] -= 4 * this.zoom;
      }
      if (e.key === "a") {
        this.position[0] -= 4 * this.zoom;
      }
      if (e.key === "s") {
        this.position[1] += 4 * this.zoom;
      }
      if (e.key === "d") {
        this.position[0] += 4 * this.zoom;
      }
      this.setRect();
    });

    document.body.addEventListener("wheel", (e) => {
      const zoom = e.deltaY === 0 ? 0 : e.deltaY > 0 ? 1 : -1;
      this.zoom += zoom * 0.125;
      if (this.zoom < 0.0625) {
        this.zoom = 0.0625;
      }
      if (this.zoom > 4) {
        this.zoom = 4;
      }

      this.setRect();
    });
  }

  public update(camera: Camera, boids: BufferWrap<BoidStruct>) {
    camera.position = [
      this.position[0] * this.worldMultiplier,
      this.position[1] * this.worldMultiplier,
    ];
    camera.zoom = this.zoom;
    for (let i = 0; i < boids.buffer.byteLength / (16 * 4); i++) {
      const boid = boids.at(i);
      const pos = boid.position;
      const color = boid.color;
      this.pointRenderer.point(
        [pos[0] / 4, pos[1] / 4],
        [color[0], color[1], color[2]]
      );
    }
    this.lineRenderer.rect(
      this.rect.x + 1,
      this.rect.y + 1,
      this.rect.w - 1,
      this.rect.h - 1,
      [1, 1, 0]
    );
  }

  private setRect() {
    const w = (this.size[0] * this.zoom) / this.worldMultiplier;
    const h = (this.size[1] * this.zoom) / this.worldMultiplier;
    const x = this.position[0] - w / 2;
    const y = this.position[1] - h / 2;

    const xBounds = this.size[0] / 2;
    const yBounds = this.size[1] / 2;
    if (x < -xBounds) {
      this.position[0] += -x - xBounds;
    }
    if (y < -yBounds) {
      this.position[1] += -y - yBounds;
    }
    if (x > xBounds - this.rect.w) {
      this.position[0] -= x + w - xBounds;
    }
    if (y > yBounds - this.rect.h) {
      this.position[1] -= y + h - yBounds;
    }

    this.rect.x =
      this.position[0] -
      ((this.size[0] / 2) * this.zoom) / this.worldMultiplier;
    this.rect.y =
      this.position[1] -
      ((this.size[1] / 2) * this.zoom) / this.worldMultiplier;
    this.rect.w = (this.size[0] * this.zoom) / this.worldMultiplier;
    this.rect.h = (this.size[1] * this.zoom) / this.worldMultiplier;
  }
}
