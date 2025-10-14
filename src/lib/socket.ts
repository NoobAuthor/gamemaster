import { io, type Socket } from 'socket.io-client'
import type { SocketEvents } from './types'
import { getWebSocketBase, isDev } from './env'

// Configurar la URL del servidor
// En desarrollo, usar el hostname actual para funcionar desde otros dispositivos de la misma red
const SERVER_URL = getWebSocketBase()

if (isDev) console.log('🔗 Conectando a servidor Socket.IO:', SERVER_URL)

export const socket: Socket<SocketEvents> = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000
})

// Agregar logs para debugging
socket.on('connect', () => {
  if (isDev) console.log('✅ Conectado al servidor Socket.IO')
})

socket.on('disconnect', (reason) => {
  if (isDev) console.log('❌ Desconectado del servidor:', reason)
})

socket.on('connect_error', (error) => {
  console.error('🔥 Error de conexión:', error)
})