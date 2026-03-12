import { generateStructuredJson } from "./huggingface";

function parseJsonPayload(payload: string) {
    const trimmed = payload.trim()

    try {
        return JSON.parse(trimmed)
    } catch {
        const jsonStart = trimmed.indexOf('{')
        const jsonEnd = trimmed.lastIndexOf('}')

        if (jsonStart >= 0 && jsonEnd > jsonStart) {
            return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1))
        }

        throw new Error('No valid JSON found in model response')
    }
}

function normalizeTranscriptText(transcriptText: string) {
    return transcriptText
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => line.length > 2)
        .join("\n");
}

function extractActionItemsFromTranscript(transcriptText: string) {
    const actionKeywords = [
        "action",
        "todo",
        "follow up",
        "follow-up",
        "next step",
        "assign",
        "owner",
        "review",
        "send",
        "share",
        "update",
        "prepare",
        "create",
        "fix",
        "check",
    ];

    const lines = transcriptText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const matchedLines = lines.filter((line) => {
        const lower = line.toLowerCase();
        return actionKeywords.some((keyword) => lower.includes(keyword));
    });

    return matchedLines.slice(0, 5).map((line, index) => ({
        id: index + 1,
        text: line.length > 160 ? `${line.slice(0, 157)}...` : line,
    }));
}

function buildFallbackSummary(transcriptText: string) {
    const lines = transcriptText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 4);

    if (lines.length === 0) {
        return "Meeting transcript was captured, but there was not enough clean content to generate a reliable summary.";
    }

    const summarySeed = lines
        .map((line) => line.replace(/^[A-Za-z\s]+:\s*/, ""))
        .join(" ");

    const compactSummary = summarySeed.replace(/\s+/g, " ").trim();

    if (!compactSummary) {
        return "Meeting transcript was captured, but there was not enough clean content to generate a reliable summary.";
    }

    return compactSummary.length > 260
        ? `${compactSummary.slice(0, 257)}...`
        : compactSummary;
}

function normalizeActionItems(actionItems: unknown, transcriptText: string) {
    if (Array.isArray(actionItems)) {
        const cleaned = actionItems
            .filter((item): item is string => typeof item === "string")
            .map((text) => text.trim())
            .filter(Boolean)
            .slice(0, 5)
            .map((text, index) => ({
                id: index + 1,
                text,
            }));

        if (cleaned.length > 0) {
            return cleaned;
        }
    }

    return extractActionItemsFromTranscript(transcriptText);
}

export async function processMeetingTranscript(transcript: any) {
    try {
        let transcriptText = ''

        if (Array.isArray(transcript)) {
            transcriptText = transcript
                .map((item: any) => `${item.speaker || 'Speaker'}: ${item.words.map((w: any) => w.word).join(' ')}`)
                .join('\n')
        } else if (typeof transcript === 'string') {
            transcriptText = transcript
        } else if (transcript.text) {
            transcriptText = transcript.text
        }

        if (!transcriptText || transcriptText.trim().length === 0) {
            throw new Error('No transcript content found')
        }

        transcriptText = normalizeTranscriptText(transcriptText)

        if (!transcriptText) {
            throw new Error('No usable transcript content found')
        }

        const response = await generateStructuredJson(
            `You analyze meeting transcripts and return strict JSON.

Return this exact shape:
{
  "summary": "2-3 sentence summary",
  "actionItems": ["action item 1", "action item 2"]
}

Rules:
- Return valid JSON only.
- actionItems must be an array of strings.
- If there are no clear action items, return an empty array.
- Do not wrap the JSON in markdown fences.`,
            `Analyze this meeting transcript:\n\n${transcriptText}`
        )

        if (!response) {
            throw new Error('No response from model')
        }

        const parsed = parseJsonPayload(response)

        const actionItems = normalizeActionItems(parsed.actionItems, transcriptText)
        const summary = typeof parsed.summary === 'string' && parsed.summary.trim()
            ? parsed.summary.trim()
            : buildFallbackSummary(transcriptText)


        return {
            summary,
            actionItems
        }

    } catch (error) {
        console.error('error processing transcript with ai:', error)

        let transcriptText = ''

        if (Array.isArray(transcript)) {
            transcriptText = transcript
                .map((item: any) => `${item.speaker || 'Speaker'}: ${item.words.map((w: any) => w.word).join(' ')}`)
                .join('\n')
        } else if (typeof transcript === 'string') {
            transcriptText = transcript
        } else if (transcript?.text) {
            transcriptText = transcript.text
        }

        const normalizedTranscript = normalizeTranscriptText(transcriptText)

        return {
            summary: buildFallbackSummary(normalizedTranscript),
            actionItems: extractActionItemsFromTranscript(normalizedTranscript)
        }
    }
}
