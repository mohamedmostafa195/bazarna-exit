import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getActiveEventReady } from "@/lib/event-lifecycle";
import {
  getActiveTicketInOtherEntrance,
  requestQueueNumber,
  scheduleQueueBroadcast,
} from "@/lib/queue";
import { logAction } from "@/lib/action-log";
import { getTicketUrl } from "@/lib/utils";
import { sendQueueConfirmationEmail } from "@/lib/email";
import { getEntranceFromRequest } from "@/lib/entrance-server";
import { prisma } from "@/lib/prisma";
import { getEntranceLabel, isEntranceType, type EntranceType } from "@/lib/entrance";
import { parseJsonBody, withApiHandler } from "@/lib/api-error";
import {
  resolveEventZones,
  validateBoothAgainstZones,
} from "@/lib/booth-validation";

import bcrypt from "bcryptjs";

interface IssueTicketBody {
  userId?: string;
  brandName?: string;
  boothNumber?: string;
  entranceType?: EntranceType;
  eventId?: string;
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const { session, error } = await requireAdmin(request);
    if (error) return error;

    const body = await parseJsonBody<IssueTicketBody>(request).catch(
      () => ({}) as IssueTicketBody
    );

    const userId = body.userId?.trim();
    const boothNumber = body.boothNumber?.trim();
    const brandNameInput = body.brandName?.trim();

    if (!boothNumber) {
      return NextResponse.json(
        { error: "Please select your zone and booth / brand" },
        { status: 400 }
      );
    }

    const entranceType =
      (body.entranceType && isEntranceType(body.entranceType) ? body.entranceType : null) ??
      getEntranceFromRequest(request) ??
      "BAZARNA";

    const event = body.eventId
      ? await prisma.event.findUnique({
          where: { id: body.eventId },
          include: { zones: { orderBy: { name: "asc" } } },
        })
      : await getActiveEventReady(entranceType);

    if (!event) {
      return NextResponse.json(
        { error: `No active event found for ${getEntranceLabel(entranceType)}` },
        { status: 404 }
      );
    }

    const eventZones = resolveEventZones(event.zones, event.entranceType);
    const boothValidation = validateBoothAgainstZones(boothNumber, eventZones);
    if (!boothValidation.valid) {
      return NextResponse.json(
        { error: boothValidation.error },
        { status: 400 }
      );
    }
    const finalBoothNumber = boothValidation.formattedBooth!;

    // Resolve brand user: by userId, or by brandName, or by boothNumber, or create one
    let brandUser: { id: string; brandName: string; email: string | null; role: string } | null = null;

    if (userId) {
      brandUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, brandName: true, email: true, role: true },
      });
    }

    if (!brandUser && brandNameInput) {
      brandUser = await prisma.user.findFirst({
        where: {
          role: "BRAND",
          brandName: { equals: brandNameInput, mode: "insensitive" },
        },
        select: { id: true, brandName: true, email: true, role: true },
      });
    }

    if (!brandUser) {
      brandUser = await prisma.user.findFirst({
        where: {
          role: "BRAND",
          boothNumber: { equals: finalBoothNumber, mode: "insensitive" },
        },
        select: { id: true, brandName: true, email: true, role: true },
      });
    }

    if (!brandUser) {
      // Auto-create brand account so admin is never blocked
      const brandName = brandNameInput || `Brand ${finalBoothNumber}`;
      const safeSlug = brandName.toLowerCase().replace(/[^a-z0-9]/g, "") || "brand";
      const autoEmail = `${safeSlug}_${Date.now()}@bazarna-queue.local`;
      const dummyHash = await bcrypt.hash("bazarna123", 10);
      brandUser = await prisma.user.create({
        data: {
          brandName,
          representativeName: brandName,
          boothNumber: finalBoothNumber,
          email: autoEmail,
          password: dummyHash,
          role: "BRAND",
          entranceType: event.entranceType,
        },
        select: { id: true, brandName: true, email: true, role: true },
      });
    }

    const resolvedUserId = brandUser.id;

    const otherTicket = await getActiveTicketInOtherEntrance(
      resolvedUserId,
      event.entranceType
    );

    if (otherTicket && isEntranceType(otherTicket.event.entranceType)) {
      const label = getEntranceLabel(otherTicket.event.entranceType);
      return NextResponse.json(
        {
          error: `This brand already has an active exit number (#${otherTicket.queueNumber}) in ${label} Exit. Each brand can only join one exit queue.`,
        },
        { status: 400 }
      );
    }

    // Check if another brand already has an active ticket with this booth number
    const activeEvents = await prisma.event.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    const activeEventIds = activeEvents.map((e) => e.id);

    const duplicateBooth = await prisma.queueTicket.findFirst({
      where: {
        eventId: { in: activeEventIds.length > 0 ? activeEventIds : [event.id] },
        userId: { not: resolvedUserId },
        user: {
          boothNumber: {
            equals: finalBoothNumber,
            mode: "insensitive",
          },
        },
      },
      include: { user: { select: { brandName: true } } },
    });

    if (duplicateBooth) {
      return NextResponse.json(
        {
          error: `Booth number "${finalBoothNumber}" is already used by "${duplicateBooth.user.brandName}". Please pick another.`,
        },
        { status: 409 }
      );
    }

    // Update the brand user's booth number in DB
    await prisma.user.update({
      where: { id: resolvedUserId },
      data: { boothNumber: finalBoothNumber },
    });

    // Request queue number (bypasses windowState check because this is an admin override)
    const result = await requestQueueNumber(resolvedUserId, event.id, finalBoothNumber);

    if (result.error) {
      if (result.ticket) {
        return NextResponse.json(
          { error: result.error, ticket: result.ticket },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const ticket = result.ticket!;
    const ticketUrl = getTicketUrl(ticket.qrToken);
    const entranceLabel = isEntranceType(event.entranceType)
      ? getEntranceLabel(event.entranceType)
      : "Exit";

    // Broadcast update immediately to live dashboards and displays
    scheduleQueueBroadcast(event.id);

    // Send confirmation email asynchronously
    if (brandUser.email) {
      void sendQueueConfirmationEmail({
        to: brandUser.email,
        brandName: brandUser.brandName,
        queueNumber: ticket.queueNumber,
        eventName: event.eventName,
        entranceLabel,
        ticketUrl,
      }).catch((emailError) => {
        console.error("Email send failed (non-fatal):", emailError);
      });
    }

    const actorName = session!.user.name ?? session!.user.email ?? "Admin";

    void logAction({
      action: "ADMIN_TICKET_ISSUED",
      entranceType: event.entranceType,
      eventId: event.id,
      actorName,
      brandName: brandUser.brandName,
      queueNumber: ticket.queueNumber,
      details: `Admin (${actorName}) manually issued #${ticket.queueNumber} for ${brandUser.brandName} (Booth ${finalBoothNumber}) [Override]`,
    }).catch((logError) => {
      console.error("Action log failed (non-fatal):", logError);
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        queueNumber: ticket.queueNumber,
        status: ticket.status,
        qrToken: ticket.qrToken,
        requestedAt: ticket.requestedAt,
        ticketUrl,
      },
      entranceType: event.entranceType,
      entranceLabel,
    });
  }, "POST /api/admin/queue/issue");
}
