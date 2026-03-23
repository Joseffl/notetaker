import { useAuth } from "@/lib/auth-client"
import { useEffect, useState } from "react"

export interface CalendarEvent {
    id: string
    summary?: string
    start?: {
        dateTime?: string
        date?: string
    }
    end?: {
        dateTime?: string
        date?: string
    }
    attendees?: Array<{ email: string }>
    location?: string
    hangoutLink?: string
    conferenceData?: any
    botScheduled?: boolean
    meetingId?: string
    botSent?: boolean
    botId?: string | null
    botJoinedAt?: string | null
}

type BotStatus = 'disabled' | 'scheduled' | 'joining' | 'joined' | 'failed'

const BOT_JOIN_LOOKAHEAD_MS = 5 * 60 * 1000

export interface PastMeeting {
    id: string
    title: string
    description?: string | null
    meetingUrl: string | null
    startTime: Date
    endTime: Date
    attendees?: any
    transcriptReady: boolean
    recordingUrl?: string | null
    speakers?: any
}

export function useMeetings() {
    const { userId } = useAuth()
    const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
    const [pastMeetings, setPastMeetings] = useState<PastMeeting[]>([])
    const [loading, setLoading] = useState(false)
    const [pastLoading, setPastLoading] = useState(false)
    const [connected, setConnected] = useState(false)
    const [error, setError] = useState<string>('')
    const [botToggles, setBotToggles] = useState<{ [key: string]: boolean }>({})
    const [botJoinStates, setBotJoinStates] = useState<Record<string, { status: BotStatus; message?: string }>>({})
    const [initialLoading, setInitialLoading] = useState(true)
    const [liveJoinLoading, setLiveJoinLoading] = useState(false)


    useEffect(() => {
        if (userId) {
            fetchUpcomingEvents()
            fetchPastMeetings()
        }
    }, [userId])

    const shouldJoinMeetingNow = (event: CalendarEvent) => {
        if (!event.meetingId || !event.botScheduled) {
            return false
        }

        const startValue = event.start?.dateTime || event.start?.date
        const endValue = event.end?.dateTime || event.end?.date

        if (!startValue || !endValue) {
            return false
        }

        const startTime = new Date(startValue)
        const endTime = new Date(endValue)
        const now = Date.now()

        if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
            return false
        }

        return startTime.getTime() <= now + BOT_JOIN_LOOKAHEAD_MS && endTime.getTime() >= now
    }

    const getDefaultBotState = (event: CalendarEvent): { status: BotStatus; message?: string } => {
        if (!event.botScheduled) {
            return {
                status: 'disabled',
                message: 'Bot off'
            }
        }

        if (event.botSent) {
            return {
                status: 'joined',
                message: event.botJoinedAt ? 'Join request sent' : 'Bot sent'
            }
        }

        return {
            status: 'scheduled',
            message: shouldJoinMeetingNow(event) ? 'Ready to join' : 'Scheduled'
        }
    }

    const syncBotJoinStates = (events: CalendarEvent[]) => {
        setBotJoinStates(prev => {
            const next: Record<string, { status: BotStatus; message?: string }> = {}

            events.forEach(event => {
                const eventKey = event.id
                const existing = prev[eventKey]

                if (existing?.status === 'joining' || existing?.status === 'failed') {
                    next[eventKey] = existing
                    return
                }

                next[eventKey] = getDefaultBotState(event)
            })

            return next
        })
    }

    const joinMeetingBot = async (meetingId: string) => {
        const event = upcomingEvents.find(item => item.meetingId === meetingId)
        const eventKey = event?.id

        if (eventKey) {
            setBotJoinStates(prev => ({
                ...prev,
                [eventKey]: { status: 'joining', message: 'Sending bot...' }
            }))
        }

        try {
            const response = await fetch(`/api/meetings/${meetingId}/join-bot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'failed to trigger meeting bot join')
            }

            if (eventKey) {
                setBotJoinStates(prev => ({
                    ...prev,
                    [eventKey]: {
                        status: 'joined',
                        message: result.alreadyJoined ? 'Already sent' : 'Join request sent'
                    }
                }))
            }

            return result
        } catch (error) {
            console.error('failed to trigger meeting bot join:', error)
            if (eventKey) {
                setBotJoinStates(prev => ({
                    ...prev,
                    [eventKey]: {
                        status: 'failed',
                        message: error instanceof Error ? error.message : 'Join failed'
                    }
                }))
            }
            throw error
        }
    }

    const triggerBotsForReadyMeetings = async (events: CalendarEvent[]) => {
        const joinableMeetings = events
            .filter(shouldJoinMeetingNow)
            .map(event => event.meetingId)
            .filter((meetingId): meetingId is string => Boolean(meetingId))

        if (joinableMeetings.length === 0) {
            return
        }

        await Promise.allSettled(joinableMeetings.map(joinMeetingBot))
    }

    const fetchUpcomingEvents = async () => {
        setLoading(true)
        setError('')

        try {
            const statusResponse = await fetch('/api/user/calendar-status')
            const statusData = await statusResponse.json()

            if (!statusData.connected) {
                setConnected(false)
                setUpcomingEvents([])
                setError('Calendar not connected for auto-sync. Connect to enable auto syncing.')
                setLoading(false)
                setInitialLoading(false)
                return
            }

            const response = await fetch('/api/meetings/upcoming')
            const result = await response.json()

            if (!response.ok) {
                setError(result.error || 'Failed to fetch meetings')
                setConnected(false)
                setInitialLoading(false)
                return
            }

            setUpcomingEvents(result.events as CalendarEvent[])
            setConnected(result.connected)

            const toggles: { [key: string]: boolean } = {}
            result.events.forEach((event: CalendarEvent) => {
                toggles[event.id] = event.botScheduled ?? true
            })

            setBotToggles(toggles)
            syncBotJoinStates(result.events as CalendarEvent[])
            await triggerBotsForReadyMeetings(result.events as CalendarEvent[])

        } catch (error) {
            setError("failed to fetch calnedar events. please try agan")
            setConnected(false)
        }

        setLoading(false)
        setInitialLoading(false)

    }

    const fetchPastMeetings = async () => {

        setPastLoading(true)
        try {
            const response = await fetch('/api/meetings/past')
            const result = await response.json()

            if (!response.ok) {
                console.error('faild to fetch past meetings:', result.error)
                return
            }

            if (result.error) {
                return
            }
            setPastMeetings(result.meetings as PastMeeting[])
        } catch (error) {
            console.error('faild to fetch past meetings:', error)
        }
        setPastLoading(false)
    }

    const toggleBot = async (eventId: string) => {
        try {
            const event = upcomingEvents.find(e => e.id === eventId)
            if (!event?.meetingId) {
                return
            }

            setBotToggles(prev => ({
                ...prev,
                [eventId]: !prev[eventId]
            }))

            setBotJoinStates(prev => ({
                ...prev,
                [eventId]: {
                    status: !botToggles[eventId] ? 'scheduled' : 'disabled',
                    message: !botToggles[eventId] ? 'Scheduled' : 'Bot off'
                }
            }))

            const response = await fetch(`/api/meetings/${event.meetingId}/bot-toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    botScheduled: !botToggles[eventId]
                })
            })

            if (!response.ok) {
                setBotToggles(prev => ({
                    ...prev,
                    [eventId]: !prev[eventId]
                }))
                setBotJoinStates(prev => ({
                    ...prev,
                    [eventId]: getDefaultBotState(event)
                }))
                return
            }

            if (!botToggles[eventId] && event && shouldJoinMeetingNow({ ...event, botScheduled: true })) {
                await joinMeetingBot(event.meetingId)
            } else {
                setBotJoinStates(prev => ({
                    ...prev,
                    [eventId]: !botToggles[eventId]
                        ? { status: 'scheduled', message: shouldJoinMeetingNow({ ...event, botScheduled: true }) ? 'Ready to join' : 'Scheduled' }
                        : { status: 'disabled', message: 'Bot off' }
                }))
            }
        } catch {
            setBotToggles(prev => ({
                ...prev,
                [eventId]: !prev[eventId]
            }))
        }
    }

    const directOAuth = async () => {
        setLoading(true)
        try {
            window.location.href = '/api/auth/google/direct-connect'
        } catch {
            setError('Failed to start direct OAuth')
            setLoading(false)
        }
    }

    const joinLiveMeeting = async (meetingUrl: string) => {
        setLiveJoinLoading(true)

        try {
            const response = await fetch('/api/meetings/join-live', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meetingUrl })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'failed to join live meeting')
            }

            await Promise.allSettled([fetchUpcomingEvents(), fetchPastMeetings()])

            return result as { meetingId: string; botId?: string; alreadyJoined?: boolean }
        } finally {
            setLiveJoinLoading(false)
        }
    }

    const getAttendeeList = (attendees: any): string[] => {
        if (!attendees) {
            return []
        }

        try {
            const parsed = JSON.parse(String(attendees))
            if (Array.isArray(parsed)) {
                return parsed.map(name => String(name).trim())
            }
            return [String(parsed).trim()]
        } catch {
            const attendeeString = String(attendees)
            return attendeeString.split(',').map(name => name.trim()).filter(Boolean)
        }
    }

    const getInitials = (name: string): string => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    return {
        userId,
        upcomingEvents,
        pastMeetings,
        loading,
        pastLoading,
        connected,
        error,
        botToggles,
        botJoinStates,
        initialLoading,
        liveJoinLoading,
        fetchUpcomingEvents,
        fetchPastMeetings,
        toggleBot,
        directOAuth,
        joinLiveMeeting,
        getAttendeeList,
        getInitials
    }

}
