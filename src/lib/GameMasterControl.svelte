<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import RoomTab from './RoomTab.svelte'
  import LanguageSelector from './LanguageSelector.svelte'
  import Settings from './Settings.svelte'
  import Button from './ui/Button.svelte'
  import Icon from './ui/Icon.svelte'
  import { socket } from './socket'
  import { loadConfig } from './config'
  import { getRooms } from './api'
  import type { Room, Language } from './types'
  import { roomsStore, setRooms, updateRoomInStore } from './stores/rooms'

  let activeRoom = 0
  let rooms: Room[] = []
  let unsubscribeRooms: (() => void) | null = null
  let currentLanguage: Language = 'es'
  let connected = false
  let showSettings = false

  // Base URL handling centralized elsewhere
  
  // Client-side timer smoothing
  let clientTimerInterval: ReturnType<typeof setInterval> | null = null
  let lastServerSync: { [roomId: number]: { time: number, timestamp: number } } = {}

  // Load initial room data from server
  async function loadInitialRooms() {
    try {
      const loaded = await getRooms()
      setRooms(loaded)
      console.log('✅ Loaded room data from server:', loaded)
    } catch (error) {
      console.error('❌ Error loading rooms:', error)
      // Fallback to empty rooms if server fails
      createEmptyRooms()
    }
  }

  // Fallback: create empty rooms only if server is unavailable
  function createEmptyRooms() {
    const empty = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      name: `Sala ${i + 1}`,
      timeRemaining: 60 * 60,
      isRunning: false,
      hintsRemaining: 3,
      freeHintsCount: 0,
      lastMessage: '',
      players: []
    }))
    setRooms(empty)
  }

  // Client-side timer smoothing functions
  function startClientTimer() {
    if (clientTimerInterval) return
    
    clientTimerInterval = setInterval(() => {
      const now = Date.now()
      let hasRunningRooms = false
      let changed = false
      const nextRooms = rooms.map(room => {
        if (room.isRunning && room.timeRemaining > 0) {
          hasRunningRooms = true
          const syncData = lastServerSync[room.id]
          if (syncData) {
            const timeSinceSync = (now - syncData.timestamp) / 1000
            const expectedTime = Math.max(0, Math.floor(syncData.time - timeSinceSync))
            if (expectedTime !== room.timeRemaining) {
              changed = true
              return { ...room, timeRemaining: expectedTime }
            }
            return room
          }
          const decremented = Math.max(0, room.timeRemaining - 1)
          if (decremented !== room.timeRemaining) {
            changed = true
            return { ...room, timeRemaining: decremented }
          }
        }
        return room
      })
      if (changed) setRooms(nextRooms)

      // Stop client timer if no rooms are running
      if (!hasRunningRooms) {
        stopClientTimer()
      }
    }, 1000)
  }
  
  function stopClientTimer() {
    if (clientTimerInterval) {
      clearInterval(clientTimerInterval)
      clientTimerInterval = null
    }
  }
  
  function updateServerSync(roomId: number, timeRemaining: number) {
    lastServerSync[roomId] = {
      time: Math.floor(timeRemaining), // Ensure whole seconds
      timestamp: Date.now()
    }
  }

  // Inicializar salas
  onMount(async () => {
    unsubscribeRooms = roomsStore.subscribe((v) => { rooms = v })
    // Load server config (obligatory languages, penalties, etc.)
    await loadConfig()
    // Load actual room data from server instead of creating empty rooms
    await loadInitialRooms()

    // Conectar a Socket.IO
    socket.connect()
    
    const onConnect = () => {
      connected = true
      console.log('Conectado al servidor')
      // Join the initial room (room 0) by default
      socket.emit('join-game-master-room', activeRoom)
      console.log(`🎮 Game master connected and joined room ${activeRoom}`)
    }

    const onDisconnect = () => {
      connected = false
      console.log('Desconectado del servidor')
    }

    const onRoomUpdated = (updatedRoom: Room) => {
      updateRoomInStore(updatedRoom)
      // Update sync data and manage client timer
      updateServerSync(updatedRoom.id, updatedRoom.timeRemaining)
      if (updatedRoom.isRunning && updatedRoom.timeRemaining > 0) {
        startClientTimer()
      }
    }

    const onTimeSync = (data: { roomId: number, timeRemaining: number, isRunning: boolean }) => {
      // Update server sync data first
      updateServerSync(data.roomId, data.timeRemaining)
      const current = rooms.find(r => r.id === data.roomId)
      if (current) {
        updateRoomInStore({ ...current, timeRemaining: data.timeRemaining, isRunning: data.isRunning })
      }
      // Manage client timer based on running state
      if (data.isRunning && data.timeRemaining > 0) {
        startClientTimer()
      } else {
        // Check if any rooms are still running
        const hasRunningRooms = rooms.some(r => r.isRunning && r.timeRemaining > 0)
        if (!hasRunningRooms) {
          stopClientTimer()
        }
      }
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('room-updated', onRoomUpdated)
    socket.on('time-sync', onTimeSync)
  })

  onDestroy(() => {
    socket.off('connect')
    socket.off('disconnect')
    socket.off('room-updated')
    socket.off('time-sync')
    stopClientTimer()
    if (unsubscribeRooms) unsubscribeRooms()
  })

  function switchRoom(roomId: number) {
    activeRoom = roomId
    
    // Join the socket room for this active room to receive events
    socket.emit('join-game-master-room', roomId)
    console.log(`🎮 Game master switched to room ${roomId}`)
  }

  function updateRoom(room: Room) {
    updateRoomInStore(room)
    socket.emit('update-room', room)
  }

  function openTvView() {
    const tvUrl = `${window.location.origin}/tv.html?room=${activeRoom}`
    window.open(tvUrl, '_blank', 'fullscreen=yes')
  }

  function openSettings() {
    showSettings = true
  }

  function closeSettings() {
    showSettings = false
  }

  function handleLanguagesChanged() {
    console.log('🌐 Languages changed, updating language selector...')
    // The LanguageSelector will automatically reload via the window event
  }

  function handleRoomUpdated(event: CustomEvent) {
    const updatedRoom = event.detail
    rooms = rooms.map(room => room.id === updatedRoom.id ? updatedRoom : room)
  }

  function handleHintsUpdated() {
    // Trigger a refresh of hints in the current room tab
    // This will cause the HintSystem component to reload hints from server
  }

  function handleMessagesUpdated(event: CustomEvent) {
    // Handle updated predefined messages
    console.log('Messages updated:', event.detail)
    // This could be used to update the MessageSystem component's predefined messages
  }
</script>

<div class="gamemaster-container">
  <header class="header">
    <h1>🎮 Game Master - Control de Salas de Escape</h1>
    <div class="header-controls">
      <Button variant="glass" size="md" on:click={openSettings} title="Abrir configuración">
        <Icon name="settings" /> Configuración
      </Button>
      <LanguageSelector bind:currentLanguage />
      <Button variant="glass" size="md" on:click={openTvView} title="Abrir vista TV">
        <Icon name="tv" /> Vista TV
      </Button>
      <div class="connection-status" class:connected>
        <span class="status-light" class:connected></span>
        {connected ? 'Conectado' : 'Desconectado'}
      </div>
    </div>
  </header>

  <nav class="room-tabs">
    {#each rooms as room, index}
      <button 
        class="room-tab" 
        class:active={activeRoom === index}
        class:running={room.isRunning}
        on:click={() => switchRoom(index)}
      >
        <div class="tab-content">
          <span class="room-name">{room.name}</span>
          <span class="room-status">
            {Math.floor(room.timeRemaining / 60)}:{(room.timeRemaining % 60).toString().padStart(2, '0')}
          </span>
          <span class="hints-count">
            <span class="btn-icon hint-icon"></span>
            {room.hintsRemaining}
          </span>
        </div>
      </button>
    {/each}
  </nav>

  <main class="room-content">
    {#if rooms[activeRoom]}
      <RoomTab 
        bind:room={rooms[activeRoom]} 
        {currentLanguage}
        on:room-update={(e) => updateRoom(e.detail)}
      />
    {/if}
  </main>

  <!-- Settings Modal -->
  <Settings 
    bind:isOpen={showSettings}
    {rooms}
    {currentLanguage}
    on:close={closeSettings}
    on:languages-changed={handleLanguagesChanged}
    on:room-updated={handleRoomUpdated}
    on:hints-updated={handleHintsUpdated}
    on:messages-updated={handleMessagesUpdated}
  />
</div>

<style>
  .gamemaster-container {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto auto 1fr;
    position: relative;
  }

  .header {
    background: var(--glass-bg);
    padding: var(--space-lg) var(--space-xl);
    display: flex;
    justify-content: space-between;
    align-items: center;
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 10;
  }

  .header::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--gradient-accent);
    opacity: 0.5;
  }

  .header h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    background: var(--gradient-accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    position: relative;
  }



  .header-controls {
    display: flex;
    gap: var(--space-md);
    align-items: center;
    flex-wrap: wrap;
  }

  .settings-btn, .tv-btn {
    background: var(--glass-bg);
    color: var(--text-primary);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: var(--space-md);
    box-shadow: var(--shadow-sm);
    backdrop-filter: blur(10px);
    text-transform: uppercase;
    letter-spacing: 0.025em;

  }



  .settings-btn:hover, .tv-btn:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
    border-color: var(--accent-blue);
    background: rgba(100, 217, 255, 0.1);
  }

  .btn-icon {
    width: 16px;
    height: 16px;
    display: inline-block;
    position: relative;
  }

  .settings-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    border-radius: 50%;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='3'%3E%3C/circle%3E%3Cpath d='M12 1v6m0 10v6m11-7h-6m-10 0H1m15.5-6.5-3-3m-9 9-3-3m0-9 3 3m9 9 3 3'%3E%3C/path%3E%3C/svg%3E") center/contain no-repeat;
  }

  .tv-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Crect x='2' y='3' width='20' height='14' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='8' y1='21' x2='16' y2='21'%3E%3C/line%3E%3Cline x1='12' y1='17' x2='12' y2='21'%3E%3C/line%3E%3C/svg%3E") center/contain no-repeat;
  }

  .hint-icon {
    width: 12px;
    height: 12px;
  }

  .hint-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpath d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'%3E%3C/path%3E%3Cline x1='12' y1='17' x2='12.01' y2='17'%3E%3C/line%3E%3C/svg%3E") center/contain no-repeat;
  }

  .connection-status {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-lg);
    background: rgba(255, 87, 87, 0.15);
    border: 1px solid var(--accent-red);
    transition: all 0.3s ease;
    font-size: 0.875rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    backdrop-filter: blur(10px);
  }

  .connection-status.connected {
    background: rgba(74, 222, 128, 0.15);
    border-color: var(--accent-green);
    color: var(--accent-green);
  }

  .connection-status:not(.connected) {
    color: var(--accent-red);
  }

  .connection-status .status-light {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-red);
    transition: all 0.3s ease;
    flex-shrink: 0;
  }

  .connection-status .status-light.connected {
    background: var(--accent-green);
    box-shadow: 0 0 8px var(--accent-green);
  }

  .room-tabs {
    display: flex;
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    position: relative;
  }

  .room-tabs::-webkit-scrollbar {
    display: none;
  }

  .room-tab {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: var(--space-lg);
    cursor: pointer;
    transition: all 0.3s ease;
    border-bottom: 3px solid transparent;
    min-width: 180px;
    position: relative;
    font-weight: 500;
  }

  .room-tab::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--gradient-accent);
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: -1;
  }

  .room-tab:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }

  .room-tab.active {
    background: rgba(100, 217, 255, 0.1);
    color: var(--text-primary);
    border-bottom-color: var(--accent-blue);
    box-shadow: 0 -2px 8px rgba(100, 217, 255, 0.2);
  }

  .room-tab.running {
    border-bottom-color: var(--accent-orange);
    background: rgba(255, 140, 66, 0.1);
    position: relative;
  }

  .room-tab.running::after {
    content: '';
    position: absolute;
    top: var(--space-sm);
    right: var(--space-sm);
    width: 8px;
    height: 8px;
    background: var(--accent-orange);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .room-tab.running.active {
    border-bottom-color: var(--accent-orange);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    text-align: center;
    align-items: center;
  }

  .room-name {
    font-weight: 700;
    font-size: 0.875rem;
    color: inherit;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .room-status {
    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 1.25rem;
    font-weight: 800;
    background: var(--gradient-accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 0 10px rgba(100, 217, 255, 0.3);
  }

  .hints-count {
    font-size: 0.75rem;
    opacity: 0.8;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .room-content {
    flex: 1;
    padding: var(--space-xl);
    overflow-y: auto;
    position: relative;
  }

  @media (max-width: 768px) {
    .header {
      flex-direction: column;
      gap: var(--space-lg);
      padding: var(--space-lg);
    }

    .header h1 {
      font-size: 1.25rem;
    }

    .header-controls {
      justify-content: center;
      gap: var(--space-sm);
    }

    .room-tabs {
      flex-wrap: nowrap;
      overflow-x: scroll;
    }

    .room-tab {
      min-width: 140px;
      padding: var(--space-md);
    }

    .room-content {
      padding: var(--space-lg);
    }

    .tab-content {
      gap: var(--space-xs);
    }

    .room-status {
      font-size: 1rem;
    }
  }
</style>