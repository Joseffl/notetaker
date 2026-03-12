import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID
        const redirectUri = process.env.GOOGLE_REDIRECT_URI

        if (!clientId || !redirectUri) {
            console.error('Direct OAuth config missing', {
                hasClientId: Boolean(clientId),
                hasRedirectUri: Boolean(redirectUri),
            })
            return NextResponse.json({ error: "Google OAuth config missing" }, { status: 500 })
        }

        const { userId } = await auth()
        if (!userId) {
            return NextResponse.redirect('/sign-in')
        }

        const state = Buffer.from(JSON.stringify({ userId })).toString('base64')

        const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
        googleAuthUrl.searchParams.set('client_id', clientId)
        googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
        googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly')
        googleAuthUrl.searchParams.set('response_type', 'code')
        googleAuthUrl.searchParams.set('access_type', 'offline')
        googleAuthUrl.searchParams.set('prompt', 'consent')
        googleAuthUrl.searchParams.set('state', state)

        return NextResponse.redirect(googleAuthUrl.toString())
    } catch (error) {
        console.error('Direct OAuth error:', error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Failed to setup OAuth"
        }, { status: 500 })
    }
}
