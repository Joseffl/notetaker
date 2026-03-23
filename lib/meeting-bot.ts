import { prisma } from "@/lib/db";

interface CreateMeetingBotParams {
    meetingId: string;
    meetingUrl: string;
    userId: string;
    botName?: string | null;
    botImageUrl?: string | null;
}

export async function createMeetingBot({
    meetingId,
    meetingUrl,
    userId,
    botName,
    botImageUrl,
}: CreateMeetingBotParams) {
    if (!process.env.MEETING_BAAS_API_KEY) {
        throw new Error("MEETING_BAAS_API_KEY is not configured");
    }

    if (!process.env.WEBHOOK_URL) {
        throw new Error("WEBHOOK_URL is not configured");
    }

    const requestBody: Record<string, unknown> = {
        meeting_url: meetingUrl,
        bot_name: botName || "AI Notetaker",
        reserved: false,
        recording_mode: "speaker_view",
        speech_to_text: { provider: "Gladia" },
        webhook_url: process.env.WEBHOOK_URL,
        extra: {
            meeting_id: meetingId,
            user_id: userId,
        },
    };

    if (botImageUrl) {
        requestBody.bot_image = botImageUrl;
    }

    const meetingBaasResponse = await fetch("https://api.meetingbaas.com/bots", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-meeting-baas-api-key": process.env.MEETING_BAAS_API_KEY,
        },
        body: JSON.stringify(requestBody),
    });

    const responseText = await meetingBaasResponse.text();
    let responseData: any = null;

    if (responseText) {
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { raw: responseText };
        }
    }

    if (!meetingBaasResponse.ok) {
        console.error("meeting bot join failed", {
            meetingId,
            status: meetingBaasResponse.status,
            responseData,
        });

        throw new Error(responseData?.message || responseData?.error || "failed to create meeting bot");
    }

    const botId = responseData?.bot_id || null;

    await prisma.meeting.update({
        where: { id: meetingId },
        data: {
            botSent: true,
            botId,
            botJoinedAt: new Date(),
        },
    });

    return {
        botId,
        responseData,
    };
}
