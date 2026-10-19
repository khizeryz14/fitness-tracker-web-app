import { useEffect, useState } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL } from "../lib/api";

export type StreamStatus = "connecting" | "live" | "offline";

// Opens the SignalR connection while logged in. A pushed reminder just refreshes the
// notifications query, the REST endpoint stays the source of truth.
export function useNotificationStream(token: string | null): StreamStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>("offline");

  useEffect(() => {
    if (!token) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/notifications`, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    let cancelled = false;
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

    connection.on("notification", refresh);
    connection.onreconnecting(() => setStatus("connecting"));
    connection.onreconnected(() => {
      setStatus("live");
      refresh(); // catch anything missed while disconnected
    });
    connection.onclose(() => {
      if (!cancelled) setStatus("offline");
    });

    setStatus("connecting");
    connection
      .start()
      .then(() => {
        if (!cancelled) setStatus("live");
      })
      .catch(() => {
        if (!cancelled) setStatus("offline");
      });

    return () => {
      cancelled = true;
      void connection.stop();
    };
  }, [token, queryClient]);

  return status;
}
