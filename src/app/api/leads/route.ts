import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import {
  LeadSubmissionSchema,
  dispatchLead,
  verifySpamToken,
} from "@/lib/leads";

export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".dwg",
  ".dxf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
]);

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let payload: Record<string, unknown> = {};
    const savedFiles: Array<{ name: string; size: number; type: string }> = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const rawJson = formData.get("payload");
      if (typeof rawJson === "string") {
        payload = JSON.parse(rawJson) as Record<string, unknown>;
      } else {
        for (const [k, v] of formData.entries()) {
          if (typeof v === "string") payload[k] = v;
        }
      }

      const uploadDir = path.join(process.cwd(), ".leads", "uploads");
      const files = formData.getAll("files");
      for (const entry of files) {
        if (entry instanceof File && entry.size > 0) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!ALLOWED_EXTENSIONS.has(ext)) {
            return NextResponse.json(
              {
                ok: false,
                error: `Unsupported file type (${ext || "unknown"}). Upload PDF, DWG, DXF, JPG, PNG, or WEBP.`,
              },
              { status: 400 }
            );
          }
          if (entry.size > 25 * 1024 * 1024) {
            return NextResponse.json(
              { ok: false, error: `${entry.name} exceeds the 25 MB limit.` },
              { status: 400 }
            );
          }
          await fs.mkdir(uploadDir, { recursive: true });
          const safeName = `${Date.now()}-${entry.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const buf = Buffer.from(await entry.arrayBuffer());
          await fs.writeFile(path.join(uploadDir, safeName), buf);
          savedFiles.push({
            name: entry.name,
            size: entry.size,
            type: entry.type || ext,
          });
        }
      }
      if (savedFiles.length > 0) {
        payload.files = savedFiles;
      }
    } else {
      payload = (await req.json()) as Record<string, unknown>;
    }

    const parsed = LeadSubmissionSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          ok: false,
          error: "Please check the highlighted fields.",
          fieldErrors,
        },
        { status: 400 }
      );
    }

    // Honeypot trap: silently accept without dispatching to CRM so bots do not retry
    if (parsed.data.website_url && parsed.data.website_url.trim().length > 0) {
      return NextResponse.json({
        ok: true,
        leadId: "LD-FILTERED",
        adapters: [],
      });
    }

    const captchaValid = await verifySpamToken(parsed.data.captchaToken || "");
    if (!captchaValid) {
      return NextResponse.json(
        { ok: false, error: "Spam verification failed. Please retry." },
        { status: 403 }
      );
    }

    const stored = await dispatchLead(parsed.data);

    return NextResponse.json(
      {
        ok: true,
        leadId: stored.id,
        receivedAt: stored.receivedAt,
        filesReceived: stored.files.length,
        adapters: stored.adaptersDispatched,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/leads] error:", err);
    return NextResponse.json(
      { ok: false, error: "Unable to process your submission right now." },
      { status: 500 }
    );
  }
}
