'use client'

import React from 'react'
import { useIntegrations } from './hooks/useIntegrations'
import IntegrationCard from './components/IntegrationCard'

function Integrations() {

    const {
        integrations,
        loading,
        handleConnect,
        handleDisconnect
    } = useIntegrations()

    if (loading) {
        return (
            <div className='min-h-screen bg-background flex items-center justify-center p-6'>
                <div className='flex flex-col items-center justify-center'>
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-foreground mb-4'></div>
                    <div className='text-foreground'>Loading Integrations...</div>
                </div>
            </div>
        )
    }
    return (
        <div className='min-h-screen bg-background p-6'>
            <div className='max-w-4xl mx-auto'>
                <div className='mb-8'>
                    <h1 className='text-2xl font-bold text-foreground mb-2'>Integrations</h1>

                    <p className='text-muted-foreground'>
                        Connect Google Calendar to sync upcoming Google Meet meetings automatically.
                    </p>
                </div>

                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    {integrations.map((integration) => (
                        <IntegrationCard
                            key={integration.platform}
                            integration={integration}
                            onConnect={handleConnect}
                            onDisconnect={handleDisconnect}
                            onSetup={() => { }}
                        />
                    ))}
                </div>

                <div className='mt-8 bg-card rounded-lg p-6 border border-border'>
                    <h3 className='font-semibold text-foreground mb-2'>How it works</h3>

                    <ol className='text-sm text-muted-foreground space-y-2'>
                        <li>1. Connect your Google Calendar account above.</li>
                        <li>2. Upcoming Google Meet events appear on your Home dashboard.</li>
                        <li>3. The scheduler can auto-join enabled meetings and generate notes.</li>

                    </ol>

                </div>

            </div>
        </div>
    )
}

export default Integrations
