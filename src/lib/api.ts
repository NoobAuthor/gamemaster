// Centralized client API helpers
import type { Language, Room, Hint, LanguageInfo, GroupedRoomMessages } from './types'
import { getServerBase } from './env'

const BASE = getServerBase()

// Small utilities to standardize network requests

async function safeJson(r: Response) {
  const text = await r.text()
  if (!text) return null
  if (text.trim().startsWith('<')) throw new Error('Invalid response format')
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error('Invalid JSON response')
  }
}

async function apiFetch<T = unknown>(path: string, init?: RequestInit & { timeoutMs?: number }) {
  const { timeoutMs = 15000, signal, ...rest } = init || {}
  const url = `${BASE}${path}`
  const controller = new AbortController()
  const userSignal = signal
  if (userSignal) {
    if (userSignal.aborted) controller.abort()
    else userSignal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  let r: Response
  try {
    r = await fetch(url, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`Request failed ${r.status}: ${body || r.statusText}`)
  }
  return (await safeJson(r)) as T
}

export async function getConfig() {
  return apiFetch<{ obligatoryLanguages: string[]; defaultFreeHints: number; hintPenaltySeconds: number }>(
    '/api/config'
  )
}

export async function getLanguages(options?: { signal?: AbortSignal }) {
  return apiFetch<LanguageInfo[]>('/api/languages', {
    signal: options?.signal
  })
}

export async function createLanguage(body: { code: string; name: string; flag?: string }) {
  return apiFetch('/api/languages', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
}

export async function updateLanguage(code: string, body: { name: string; flag?: string }) {
  return apiFetch(`/api/languages/${code}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
}

export async function deleteLanguage(code: string) {
  return apiFetch(`/api/languages/${code}`, { method: 'DELETE' })
}

export async function getRooms() {
  return apiFetch<Room[]>('/api/rooms')
}

export async function updateRoomName(id: number, name: string) {
  return apiFetch<Room>(`/api/rooms/${id}/name`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
  })
}

export async function getRoomHints(roomId: number, options?: { signal?: AbortSignal }) {
  return apiFetch<Hint[]>(`/api/rooms/${roomId}/hints`, { signal: options?.signal })
}

export async function reorderRoomHints(roomId: number, orderedIds: string[]) {
  return apiFetch(`/api/rooms/${roomId}/hints/reorder`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderedIds })
  })
}

export async function createRoomHint(roomId: number, payload: { text: Record<string, string>; category: string }) {
  return apiFetch(`/api/rooms/${roomId}/hints`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })
}

export async function updateHint(hintId: string, payload: { text: Record<string, string>; category: string }) {
  return apiFetch(`/api/hints/${hintId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })
}

export async function deleteHint(hintId: string) {
  return apiFetch(`/api/hints/${hintId}`, { method: 'DELETE' })
}

export async function getRoomMessagesGrouped(roomId: number, options?: { signal?: AbortSignal }) {
  return apiFetch<GroupedRoomMessages>(`/api/rooms/${roomId}/messages`, {
    signal: options?.signal
  })
}

export async function createRoomMessage(roomId: number, language: string, message: string) {
  return apiFetch(`/api/rooms/${roomId}/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language, message })
  })
}

export async function deleteRoomMessage(roomId: number, messageId: number) {
  return apiFetch(`/api/rooms/${roomId}/messages/${messageId}`, { method: 'DELETE' })
}

// Chromecast
export async function getChromecastStatus(roomId: number) {
  return apiFetch<{
    connected: boolean
    casting: boolean
    castingClients: number
    tvWindows: number
    castingDetails: Array<{
      socketId: string
      detectionMethod: string
      lastUpdate: string
    }>
    roomId: number
    timestamp: string
  }>(`/api/chromecast-status/${roomId}`)
}

// Categories
export async function getRoomCategories(roomId: number, options?: { signal?: AbortSignal }) {
  return apiFetch<Array<{ id?: number; room_id?: number; name: string }>>(`/api/rooms/${roomId}/categories`, {
    signal: options?.signal
  })
}

export async function reorderRoomCategories(roomId: number, orderedCategoryIds: number[]) {
  return apiFetch(`/api/rooms/${roomId}/categories/reorder`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderedCategoryIds })
  })
}

export async function createRoomCategory(roomId: number, name: string) {
  return apiFetch(`/api/rooms/${roomId}/categories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
  })
}

export async function updateRoomCategory(roomId: number, oldName: string, newName: string) {
  return apiFetch(`/api/rooms/${roomId}/categories/${encodeURIComponent(oldName)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newName })
  })
}

export async function deleteRoomCategory(roomId: number, name: string) {
  return apiFetch(`/api/rooms/${roomId}/categories/${encodeURIComponent(name)}`, { method: 'DELETE' })
}

// Hint History API
export async function getRoomHintHistory(roomId: number, options?: { signal?: AbortSignal }) {
  return apiFetch<Array<{ id: number; hint_id: string; hint_text: string; language: string; sent_at: string }>>(
    `/api/rooms/${roomId}/hint-history`,
    { signal: options?.signal }
  )
}

export async function clearRoomHintHistory(roomId: number) {
  return apiFetch(`/api/rooms/${roomId}/hint-history`, { method: 'DELETE' })
}


