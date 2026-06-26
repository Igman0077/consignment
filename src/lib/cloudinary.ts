import { createHash } from "crypto";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

function signCloudinaryParams(params: Record<string, string | number>): string {
  const secret = process.env.CLOUDINARY_API_SECRET!.trim();
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(toSign + secret).digest("hex");
}

export function isAllowedImageFile(file: File): boolean {
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) return false;
  if (file.type.startsWith("image/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext ? ALLOWED_EXTENSIONS.has(ext) : false;
}

function mimeForFile(file: File): string {
  if (file.type.startsWith("image/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
  };
  return (ext && map[ext]) || "image/jpeg";
}

export type CloudinaryUploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function uploadImageToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured()) {
    return { ok: false, error: "Cloudinary is not configured on the server." };
  }

  if (!isAllowedImageFile(file)) {
    return {
      ok: false,
      error: `"${file.name}" is not a supported image or is over 5 MB.`,
    };
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY!.trim();
  const folder = "consignment-items";
  const timestamp = Math.round(Date.now() / 1000);
  const signature = signCloudinaryParams({ folder, timestamp });

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = mimeForFile(file);
  const formData = new FormData();
  formData.append("file", `data:${mime};base64,${buffer.toString("base64")}`);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Cloudinary rejected the upload.";
    try {
      const data = (await response.json()) as { error?: { message?: string } };
      if (data.error?.message) message = data.error.message;
    } catch {
      const text = await response.text();
      if (text) message = text.slice(0, 200);
    }
    console.error("[Cloudinary] Upload failed:", message);
    return { ok: false, error: message };
  }

  const data = (await response.json()) as { secure_url?: string };
  if (!data.secure_url) {
    return { ok: false, error: "Cloudinary did not return an image URL." };
  }

  return { ok: true, url: data.secure_url };
}
