import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { isCloudinaryConfigured, uploadImageToCloudinary } from "./cloudinary";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function saveUploadedPhotosLocal(files: File[]): Promise<string[]> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const savedPaths: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size > 5 * 1024 * 1024) continue;

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
    savedPaths.push(`/uploads/${filename}`);
  }

  return savedPaths;
}

export async function saveUploadedPhotos(files: File[]): Promise<string[]> {
  if (isCloudinaryConfigured()) {
    const savedPaths: string[] = [];
    for (const file of files) {
      const url = await uploadImageToCloudinary(file);
      if (url) savedPaths.push(url);
    }
    return savedPaths;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Photo storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on Render."
    );
  }

  return saveUploadedPhotosLocal(files);
}

export function getUploadStorageMode(): "cloudinary" | "local" {
  return isCloudinaryConfigured() ? "cloudinary" : "local";
}
