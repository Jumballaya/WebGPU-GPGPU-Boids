struct Boid {
  // [x, y, blank, blank]
  position: vec4f,

  // [x, y, blank, blank]
  velocity: vec4f,

  // [rotation, size, blank, blank]
  data: vec4f,

  color: vec4f,
}

struct Camera {
  viewMatrix: mat4x4f,
  projMatrix: mat4x4f,
  zoom: f32,
}

struct VertexIn {
  @location(0) position: vec2f,
  @location(1) uv: vec2f,
  @location(2) bary: vec3f,
}

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) bary: vec3f,
  @location(2) color: vec3f,
}

@group(0) @binding(0)
var<storage, read> boids: array<Boid>;

@group(1) @binding(0)
var<uniform> camera: Camera;

@vertex
fn vert(vi: VertexIn, @builtin(instance_index) idx: u32) -> VertexOut {
  let boid = boids[idx];
  var vo: VertexOut;
  var modelMatrix = mat2x2f(boid.data.y, 0, 0, boid.data.y) * mat2x2f(cos(boid.data.x), - sin(boid.data.x), sin(boid.data.x), cos(boid.data.x));
  var pos = vec4f((modelMatrix * vi.position) + vec2f(boid.position.x, boid.position.y), 0, 1);
  vo.position = camera.projMatrix * camera.viewMatrix * pos;
  vo.uv = vi.uv;
  vo.bary = vi.bary;
  vo.color = boid.color.rgb;
  return vo;
}

@fragment
fn frag(vert: VertexOut) -> @location(0) vec4f {
  let boidColor = vert.color;
  let tint = vec3f(0.15, 0.16, 0.37);
  let lineWidth = 0.1;
  let color = vec3f(vert.uv.y);
  if (vert.bary.y > 0.6) {
    return vec4f(boidColor * tint, 1);
  }
  if (vert.bary.x < lineWidth || vert.bary.y < lineWidth || vert.bary.z < lineWidth) {
    return vec4f(boidColor * tint, 1);
  }
  return vec4f(boidColor, 1);
}
