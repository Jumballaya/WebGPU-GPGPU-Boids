import { vec2 } from "gl-matrix";

type Keys = Record<string, boolean>;
type Mouse = {
  position: [number, number];
  previousPosition: [number, number];
  dragStart: [number, number];
  clicking: boolean;
  dragging: boolean;
  wheel: number;
};

export class Inputs {
  private keys: Keys = {};
  private mouse: Mouse = {
    position: [0, 0],
    previousPosition: [0, 0],
    dragStart: [0, 0],
    clicking: false,
    dragging: false,

    wheel: 16,
  };

  constructor(element: HTMLElement) {
    document.body.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
    });
    document.body.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });
    document.body.addEventListener("wheel", (e) => {
      this.mouse.wheel += e.deltaY === 0 ? 0 : e.deltaY > 0 ? 1 : -1;
      this.mouse.wheel = Math.min(64, Math.max(8, this.mouse.wheel));
    });
    element.addEventListener("mousemove", (e) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.x;
      const y = e.clientY - rect.y;

      this.mouse.previousPosition[0] = this.mouse.position[0];
      this.mouse.previousPosition[1] = this.mouse.position[1];
      this.mouse.position[0] = x;
      this.mouse.position[1] = y;
    });
    element.addEventListener("mousedown", () => {
      this.mouse.clicking = true;
      let dragStarted = false;
      const listener = (e: MouseEvent) => {
        if (!this.mouse.clicking) {
          this.mouse.dragging = false;
          element.removeEventListener("mousemove", listener);
        }
        if (!dragStarted) {
          dragStarted = true;
          this.mouse.dragging = true;
          this.mouse.dragStart[0] = this.mouse.position[0];
          this.mouse.dragStart[1] = this.mouse.position[1];
        }
      };
      element.addEventListener("mousemove", listener);
    });
    element.addEventListener("mouseup", () => {
      this.mouse.clicking = false;
    });
  }

  public keyIsPressed(k: string): boolean {
    return this.keys[k] ?? false;
  }

  public mousePressed(): boolean {
    return this.mouse.clicking;
  }

  public mouseDragging(): boolean {
    return this.mouse.dragging;
  }

  public get mouseWheel(): number {
    return this.mouse.wheel;
  }

  public get mousePosition(): [number, number] {
    return [this.mouse.position[0], this.mouse.position[1]];
  }

  public get mouseDelta(): [number, number] {
    const x = this.mouse.position[0] - this.mouse.previousPosition[0];
    const y = this.mouse.position[1] - this.mouse.previousPosition[1];
    return [x, y];
  }

  public get dragOffset(): [number, number] {
    const v = vec2.fromValues(
      this.mouse.position[0] - this.mouse.dragStart[0],
      this.mouse.position[1] - this.mouse.dragStart[1]
    );
    vec2.normalize(v, v);
    return [v[0], v[1]];
  }
}
