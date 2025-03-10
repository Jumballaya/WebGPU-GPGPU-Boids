struct VertexIn {
  @location(0) position: vec4f,
  @location(1) color: vec3f,
}

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
}

struct Camera {
  viewMatrix: mat4x4f,
  projMatrix: mat4x4f,
  scale: f32,
}

@group(0) @binding(0)
var<uniform> camera: Camera;

@vertex
fn vert(vi: VertexIn) -> VertexOut {
  var vo: VertexOut;
  vo.position = camera.viewMatrix * camera.projMatrix * vi.position;
  vo.color = vi.color;
  return vo;
}

@fragment
fn frag(v: VertexOut) -> @location(0) vec4f {
  return vec4f(v.color, 1);
}
