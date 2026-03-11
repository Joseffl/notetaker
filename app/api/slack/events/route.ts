import { App } from '@slack/bolt'
import { authorizeSlack } from './utils/slack-auth'
import { handleAppMention } from './handlers/app-mention'
import { handleMessage } from './handlers/message'
import { NextRequest, NextResponse } from 'next/server'
import { verifySlackSignature } from './utils/verifySlackSignature'

let slackApp: App | null = null

function getSlackApp() {
    const signingSecret = process.env.SLACK_SIGNING_SECRET

    if (!signingSecret) {
        throw new Error('SLACK_SIGNING_SECRET is not set')
    }

    if (!slackApp) {
        slackApp = new App({
            signingSecret,
            authorize: authorizeSlack
        })

        slackApp.event('app_mention', handleAppMention)
        slackApp.message(handleMessage)
    }

    return slackApp
}

export async function POST(req: NextRequest) {
    try {
        const app = getSlackApp()
        const body = await req.text()
        const bodyJson = JSON.parse(body)

        if (bodyJson.type === 'url_verification') {
            return NextResponse.json({ challenge: bodyJson.challenge })
        }

        const signature = req.headers.get('x-slack-signature')
        const timestamp = req.headers.get('x-slack-request-timestamp')

        if (!signature || !timestamp) {
            return NextResponse.json({ error: 'missing signature' }, { status: 401 })
        }

        if (!verifySlackSignature(body, signature, timestamp)) {
            return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
        }

        await app.processEvent({
            body: bodyJson,
            ack: async () => { }
        })

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('POST error:', error)
        return NextResponse.json({ error: 'internal error' }, { status: 500 })
    }
}
