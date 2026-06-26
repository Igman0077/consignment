import { createHash } from "crypto";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

function signCloudinaryParams(timestamp: number): string {
  const secret = process.env.CLOUDINARY_API_SECRET!;
  return createHash("sha1")
    .update(`timestamp=${timestamp}${secret}`)
    .digest("hex");
}

export async function uploadImageToCloudinary(file: File): Promise<string | null> {
  if (!isCloudinaryConfigured()) return null;
  if (!file.type.startsWith("image/")) return null;
  if (file.size > 5 * 1024 * 1024) return null;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY!.trim();
  const timestamp = Math.round(Date.now() / 1000);
  const signature = signCloudinaryParams(timestamp);

  const buffer = Buffer.from(await file.arrayBuffer());
  const formData = new FormData();
  formData.append("file", new Blob([buffer], { type: file.type }), file.name);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", "consignment-items");

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Cloudinary] Upload failed:", errorText);
    return null;
  }

  const data = (await response.json()) as { secure_url?: string };
  return data.secure_url ?? null;
}
