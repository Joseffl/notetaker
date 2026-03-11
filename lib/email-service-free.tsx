import MeetingSummaryEmailNew from '@/app/components/email/meeting-summary'
import { render } from '@react-email/render'
import nodemailer from 'nodemailer'

interface EmailData {
    userEmail: string
    userName: string
    meetingTitle: string
    summary: string
    actionItems: Array<{
        id: number
        text: string
    }>
    meetingId: string
    meetingDate: string
}

function getTransporter() {
    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_APP_PASSWORD

    if (!user || !pass) {
        throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set')
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user,
            pass
        }
    })
}

export async function sendMeetingSummaryEmail(data: EmailData) {
    try {
        const transporter = getTransporter()
        const emailHtml = await render(
            <MeetingSummaryEmailNew
                userName={data.userName}
                meetingTitle={data.meetingTitle}
                summary={data.summary}
                actionItems={data.actionItems}
                meetingId={data.meetingId}
                meetingDate={data.meetingDate}
            />
        )

        const result = await transporter.sendMail({
            from: `"Meeting Bot" <${process.env.GMAIL_USER}>`,
            to: data.userEmail,
            subject: `Meeting Summary Ready - ${data.meetingTitle}`,
            html: emailHtml
        })

        return result
    } catch (error) {
        console.error('error saendign email:', error)
        throw error
    }
}
