import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  isAllowedImageFile,
  isCloudinaryConfigured,
  uploadImageToCloudinary,
} from "./cloudinary";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export type UploadResult = {
  paths: string[];
  errors: string[];
};

async function saveUploadedPhotosLocal(files: File[]): Promise<UploadResult> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const paths: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (!isAllowedImageFile(file)) {
      errors.push(`"${file.name}" is not a supported image or is over 5 MB.`);
      continue;
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
    paths.push(`/uploads/${filename}`);
  }

  return { paths, errors };
}

export async function saveUploadedPhotos(files: File[]): Promise<UploadResult> {
  if (isCloudinaryConfigured()) {
    const paths: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const result = await uploadImageToCloudinary(file);
      if (result.ok) {
        paths.push(result.url);
      } else {
        errors.push(result.error);
      }
    }

    return { paths, errors };
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
