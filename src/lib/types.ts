export interface Room {
  id: number
  name: string
  timeRemaining: number // en segundos
  isRunning: boolean
  hintsRemaining: number
  freeHintsCount: number // número original de pistas gratuitas para mostrar en chromecast
  lastMessage: string
  players: Player[]
}

export interface Player {
  id: string
  name: string
  joinedAt: Date
}

export interface Hint {
  id: string
  text: Record<Language, string>
  category: string
  roomId?: number
}

export interface GameState {
  rooms: Room[]
  currentLanguage: Language
  hints: Hint[]
}

// Allow dynamic languages beyond the core ones
export type Language = string

export interface SocketEvents {
  'update-room': (room: Room) => void
  'room-updated': (room: Room) => void
  'time-sync': (data: { roomId: number, timeRemaining: number, isRunning: boolean }) => void
  'hint-sent': (data: { roomId: number, hint: string, language: Language, isQuickMessage?: boolean }) => void
  'message-sent': (data: { roomId: number, message: string, language: Language, isQuickMessage?: boolean }) => void
  'reset-room': (roomId: number) => void
  'chromecast-status-change': (data: { roomId: number, connected: boolean, timestamp: string }) => void
  'connect': () => void
  'disconnect': () => void
}