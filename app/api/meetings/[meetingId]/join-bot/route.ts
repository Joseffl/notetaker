import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createMeetingBot } from "@/lib/meeting-bot";
import { NextRequest, NextResponse } from "next/server";

const BOT_JOIN_LOOKAHEAD_MS = 5 * 60 * 1000;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ meetingId: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "not authenticated" }, { status: 401 });
        }

        const { meetingId } = await params;

        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            return NextResponse.json({ error: "user not found" }, { status: 404 });
        }

        const meeting = await prisma.meeting.findFirst({
            where: {
                id: meetingId,
                userId: user.id,
            },
            include: {
                user: {
                    select: {
                        botName: true,
                        botImageUrl: true,
                    },
                },
            },
        });

        if (!meeting) {
            return NextResponse.json({ error: "meeting not found" }, { status: 404 });
        }

        if (!meeting.botScheduled) {
            return NextResponse.json({ error: "bot is disabled for this meeting" }, { status: 400 });
        }

        if (!meeting.meetingUrl) {
            return NextResponse.json({ error: "meeting url is missing" }, { status: 400 });
        }

        if (meeting.botSent && meeting.botId) {
            return NextResponse.json({
                success: true,
                alreadyJoined: true,
                botId: meeting.botId,
            });
        }

        const now = new Date();
        const joinWindowEnd = new Date(now.getTime() + BOT_JOIN_LOOKAHEAD_MS);

        if (meeting.endTime < now) {
            return NextResponse.json({ error: "meeting has already ended" }, { status: 400 });
        }

        if (meeting.startTime > joinWindowEnd) {
            return NextResponse.json({
                error: "meeting is not ready for bot join yet",
                joinableAfter: new Date(meeting.startTime.getTime() - BOT_JOIN_LOOKAHEAD_MS).toISOString(),
            }, { status: 400 });
        }

        const { botId } = await createMeetingBot({
            meetingId: meeting.id,
            meetingUrl: meeting.meetingUrl,
            userId: meeting.userId,
            botName: meeting.user.botName,
            botImageUrl: meeting.user.botImageUrl,
        });

        return NextResponse.json({
            success: true,
            botId,
        });
    } catch (error) {
        console.error("join bot error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "failed to join meeting",
        }, { status: 500 });
    }
}
