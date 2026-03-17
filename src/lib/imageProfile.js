// src/lib/imageProfile.js

export function validateProfileImageFile(file) {
  if (!file) {
    return { ok: false, message: "No se ha seleccionado ningún archivo" };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return {
      ok: false,
      message: "Formato no válido. Usa JPG, PNG o WEBP.",
    };
  }

  const maxSizeBytes = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSizeBytes) {
    return {
      ok: false,
      message: "La imagen es demasiado grande. Máximo 10 MB.",
    };
  }

  return { ok: true };
}

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => resolve({ img, objectUrl });

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo cargar la imagen seleccionada"));
    };

    img.src = objectUrl;
  });
}

export function canvasToBlob(
  canvas,
  mimeType = "image/jpeg",
  quality = 0.85
) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo generar la imagen procesada"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

function blobToFile(blob, filename, mimeType) {
  return new File([blob], filename, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

async function buildSquareImageBlob(
  img,
  {
    size = 512,
    mimeType = "image/jpeg",
    quality = 0.85,
    background = "#ffffff",
  } = {}
) {
  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;

  if (!srcWidth || !srcHeight) {
    throw new Error("La imagen no tiene dimensiones válidas");
  }

  const squareSide = Math.min(srcWidth, srcHeight);
  const sx = Math.floor((srcWidth - squareSide) / 2);
  const sy = Math.floor((srcHeight - squareSide) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo procesar la imagen");
  }

  // útil para PNG transparentes exportados a JPEG
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);

  ctx.drawImage(
    img,
    sx,
    sy,
    squareSide,
    squareSide,
    0,
    0,
    size,
    size
  );

  return canvasToBlob(canvas, mimeType, quality);
}

export async function processProfileImage(
  file,
  {
    size = 512,
    mimeType = "image/jpeg",
    quality = 0.85,
    background = "#ffffff",
  } = {}
) {
  const validation = validateProfileImageFile(file);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const { img, objectUrl } = await loadImageFromFile(file);

  try {
    const blob = await buildSquareImageBlob(img, {
      size,
      mimeType,
      quality,
      background,
    });

    const extension = mimeType === "image/webp" ? "webp" : "jpg";
    const outputFile = blobToFile(
      blob,
      `profile-${size}.${extension}`,
      mimeType
    );

    const previewUrl = URL.createObjectURL(blob);

    return {
      blob,
      file: outputFile,
      previewUrl,
      width: size,
      height: size,
      originalWidth: img.naturalWidth || img.width,
      originalHeight: img.naturalHeight || img.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function processProfileImageSet(
  file,
  {
    normalSize = 512,
    thumbSize = 96,
    mimeType = "image/jpeg",
    normalQuality = 0.86,
    thumbQuality = 0.8,
    background = "#ffffff",
  } = {}
) {
  const validation = validateProfileImageFile(file);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const { img, objectUrl } = await loadImageFromFile(file);

  try {
    const normalBlob = await buildSquareImageBlob(img, {
      size: normalSize,
      mimeType,
      quality: normalQuality,
      background,
    });

    const thumbBlob = await buildSquareImageBlob(img, {
      size: thumbSize,
      mimeType,
      quality: thumbQuality,
      background,
    });

    const extension = mimeType === "image/webp" ? "webp" : "jpg";

    const normalFile = blobToFile(
      normalBlob,
      `profile-${normalSize}.${extension}`,
      mimeType
    );

    const thumbFile = blobToFile(
      thumbBlob,
      `profile-${thumbSize}.${extension}`,
      mimeType
    );

    const previewUrl = URL.createObjectURL(normalBlob);

    return {
      normalBlob,
      thumbBlob,
      normalFile,
      thumbFile,
      previewUrl,
      originalWidth: img.naturalWidth || img.width,
      originalHeight: img.naturalHeight || img.height,
      normalSize,
      thumbSize,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}