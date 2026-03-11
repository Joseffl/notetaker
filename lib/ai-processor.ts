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
            throw new Error('No response from chatgpt')
        }

        const parsed = parseJsonPayload(response)

        const actionItems = Array.isArray(parsed.actionItems)
            ? parsed.actionItems.map((text: string, index: number) => ({
                id: index + 1,
                text: text
            }))
            : []


        return {
            summary: parsed.summary || 'Summary couldnt be generated',
            actionItems: actionItems
        }

    } catch (error) {
        console.error('error processing transcript with chatgpt:', error)

        return {
            summary: 'Meeting transcript processed successfully. Please check the full transcript for details.',
            actionItems: []
        }
    }
}
