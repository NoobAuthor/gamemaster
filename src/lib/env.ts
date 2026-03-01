// Unified environment helpers for API and WebSocket base URLs

export function getServerBase(): string {
  // Use current hostname in dev so LAN devices can reach the server
  if (import.meta.env.PROD) return window.location.origin
  const hostname = window.location.hostname || 'localhost'
  return `http://${hostname}:3001`
}

export function getWebSocketBase(): string {
  // For Socket.IO the same base is fine
  return getServerBase()
}

export const isDev = !!import.meta.env.DEV


