export async function initialize_canvas(screenSize: [number, number]) {
  const canvas = document.createElement("canvas");
  canvas.width = screenSize[0];
  canvas.height = screenSize[1];

  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("Your browser does not support WebGPU");

  const gpu = navigator.gpu;
  const adapter = await gpu.requestAdapter();
  const device = await adapter?.requestDevice();

  if (!device || !adapter)
    throw new Error("Your browser does not support WebGPU");

  context.configure({
    device,
    format: gpu.getPreferredCanvasFormat(),
    alphaMode: "premultiplied",
  });

  return {
    canvas,
    context,
    gpu,
    adapter,
    device,
  };
}
