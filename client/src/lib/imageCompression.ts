const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 2400;
const MIN_QUALITY = 0.58;
const QUALITY_STEP = 0.08;

type CompressOptions = {
  maxBytes?: number;
  maxDimension?: number;
};

export type CompressedImage = {
  dataUrl: string;
  fileName: string;
  compressed: boolean;
  originalBytes: number;
  outputBytes: number;
};

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("이미지를 읽을 수 없습니다."));
    };
    reader.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 열 수 없습니다."));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error("이미지를 압축할 수 없습니다."));
      },
      type,
      quality
    );
  });
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function replaceExtension(fileName: string, ext: string) {
  const base = fileName.replace(/\.[^.]+$/, "");
  return `${base || "image"}.${ext}`;
}

export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<CompressedImage> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;

  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  if (
    file.size <= maxBytes &&
    ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  ) {
    return {
      dataUrl: await readBlobAsDataUrl(file),
      fileName: file.name,
      compressed: false,
      originalBytes: file.size,
      outputBytes: file.size,
    };
  }

  const image = await loadImage(file);
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지 압축을 준비할 수 없습니다.");
  context.drawImage(image, 0, 0, width, height);

  let outputType =
    file.type === "image/png" && file.size <= maxBytes * 1.5
      ? "image/png"
      : "image/jpeg";
  let outputExt = extensionForMime(outputType);
  let quality = outputType === "image/png" ? 0.92 : 0.86;
  let blob = await canvasToBlob(canvas, outputType, quality);

  while (
    blob.size > maxBytes &&
    outputType !== "image/png" &&
    quality > MIN_QUALITY
  ) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  let currentWidth = width;
  let currentHeight = height;
  while (blob.size > maxBytes && currentWidth > 640 && currentHeight > 640) {
    outputType = "image/jpeg";
    outputExt = "jpg";
    const smallerCanvas = document.createElement("canvas");
    const reduceScale = Math.sqrt(maxBytes / blob.size) * 0.9;
    currentWidth = Math.max(1, Math.round(currentWidth * reduceScale));
    currentHeight = Math.max(1, Math.round(currentHeight * reduceScale));
    smallerCanvas.width = currentWidth;
    smallerCanvas.height = currentHeight;
    const smallerContext = smallerCanvas.getContext("2d");
    if (!smallerContext) throw new Error("이미지 압축을 준비할 수 없습니다.");
    smallerContext.drawImage(image, 0, 0, currentWidth, currentHeight);
    blob = await canvasToBlob(smallerCanvas, outputType, 0.78);
  }

  return {
    dataUrl: await readBlobAsDataUrl(blob),
    fileName: replaceExtension(file.name, outputExt),
    compressed: true,
    originalBytes: file.size,
    outputBytes: blob.size,
  };
}
