export type BoidStruct = {
  position: [number, number, number, number]; // [ x, y, _, _ ]
  velocity: [number, number, number, number]; // [ x, y, _, _ ]
  data: [number, number, number, number]; // [ rot, size, _, _ ]
  color: [number, number, number, number]; // [ r, g, b, a ]
};
