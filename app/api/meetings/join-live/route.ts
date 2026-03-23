import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createMeetingBot } from "@/lib/meeting-bot";
import { NextRequest, NextResponse } from "next/server";

function isGoogleMeetUrl(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname === "meet.google.com";
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "not authenticated" }, { status: 401 });
        }

        const { meetingUrl } = await request.json();
        const normalizedMeetingUrl = typeof meetingUrl === "string" ? meetingUrl.trim() : "";

        if (!normalizedMeetingUrl) {
            return NextResponse.json({ error: "meeting url is required" }, { status: 400 });
        }

        if (!isGoogleMeetUrl(normalizedMeetingUrl)) {
            return NextResponse.json({ error: "please paste a valid Google Meet link" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: {
                id: true,
                botName: true,
                botImageUrl: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "user not found" }, { status: 404 });
        }

        const now = new Date();

        const existingMeeting = await prisma.meeting.findFirst({
            where: {
                userId: user.id,
                meetingUrl: normalizedMeetingUrl,
                endTime: {
                    gte: now,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        if (existingMeeting?.botSent && existingMeeting.botId) {
            return NextResponse.json({
                success: true,
                alreadyJoined: true,
                meetingId: existingMeeting.id,
                botId: existingMeeting.botId,
            });
        }

        const meeting = existingMeeting || await prisma.meeting.create({
            data: {
                userId: user.id,
                title: "Live Google Meet",
                meetingUrl: normalizedMeetingUrl,
                startTime: now,
                endTime: new Date(now.getTime() + 60 * 60 * 1000),
                isFromCalendar: false,
                botScheduled: true,
            },
        });

        const { botId } = await createMeetingBot({
            meetingId: meeting.id,
            meetingUrl: meeting.meetingUrl || normalizedMeetingUrl,
            userId: meeting.userId,
            botName: user.botName,
            botImageUrl: user.botImageUrl,
        });

        return NextResponse.json({
            success: true,
            meetingId: meeting.id,
            botId,
        });
    } catch (error) {
        console.error("join live meeting error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "failed to join live meeting",
        }, { status: 500 });
    }
}
