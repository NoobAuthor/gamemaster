import { writable, type Writable } from 'svelte/store'

export type ToastType = 'success' | 'error' | 'info'

export type Toast = {
  id: number
  type: ToastType
  message: string
  durationMs: number
}

let nextId = 1

export const toasts: Writable<Toast[]> = writable([])

function show(message: string, type: ToastType = 'info', durationMs = 3000) {
  const id = nextId++
  const toast: Toast = { id, type, message, durationMs }
  toasts.update(list => [...list, toast])
  // Auto-remove
  window.setTimeout(() => {
    toasts.update(list => list.filter(t => t.id !== id))
  }, durationMs)
}

export const toast = {
  success(message: string, durationMs?: number) {
    show(message, 'success', durationMs ?? 2500)
  },
  error(message: string, durationMs?: number) {
    show(message, 'error', durationMs ?? 4000)
  },
  info(message: string, durationMs?: number) {
    show(message, 'info', durationMs ?? 3000)
  }
}


