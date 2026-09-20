import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { withApiHandler } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { parseBoothBrandBuffer } from "@/lib/excel-booth-parser";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  return withApiHandler(async () => {
    const { session, error } = await requireAdmin(request);
    if (error) return error;

    const { id: eventId } = await params;

    const rows = await prisma.$queryRawUnsafe<
      { id: string; booth_code: string; brand_name: string }[]
    >(
      `SELECT id, booth_code, brand_name FROM event_booth_brands WHERE event_id = $1 ORDER BY booth_code ASC`,
      eventId
    );

    const boothBrands: Record<string, string> = {};
    const items = rows.map((r) => {
      boothBrands[r.booth_code] = r.brand_name;
      return {
        id: r.id,
        boothCode: r.booth_code,
        brandName: r.brand_name,
      };
    });

    // Natural sort: Zone letter first, then booth number numerically (1A, 2A ... 10A, 11A)
    items.sort((a, b) => {
      const ma = a.boothCode.match(/^(\d+)([A-Za-z]+)$/);
      const mb = b.boothCode.match(/^(\d+)([A-Za-z]+)$/);
      if (ma && mb) {
        const numA = parseInt(ma[1], 10);
        const zoneA = ma[2].toUpperCase();
        const numB = parseInt(mb[1], 10);
        const zoneB = mb[2].toUpperCase();
        if (zoneA !== zoneB) return zoneA.localeCompare(zoneB);
        return numA - numB;
      }
      return a.boothCode.localeCompare(b.boothCode, undefined, { numeric: true });
    });

    return NextResponse.json({
      eventId,
      total: items.length,
      items,
      boothBrands,
    });
  }, "GET /api/admin/events/[id]/booth-brands");
}

export async function POST(request: Request, { params }: RouteParams) {
  return withApiHandler(async () => {
    const { session, error } = await requireAdmin(request);
    if (error) return error;

    const { id: eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";

    let itemsToSave: { boothCode: string; brandName: string }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const sheetUrl = formData.get("sheetUrl") as string | null;

      if (sheetUrl && sheetUrl.trim().length > 0) {
        // Fetch from Google Sheets or public CSV/Excel URL
        let fetchUrl = sheetUrl.trim();
        if (fetchUrl.includes("docs.google.com/spreadsheets")) {
          // Convert view URL to CSV export URL
          const match = fetchUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match) {
            fetchUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
          }
        }

        const res = await fetch(fetchUrl);
        if (!res.ok) {
          return NextResponse.json(
            { error: `Failed to fetch sheet from URL (HTTP ${res.status}). Make sure the Google Sheet is shared as 'Anyone with the link can view'.` },
            { status: 400 }
          );
        }

        const arrayBuf = await res.arrayBuffer();
        const parseResult = parseBoothBrandBuffer(Buffer.from(arrayBuf));
        if (!parseResult.success || parseResult.items.length === 0) {
          return NextResponse.json(
            { error: "No valid booth numbers or brands found in the provided sheet." },
            { status: 400 }
          );
        }
        itemsToSave = parseResult.items;
      } else if (file) {
        const arrayBuf = await file.arrayBuffer();
        const parseResult = parseBoothBrandBuffer(Buffer.from(arrayBuf));
        if (!parseResult.success || parseResult.items.length === 0) {
          return NextResponse.json(
            { error: "No valid booth numbers or brands found in the uploaded file." },
            { status: 400 }
          );
        }
        itemsToSave = parseResult.items;
      } else {
        return NextResponse.json(
          { error: "Please provide an Excel/CSV file or a Google Sheets URL." },
          { status: 400 }
        );
      }
    } else {
      // JSON body
      const body = await request.json();
      if (body.sheetUrl) {
        let fetchUrl = String(body.sheetUrl).trim();
        if (fetchUrl.includes("docs.google.com/spreadsheets")) {
          const match = fetchUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match) {
            fetchUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
          }
        }

        const res = await fetch(fetchUrl);
        if (!res.ok) {
          return NextResponse.json(
            { error: `Failed to fetch sheet from URL (HTTP ${res.status}). Make sure the Google Sheet is shared as 'Anyone with the link can view'.` },
            { status: 400 }
          );
        }

        const arrayBuf = await res.arrayBuffer();
        const parseResult = parseBoothBrandBuffer(Buffer.from(arrayBuf));
        if (!parseResult.success || parseResult.items.length === 0) {
          return NextResponse.json(
            { error: "No valid booth numbers or brands found in the provided sheet." },
            { status: 400 }
          );
        }
        itemsToSave = parseResult.items;
      } else if (Array.isArray(body.items)) {
        itemsToSave = body.items;
      } else {
        return NextResponse.json(
          { error: "Invalid request body." },
          { status: 400 }
        );
      }
    }

    if (itemsToSave.length === 0) {
      return NextResponse.json(
        { error: "No booth items to save." },
        { status: 400 }
      );
    }

    // Clear existing for this event and insert fresh
    await prisma.$executeRawUnsafe(
      `DELETE FROM event_booth_brands WHERE event_id = $1`,
      eventId
    );

    for (const item of itemsToSave) {
      const id = `ebb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO event_booth_brands (id, event_id, booth_code, brand_name, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (event_id, booth_code) 
         DO UPDATE SET brand_name = EXCLUDED.brand_name`,
        id,
        eventId,
        item.boothCode,
        item.brandName
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${itemsToSave.length} booth-brand mappings!`,
      totalSaved: itemsToSave.length,
    });
  }, "POST /api/admin/events/[id]/booth-brands");
}

export async function DELETE(request: Request, { params }: RouteParams) {
  return withApiHandler(async () => {
    const { session, error } = await requireAdmin(request);
    if (error) return error;

    const { id: eventId } = await params;

    await prisma.$executeRawUnsafe(
      `DELETE FROM event_booth_brands WHERE event_id = $1`,
      eventId
    );

    return NextResponse.json({
      success: true,
      message: "Booth brands cleared successfully",
    });
  }, "DELETE /api/admin/events/[id]/booth-brands");
}
