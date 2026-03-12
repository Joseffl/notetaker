import { prisma } from "@/lib/db";
import { chatWithAllMeetings } from "@/lib/rag";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { question, userId: slackUserId } = await request.json()

        if (!question) {
            return NextResponse.json({ error: 'missing question' }, { status: 400 })
        }

        let targetUserId = slackUserId

        if (!slackUserId) {
            const { userId: clerkUserId } = await auth()
            if (!clerkUserId) {
                return NextResponse.json({ error: 'not logged in' }, { status: 401 })
            }

            const user = await prisma.user.findUnique({
                where: {
                    clerkId: clerkUserId
                },
                select: {
                    id: true
                }
            })

            if (!user) {
                return NextResponse.json({ error: 'user not found' }, { status: 404 })
            }

            targetUserId = user.id
        } else {
            const user = await prisma.user.findUnique({
                where: {
                    id: slackUserId
                },
                select: {
                    id: true
                }
            })

            if (!user) {
                return NextResponse.json({ error: 'user not found' }, { status: 404 })
            }

            targetUserId = user.id
        }

        const response = await chatWithAllMeetings(targetUserId, question)

        return NextResponse.json(response)
    } catch (error) {
        console.error('error in chat:', error)
        return NextResponse.json({
            error: 'failed to process question',
            answer: "I encountered an error while searching your meetings. please try again."
        }, { status: 500 })
    }
}
