import { writable } from 'svelte/store'
import type { Room } from '../types'

export const roomsStore = writable<Room[]>([])

export function setRooms(next: Room[]) {
  roomsStore.set(next)
}

export function updateRoomInStore(updatedRoom: Room) {
  roomsStore.update((list) => list.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)))
}


