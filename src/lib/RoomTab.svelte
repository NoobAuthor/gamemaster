<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import TimerControl from './TimerControl.svelte'
  import HintSystem from './HintSystem.svelte'
  import HintsHistory from './HintsHistory.svelte'
  import MessageSystem from './MessageSystem.svelte'
  import Modal from './Modal.svelte'
  import { socket } from './socket'
  import type { Room, Language } from './types'

  export let room: Room
  export let currentLanguage: Language

  const dispatch = createEventDispatcher()
  
  // Modal states
  let showResetModal = false

  // Timer logic moved to server-side for proper synchronization

  function resetRoom() {
    showResetModal = true
  }

  function handleResetConfirm() {
    room.timeRemaining = 60 * 60 // 60 minutos
    room.isRunning = false
    room.hintsRemaining = 3
    room.lastMessage = ''
    room.players = []
    
    socket.emit('reset-room', room.id)
    dispatch('room-update', room)
  }

  function onTimerUpdate(event: CustomEvent) {
    room = { ...room, ...event.detail }
    dispatch('room-update', room)
  }

  function onHintSent(event: CustomEvent) {
    // The server handles hint count decrement and broadcasts room updates
    // No need to manually decrement here as it causes double-decrement
    dispatch('room-update', room)
  }

  function onMessageSent(event: CustomEvent) {
    room.lastMessage = event.detail.message
    dispatch('room-update', room)
  }
</script>

<div class="room-container">
  <div class="room-header">
    <h2>{room.name}</h2>
    <button class="reset-btn" on:click={resetRoom}>
      <span class="btn-icon reset-icon"></span>
      Reiniciar Sala
    </button>
  </div>

  <div class="room-grid">
    <!-- Columna izquierda: Timer y controles -->
    <div class="timer-section">
      <TimerControl bind:room on:timer-update={onTimerUpdate} />
    </div>

    <!-- Columna central: Sistema de pistas -->
    <div class="hints-section">
      <HintSystem 
        bind:room 
        {currentLanguage} 
        on:hint-sent={onHintSent}
      />
      <HintsHistory 
        bind:room 
        {currentLanguage}
      />
    </div>

    <!-- Columna derecha: Mensajes y estado -->
    <div class="messages-section">
      <MessageSystem 
        bind:room 
        {currentLanguage}
        on:message-sent={onMessageSent}
      />
    </div>
  </div>


</div>

<!-- Reset Room Modal -->
<Modal 
  bind:isOpen={showResetModal}
  title="Reiniciar Sala"
  confirmText="Reiniciar"
  cancelText="Cancelar"
  on:confirm={handleResetConfirm}
>
  <p>¿Estás seguro de que quieres reiniciar esta sala?</p>
  <p><strong>Esto restablecerá:</strong></p>
  <ul>
    <li>Temporizador (60 minutos)</li>
    <li>Pistas disponibles (3)</li>
    <li>Estado del temporizador (pausado)</li>
    <li>Mensajes y jugadores</li>
    <li>Historial de pistas utilizadas</li>
  </ul>
</Modal>

<style>
  .room-container {
    max-width: 1400px;
    margin: 0 auto;
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }

  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xl);
    padding-bottom: var(--space-lg);
    position: relative;
  }

  .room-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--gradient-accent);
    opacity: 0.3;
  }

  .room-header h2 {
    margin: 0;
    font-size: 2rem;
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



  .reset-btn {
    background: var(--glass-bg);
    color: var(--text-primary);
    border: 1px solid rgba(255, 87, 87, 0.3);
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    display: flex;
    align-items: center;
    gap: var(--space-md);
    backdrop-filter: blur(10px);
    box-shadow: var(--shadow-sm);
  }



  .reset-btn:hover {
    background: rgba(255, 87, 87, 0.1);
    border-color: var(--accent-red);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .btn-icon {
    width: 16px;
    height: 16px;
    display: inline-block;
    position: relative;
  }

  .reset-icon::before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'%3E%3C/path%3E%3Cpath d='M21 3v5h-5'%3E%3C/path%3E%3Cpath d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'%3E%3C/path%3E%3Cpath d='M8 16l-5 5v-5h5'%3E%3C/path%3E%3C/svg%3E") center/contain no-repeat;
  }

  .room-grid {
    display: grid;
    grid-template-columns: 350px 1fr 350px;
    gap: var(--space-xl);
    flex: 1;
    align-items: start;
  }

  .timer-section, .hints-section, .messages-section {
    background: var(--gradient-card);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: var(--shadow-md);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .timer-section::before, .hints-section::before, .messages-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--gradient-accent);
    opacity: 0.5;
  }

  .timer-section:hover, .hints-section:hover, .messages-section:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    border-color: rgba(100, 217, 255, 0.3);
  }

  /* Specific section styling */
  .timer-section {
    border-top: 3px solid var(--accent-green);
  }

  .hints-section {
    border-top: 3px solid var(--accent-blue);
  }

  .messages-section {
    border-top: 3px solid var(--accent-purple);
  }

  @media (max-width: 1200px) {
    .room-grid {
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg);
    }

    .timer-section {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 768px) {
    .room-header {
      flex-direction: column;
      gap: var(--space-lg);
      text-align: center;
    }

    .room-header h2 {
      font-size: 1.5rem;
    }

    .room-grid {
      grid-template-columns: 1fr;
      gap: var(--space-lg);
    }

    .timer-section, .hints-section, .messages-section {
      padding: var(--space-lg);
    }
  }
</style>