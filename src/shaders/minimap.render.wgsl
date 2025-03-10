struct Camera {
  viewMatrix: mat4x4f,
  projMatrix: mat4x4f,
  scale: f32,
}

@group(0) @binding(0)
var<uniform> camera: Camera;

@vertex
fn vert(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
  let vs = array(vec2f(- 1, - 1), vec2f(- 1, 1), vec2f(- 1, 1), vec2f(1, 1), vec2f(1, 1), vec2f(1, - 1), vec2f(1, - 1), vec2f(- 1, - 1));
  var pos = vec4f(vs[idx], 0, 1);
  pos = camera.viewMatrix * camera.projMatrix * pos;
  return pos;
}

@fragment
fn frag() -> @location(0) vec4f {
  return vec4f(1, 0, 0, 1);
}
