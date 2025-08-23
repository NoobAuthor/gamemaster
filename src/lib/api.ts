// Centralized client API helpers
import type { Language, Room, Hint } from './types'
    
const BASE = import.meta.env.PROD ? window.location.origin : `http://${window.location.hostname}:3001`

export async function getConfig() {
  const r = await fetch(`${BASE}/api/config`)
  if (!r.ok) throw new Error('Failed to load config')
  return r.json() as Promise<{ obligatoryLanguages: string[]; defaultFreeHints: number; hintPenaltySeconds: number }>
}

export async function getLanguages() {
  const r = await fetch(`${BASE}/api/languages`)
  if (!r.ok) throw new Error('Failed to load languages')
  return r.json() as Promise<Array<{ code: string; name: string; flag: string; is_default?: number }>>
}

export async function createLanguage(body: { code: string; name: string; flag?: string }) {
  const r = await fetch(`${BASE}/api/languages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  if (!r.ok) throw new Error('Failed to create language')
  return r.json()
}

export async function updateLanguage(code: string, body: { name: string; flag?: string }) {
  const r = await fetch(`${BASE}/api/languages/${code}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  if (!r.ok) throw new Error('Failed to update language')
  return r.json()
}

export async function deleteLanguage(code: string) {
  const r = await fetch(`${BASE}/api/languages/${code}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Failed to delete language')
  return r.json()
}

export async function getRooms() {
  const r = await fetch(`${BASE}/api/rooms`)
  if (!r.ok) throw new Error('Failed to load rooms')
  return r.json() as Promise<Room[]>
}

export async function updateRoomName(id: number, name: string) {
  const r = await fetch(`${BASE}/api/rooms/${id}/name`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
  })
  if (!r.ok) throw new Error('Failed to update room name')
  return r.json() as Promise<Room>
}

export async function getRoomHints(roomId: number) {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/hints`)
  if (!r.ok) throw new Error('Failed to load hints')
  return r.json() as Promise<Hint[]>
}

export async function reorderRoomHints(roomId: number, orderedIds: string[]) {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/hints/reorder`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderedIds })
  })
  if (!r.ok) throw new Error('Failed to reorder hints')
  return r.json()
}

export async function createRoomHint(roomId: number, payload: { text: Record<string, string>; category: string }) {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/hints`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })
  if (!r.ok) throw new Error('Failed to create hint')
  return r.json()
}

export async function updateHint(hintId: string, payload: { text: Record<string, string>; category: string }) {
  const r = await fetch(`${BASE}/api/hints/${hintId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })
  if (!r.ok) throw new Error('Failed to update hint')
  return r.json()
}

export async function deleteHint(hintId: string) {
  const r = await fetch(`${BASE}/api/hints/${hintId}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Failed to delete hint')
  return r.json()
}

export async function getRoomMessagesGrouped(roomId: number) {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/messages`)
  if (!r.ok) throw new Error('Failed to load messages')
  return r.json() as Promise<Record<string, Array<{ id: number; message: string }>>>
}

export async function createRoomMessage(roomId: number, language: string, message: string) {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language, message })
  })
  if (!r.ok) throw new Error('Failed to create message')
  return r.json()
}

export async function deleteRoomMessage(roomId: number, messageId: number) {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/messages/${messageId}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Failed to delete message')
  return r.json()
}

// Chromecast
export async function getChromecastStatus(roomId: number) {
  const r = await fetch(`${BASE}/api/chromecast-status/${roomId}`)
  if (!r.ok) throw new Error('Failed to fetch chromecast status')
  // Some proxies may incorrectly return HTML; guard JSON parsing
  const text = await r.text()
  if (text.trim().startsWith('<')) throw new Error('Invalid response format')
  return JSON.parse(text) as {
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
  }
}

// Categories
export async function getRoomCategories(roomId: number) {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/categories`)
  if (!r.ok) throw new Error('Failed to load categories')
  return r.json() as Promise<Array<{ id?: number; room_id?: number; name: string }>>
}

export async function reorderRoomCategories(roomId: number, orderedCategoryIds: number[]) {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/categories/reorder`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderedCategoryIds })
  })
  if (!r.ok) throw new Error('Failed to reorder categories')
  return r.json()
}

export async function createRoomCategory(roomId: number, name: string) {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/categories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
  })
  if (!r.ok) throw new Error('Failed to create category')
  return r.json()
}

export async function updateRoomCategory(roomId: number, oldName: string, newName: string) {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/categories/${encodeURIComponent(oldName)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newName })
  })
  if (!r.ok) throw new Error('Failed to update category')
  return r.json()
}

export async function deleteRoomCategory(roomId: number, name: string) {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/categories/${encodeURIComponent(name)}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Failed to delete category')
  return r.json()
}

// Hint History API
export async function getRoomHintHistory(roomId: number) {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/hint-history`)
  if (!r.ok) throw new Error('Failed to load hint history')
  return r.json() as Promise<Array<{ id: number; hint_id: string; hint_text: string; language: string; sent_at: string }>>
}

export async function clearRoomHintHistory(roomId: number) {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/hint-history`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Failed to clear hint history')
  return r.json()
}


