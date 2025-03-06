struct Boid {
  // [x, y, blank, blank]
  position: vec4f,

  // [x, y, blank, blank]
  velocity: vec4f,

  // [rotation, size, blank, blank]
  data: vec4f,

  color: vec4f,
}

struct WorldData {
  world_size: vec2f,
  delta_time: f32,
  blank: f32,
}

struct StageData {
  alignment: f32,
  cohesion: f32,
  separation: f32,
  blank: f32,
}

struct SimUniforms {
  // [ world_size.x, world_size.y, deltaTime, _ ]
  world_data: WorldData,

  // [ alignment, cohesion, separation, _ ]
  sim_data: StageData,

  // [ alignment, cohesion, separation, _ ]
  view_distance: StageData,
}

@group(0) @binding(0)
var<storage, read_write> boids: array<Boid>;

@group(0) @binding(1)
var<storage, read_write> boids_forces: array<vec2f>;

@group(1) @binding(0)
var<uniform> uniforms: SimUniforms;

@compute @workgroup_size(1)
fn update(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  let world_size = uniforms.world_data.world_size;

  var vel: vec2f = boids[i].velocity.xy;
  vel += boids_forces[i] * uniforms.world_data.delta_time;
  vel = normalize(vel);
  vel = vel * 3;
  boids[i].velocity.x = vel.x;
  boids[i].velocity.y = vel.y;

  if (boids[i].velocity.y >= 0.0) {
    boids[i].data.x = atan(boids[i].velocity.x / boids[i].velocity.y);
  }
  else {
    boids[i].data.x = 3.141596 + atan(boids[i].velocity.x / boids[i].velocity.y);
  }

  boids[i].position.x += boids[i].velocity.x;
  boids[i].position.y += boids[i].velocity.y;

  let lower_x = - world_size.x / 2 - boids[i].data.x * 2;
  let upper_x = world_size.x / 2 + boids[i].data.x * 2;
  let lower_y = - world_size.y / 2 - boids[i].data.y * 2;
  let upper_y = world_size.y / 2 + boids[i].data.y * 2;
  if (boids[i].position.x < lower_x) {
    boids[i].position.x = upper_x;
  }

  if (boids[i].position.x > upper_x) {
    boids[i].position.x = lower_x;
  }

  if (boids[i].position.y < lower_y) {
    boids[i].position.y = upper_y;
  }

  if (boids[i].position.y > upper_y) {
    boids[i].position.y = lower_y;
  }

  boids_forces[i].x = 0;
  boids_forces[i].y = 0;
}

@compute @workgroup_size(1)
fn alignment(@builtin(global_invocation_id) id: vec3u) {
  let view_distance = uniforms.view_distance.alignment;

  let boid = boids[id.x];
  var average_velocity = vec2f(0, 0);
  var near_boids = 0.0;

  let boid_count: u32 = arrayLength(&boids);
  for (var i: u32 = 0; i < boid_count; i++) {
    if (id.x == i) {
      continue;
    }

    let other = boids[i];
    let dist = length(other.position.xy - boid.position.xy);
    if (dist <= view_distance) {
      average_velocity += other.velocity.xy;
      near_boids += 1.0;
    }
  }

  if (near_boids == 0.0) {
    average_velocity.x = 0;
    average_velocity.y = 0;
  }
  else {
    average_velocity = average_velocity / near_boids;
    average_velocity -= boid.velocity.xy;
  }

  boids_forces[id.x] += average_velocity * uniforms.sim_data.alignment;
}

@compute @workgroup_size(1)
fn cohesion(@builtin(global_invocation_id) id: vec3u) {
  let view_distance = uniforms.view_distance.cohesion;

  let boid = boids[id.x];
  var average_position = vec2f(0, 0);
  var near_boids = 0.0;

  let boid_count: u32 = arrayLength(&boids);
  for (var i: u32 = 0; i < boid_count; i++) {
    if (id.x == i) {
      continue;
    }

    let other = boids[i];
    let dist = length(other.position.xy - boid.position.xy);
    if (dist <= view_distance) {
      average_position += other.position.xy;
      near_boids += 1.0;
    }
  }

  if (near_boids == 0.0) {
    average_position.x = 0;
    average_position.y = 0;
  }
  else {
    average_position = average_position / near_boids;
    average_position -= boid.position.xy;
    average_position = normalize(average_position) * 2.0;
    average_position -= boid.velocity.xy;
  }

  boids_forces[id.x] += average_position * uniforms.sim_data.cohesion;
}

@compute @workgroup_size(1)
fn separation(@builtin(global_invocation_id) id: vec3u) {
  let view_distance = uniforms.view_distance.separation;

  let boid = boids[id.x];
  var steering = vec2f(0, 0);
  var near_boids = 0.0;

  let boid_count: u32 = arrayLength(&boids);
  for (var i: u32 = 0; i < boid_count; i++) {
    if (id.x == i) {
      continue;
    }

    let other = boids[i];
    let dist = length(other.position.xy - boid.position.xy);
    if (dist <= view_distance) {
      var diff = boid.position.xy - other.position.xy;
      if (dist != 0.0) {
        diff /= dist;
      }
      else {
        diff = vec2f(0, 0);
      }
      steering += diff;
      near_boids += 1.0;
    }
  }

  if (near_boids == 0.0) {
    steering.x = 0;
    steering.y = 0;
  }
  else {
    steering = steering / near_boids;
    steering = normalize(steering) * 4.0;
    steering -= boid.velocity.xy;
  }

  boids_forces[id.x] += steering * uniforms.sim_data.separation;
}

