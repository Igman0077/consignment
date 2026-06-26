import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

  try {
    const paths = await saveUploadedPhotos(files);
    if (paths.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid images were uploaded. Check Cloudinary settings or file size (max 5 MB).",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ paths });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
