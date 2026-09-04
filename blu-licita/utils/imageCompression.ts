type WebpOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

const DEFAULT_OPTIONS: Required<WebpOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82,
};

export type WebpImage = {
  base64: string;
  mimeType: "image/webp";
  extension: "webp";
  size: number;
};

export const convertDataUrlToWebp = async (
  dataUrl: string,
  options: WebpOptions = {},
): Promise<WebpImage> => {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const image = await loadImage(dataUrl);
  const scale = Math.min(
    1,
    settings.maxWidth / image.naturalWidth,
    settings.maxHeight / image.naturalHeight,
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem para envio.");
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error("Não foi possível converter a imagem para WebP.")),
      "image/webp",
      settings.quality,
    );
  });
  const base64 = await blobToBase64(blob);
  return {
    base64,
    mimeType: "image/webp",
    extension: "webp",
    size: blob.size,
  };
};

export const fileToWebpDataUrl = async (
  file: File,
  options?: WebpOptions,
) => {
  const dataUrl = await fileToDataUrl(file);
  const webp = await convertDataUrlToWebp(dataUrl, options);
  return `data:${webp.mimeType};base64,${webp.base64}`;
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."));
    image.src = src;
  });

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
