struct VertexIn {
  @location(0) position: vec4f,
  @location(1) uv: vec2f,
}

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@group(0) @binding(0)
var texSampler: sampler;

@group(0) @binding(1)
var tex: texture_2d<f32>;

@group(0) @binding(2)
var<uniform> model_matrix: mat4x4f;

@vertex
fn vert(vi: VertexIn) -> VertexOut {
  var vo: VertexOut;
  vo.position = model_matrix * vi.position;
  vo.uv = vec2f(vi.uv.x, 1 - vi.uv.y);
  return vo;
}

@fragment
fn frag(v: VertexOut) -> @location(0) vec4f {
  let color = textureSample(tex, texSampler, v.uv);
  return vec4f(color.rgb, 1);
}
