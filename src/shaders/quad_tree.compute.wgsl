struct Boid {
  // [x, y, blank, blank]
  position: vec4f,

  // [x, y, blank, blank]
  velocity: vec4f,

  // [rotation, size, blank, blank]
  data: vec4f,

  color: vec4f,
}

struct QuadTree {
  aabb: vec4f,
  // [x, y, w, h]
  subdivisions: vec4u,
  // < sw, nw, ne, se >  --> id in quadtree array
  children: array<u32, 8>,
  // Boid children inside of the quad tree
}

@group(0) @binding(0)
var<storage, read> boids: array<Boid>;

@group(0) @binding(1)
var<storage, read_write> quadTrees: array<QuadTree>;