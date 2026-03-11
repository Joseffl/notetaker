import { useAuth } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export interface Integration {
  platform: "google-calendar";
  name: string;
  description: string;
  connected: boolean;
  logo: string;
}

export function useIntegrations() {
  const { userId } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      platform: "google-calendar",
      name: "Google Calendar",
      description: "Connect Google Calendar to auto-sync Google Meet meetings.",
      connected: false,
      logo: "/gcal.png",
    },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchIntegrations();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch("/api/user/calendar-status");
      const data = await response.json();
      setIntegrations((prev) =>
        prev.map((integration) => ({
          ...integration,
          connected: data.connected || false,
        })),
      );
    } catch (error) {
      console.error("error fetching integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = "/api/auth/google/direct-connect";
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/auth/google/disconnect", { method: "POST" });
      await fetchIntegrations();
    } catch (error) {
      console.error("error disconnecting google calendar:", error);
    }
  };

  return {
    integrations,
    loading,
    fetchIntegrations,
    handleConnect,
    handleDisconnect,
  };
}
