import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { saveUploadedPhotos } from "@/lib/upload";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const files = formData.getAll("photos") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  if (!isCloudinaryConfigured() && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Render.",
      },
      { status: 503 }
    );
  }

  try {
    const { paths, errors } = await saveUploadedPhotos(files);

    if (paths.length === 0) {
      const detail = errors[0] || "Check Cloudinary settings or file size (max 5 MB).";
      return NextResponse.json({ error: detail, details: errors }, { status: 400 });
    }

    return NextResponse.json({ paths, warnings: errors.length > 0 ? errors : undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
