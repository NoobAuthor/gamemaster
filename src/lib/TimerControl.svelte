<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { Room } from './types'
  import Modal from './Modal.svelte'

  export let room: Room

  const dispatch = createEventDispatcher()
  
  // Modal states
  let showCustomTimeModal = false
  let customMinutes = '60'

  function toggleTimer() {
    room.isRunning = !room.isRunning
    dispatch('timer-update', { isRunning: room.isRunning })
  }



  function adjustTime(minutes: number) {
    room.timeRemaining = Math.max(0, room.timeRemaining + (minutes * 60))
    dispatch('timer-update', { timeRemaining: room.timeRemaining })
  }

  function setCustomTime() {
    showCustomTimeModal = true
  }

  function handleCustomTime(event: CustomEvent) {
    const minutes = event.detail
    if (minutes && !isNaN(Number(minutes))) {
      room.timeRemaining = Number(minutes) * 60
      dispatch('timer-update', { timeRemaining: room.timeRemaining })
    }
  }

  $: timeColor = room.timeRemaining < 300 ? '#ff4757' : 
                 room.timeRemaining < 900 ? '#ffa502' : '#00d4ff'
  
  $: progressPercentage = (room.timeRemaining / (60 * 60)) * 100
</script>

<div class="timer-control">
  <h3>Control de Tiempo</h3>
  
  <!-- Display del tiempo -->
  <div class="timer-display" style="color: {timeColor}">
    <div class="time-text">
      {Math.floor(room.timeRemaining / 60)}:{(room.timeRemaining % 60).toString().padStart(2, '0')}
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: {progressPercentage}%; background-color: {timeColor}"></div>
    </div>
  </div>

  <!-- Controles principales -->
  <div class="main-controls">
    <button 
      class="play-pause-btn" 
      class:playing={room.isRunning}
      on:click={toggleTimer}
    >
      <span class="btn-icon play-pause-icon" class:playing={room.isRunning}></span>
      {room.isRunning ? 'Pausar' : 'Iniciar'}
    </button>
    

  </div>

  <!-- Ajustes rápidos de tiempo -->
  <div class="time-adjustments">
    <h4>Ajustes Rápidos</h4>
    <div class="adjustment-buttons">
      <button class="adj-btn minus" on:click={() => adjustTime(-5)}>-5 min</button>
      <button class="adj-btn minus" on:click={() => adjustTime(-2)}>-2 min</button>
      <button class="adj-btn plus" on:click={() => adjustTime(2)}>+2 min</button>
      <button class="adj-btn plus" on:click={() => adjustTime(5)}>+5 min</button>
    </div>
    
    <button class="custom-time-btn" on:click={setCustomTime}>
      <span class="btn-icon custom-time-icon"></span>
      Tiempo Personalizado
    </button>
  </div>

  <!-- Time up indicator -->
  {#if room.timeRemaining <= 0}
    <div class="time-up">
      <span class="btn-icon alert-icon"></span>
      ¡TIEMPO AGOTADO!
    </div>
  {/if}
</div>

<!-- Custom Time Modal -->
<Modal 
  bind:isOpen={showCustomTimeModal}
  title="Tiempo Personalizado"
  type="prompt"
  bind:inputValue={customMinutes}
  inputLabel="Ingresa los minutos para el temporizador:"
  inputPlaceholder="60"
  confirmText="Establecer"
  cancelText="Cancelar"
  on:confirm={handleCustomTime}
/>

<style>
  .timer-control h3 {
    margin-top: 0;
    margin-bottom: var(--space-xl);
    background: var(--gradient-accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-align: center;
    font-weight: 700;
    font-size: 1.25rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .timer-display {
    text-align: center;
    margin-bottom: 2rem;
  }

  .time-text {
    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: var(--space-lg);
    text-shadow: 0 0 20px currentColor;
    letter-spacing: 0.1em;
  }

  .progress-bar {
    width: 100%;
    height: 12px;
    background: var(--surface-bg);
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .progress-fill {
    height: 100%;
    transition: width 1s ease, background-color 0.3s ease;
    border-radius: var(--radius-md);
    box-shadow: 0 0 8px currentColor;
  }

  .main-controls {
    display: flex;
    gap: var(--space-lg);
    margin-bottom: var(--space-xl);
  }

  .play-pause-btn {
    flex: 1;
    background: var(--glass-bg);
    color: var(--text-primary);
    border: 1px solid var(--accent-green);
    padding: var(--space-lg);
    border-radius: var(--radius-md);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    text-transform: uppercase;
    letter-spacing: 0.025em;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    box-shadow: var(--shadow-sm);
  }

  .play-pause-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s ease;
  }

  .play-pause-btn:hover::before {
    left: 100%;
  }

  .play-pause-btn.playing {
    border-color: var(--accent-orange);
    background: rgba(255, 140, 66, 0.1);
  }

  .play-pause-btn:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .play-pause-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpolygon points='5,3 19,12 5,21'%3E%3C/polygon%3E%3C/svg%3E") center/contain no-repeat;
  }

  .play-pause-icon.playing::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Crect x='6' y='4' width='4' height='16'%3E%3C/rect%3E%3Crect x='14' y='4' width='4' height='16'%3E%3C/rect%3E%3C/svg%3E") center/contain no-repeat;
  }



  .time-adjustments h4 {
    margin-bottom: var(--space-sm);
    background: var(--gradient-accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .adjustment-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
  }

  .adj-btn {
    background: var(--glass-bg);
    color: var(--text-primary);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .adj-btn.minus {
    border-color: rgba(255, 87, 87, 0.5);
    color: var(--accent-red);
  }

  .adj-btn.plus {
    border-color: rgba(74, 222, 128, 0.5);
    color: var(--accent-green);
  }

  .adj-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .adj-btn.minus:hover {
    background: rgba(255, 87, 87, 0.1);
    border-color: var(--accent-red);
  }

  .adj-btn.plus:hover {
    background: rgba(74, 222, 128, 0.1);
    border-color: var(--accent-green);
  }

  .custom-time-btn {
    width: 100%;
    background: var(--glass-bg);
    color: var(--text-primary);
    border: 1px solid var(--accent-purple);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    text-transform: uppercase;
    letter-spacing: 0.025em;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
  }

  .custom-time-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s ease;
  }

  .custom-time-btn:hover::before {
    left: 100%;
  }

  .custom-time-btn:hover {
    background: rgba(157, 124, 255, 0.1);
    border-color: var(--accent-purple);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .custom-time-icon::before {
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpolyline points='12,6 12,12 16,14'%3E%3C/polyline%3E%3C/svg%3E") center/contain no-repeat;
  }

  .time-up {
    background: rgba(255, 87, 87, 0.2);
    border: 1px solid var(--accent-red);
    color: var(--accent-red);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    font-weight: 700;
    animation: blink 1s infinite;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    text-transform: uppercase;
    letter-spacing: 0.025em;
    backdrop-filter: blur(10px);
    margin-top: var(--space-xl);
  }

  .alert-icon {
    width: 16px;
    height: 16px;
    display: inline-block;
    position: relative;
  }

  .alert-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'%3E%3C/path%3E%3Cline x1='12' y1='9' x2='12' y2='13'%3E%3C/line%3E%3Cline x1='12' y1='17' x2='12.01' y2='17'%3E%3C/line%3E%3C/svg%3E") center/contain no-repeat;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.5; }
  }

  @media (max-width: 768px) {
    .time-text {
      font-size: 2rem;
    }
    
    .main-controls {
      flex-direction: column;
    }
    
    .adjustment-buttons {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>