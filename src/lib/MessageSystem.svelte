<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { socket } from './socket'
  import { getRoomMessagesGrouped, getLanguages, createRoomMessage } from './api'
  import type { Room, Language } from './types'

  export let room: Room
  export let currentLanguage: Language

  const dispatch = createEventDispatcher()

  // Room-specific messages loaded from server (dynamic by language)
  let roomMessages: Record<string, string[]> = {}

  let loadingMessages = true
  let currentRoomId: number | undefined = undefined
  
  // Custom message functionality (similar to custom hints)
  let showCustomMessage = false
  let customMessageByRoom: Record<number, string> = {}

  // All HTTP calls go through centralized API helpers

  onMount(async () => {
    currentRoomId = room.id
    
    // Initialize customMessageByRoom for this room if it doesn't exist
    if (room.id !== undefined && !(room.id in customMessageByRoom)) {
      customMessageByRoom[room.id] = ''
      // Force reactivity update
      customMessageByRoom = customMessageByRoom
    }
    
    await loadMessagesFromServer()
  })

  // Reactive statement to reload messages only when room ID actually changes
  $: if (room.id !== undefined && room.id !== currentRoomId) {
    currentRoomId = room.id
    
    // Initialize customMessageByRoom for the new room if it doesn't exist
    if (!(room.id in customMessageByRoom)) {
      customMessageByRoom[room.id] = ''
      // Force reactivity update
      customMessageByRoom = customMessageByRoom
    }
    
    loadMessagesFromServer()
  }
  
  // Ensure customMessageByRoom is always initialized for the current room
  $: if (room.id !== undefined && !(room.id in customMessageByRoom)) {
    customMessageByRoom[room.id] = ''
    // Force reactivity update
    customMessageByRoom = customMessageByRoom
  }

  async function loadMessagesFromServer() {
    try {
      loadingMessages = true
      
      // Load messages grouped by language in one request
      const grouped = await getRoomMessagesGrouped(room.id)
      const langs = await getLanguages()
      // Clear removed languages
      for (const key of Object.keys(roomMessages)) {
        if (!langs.find((l: any) => l.code === key)) delete roomMessages[key]
      }
      for (const { code } of langs) {
        roomMessages[code] = (grouped[code] || []).map((m: any) => m.message)
      }
      
      console.log('✅ Mensajes cargados para sala', room.id)
      
      // Don't auto-initialize default messages - let admin create them manually if needed
    } catch (error) {
      console.error('❌ Error cargando mensajes:', error)
      // Initialize empty messages instead of hardcoded defaults
      roomMessages = {}
    } finally {
      loadingMessages = false
    }
  }



  function sendMessage(message: string) {
    if (!message.trim()) {
      alert('Escribe un mensaje válido')
      return
    }

    const messageData = {
      message: message,
      timestamp: new Date(),
      language: currentLanguage
    }
    
    socket.emit('message-sent', {
      roomId: room.id,
      message: message,
      language: currentLanguage
    })

    dispatch('message-sent', messageData)

  }

  function sendPredefinedMessage(message: string) {
    if (!message.trim()) {
      alert('Escribe un mensaje válido')
      return
    }

    const messageData = {
      message: message,
      timestamp: new Date(),
      language: currentLanguage,
      isQuickMessage: true
    }
    
    socket.emit('message-sent', {
      roomId: room.id,
      message: message,
      language: currentLanguage,
      isQuickMessage: true
    })

    dispatch('message-sent', messageData)
  }

  function sendCustomMessage() {
    // Safety check for room ID
    if (!room || room.id === undefined) {
      return
    }
    
    const currentMessage = customMessageByRoom[room.id] || ''
    
    if (currentMessage && currentMessage.trim()) {
      sendMessage(currentMessage)
      
      // Clear custom message input and switch back to predefined view after sending
      customMessageByRoom[room.id] = ''
      customMessageByRoom = customMessageByRoom
      showCustomMessage = false
    }
  }

  function toggleCustomMessage() {
    showCustomMessage = !showCustomMessage
  }

  function handleCustomMessageKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      const currentMessage = customMessageByRoom[room.id] || ''
      
      if (currentMessage && currentMessage.trim()) {
        sendCustomMessage()
      }
    }
  }


</script>

<div class="message-system">
  <h3>Sistema de Mensajes</h3>

  <!-- Selector de tipo de mensaje -->
  <div class="message-type-selector">
    <button 
      class="type-btn" 
      class:active={!showCustomMessage}
      on:click={() => showCustomMessage = false}
    >
      <span class="btn-icon library-icon"></span>
      Predefinidos
    </button>
    <button 
      class="type-btn" 
      class:active={showCustomMessage}
      on:click={toggleCustomMessage}
    >
      <span class="btn-icon edit-icon"></span>
      Personalizado
    </button>
  </div>

  {#if !showCustomMessage}
    <!-- Mensajes predefinidos -->
    <div class="predefined-messages">
    {#if loadingMessages}
      <div class="loading-messages">
        <p>Cargando mensajes...</p>
      </div>
    {:else}
      <div class="quick-messages">
        {#each roomMessages[currentLanguage] as message}
          <button 
            class="quick-message-btn"
            on:click={() => sendPredefinedMessage(message)}
          >
            {message}
          </button>
        {/each}
        {#if roomMessages[currentLanguage].length === 0}
          <p class="no-messages">No hay mensajes configurados para esta sala</p>
        {/if}
      </div>
    {/if}
    </div>
  {:else}
    <!-- Mensaje personalizado -->
    <div class="custom-message">
      <h4>Escribir mensaje personalizado:</h4>
      <textarea 
        bind:value={customMessageByRoom[room.id]}
        placeholder="Escribe tu mensaje personalizado aquí... (Presiona Enter para enviar)"
        rows="4"
        on:keydown={handleCustomMessageKeydown}
      ></textarea>
      
      <button 
        class="send-message-btn" 
        disabled={!customMessageByRoom[room.id]?.trim()}
        on:click={sendCustomMessage}
      >
        <span class="btn-icon send-icon"></span>
        Enviar Mensaje Personalizado
      </button>
    </div>
  {/if}

  <!-- Último mensaje enviado -->
  {#if room.lastMessage}
    <div class="last-message">
      <h4>Último mensaje enviado:</h4>
      <div class="message-display">
        "{room.lastMessage}"
      </div>
    </div>
  {/if}



  <!-- Información del idioma -->
  <div class="language-info">
    <small>
      🌐 Enviando mensajes en: <strong>{currentLanguage.toUpperCase()}</strong>
    </small>
  </div>
</div>

<style>
  .message-system h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    color: #00d4ff;
    text-align: center;
  }

  .message-type-selector {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .type-btn {
    flex: 1;
    background: var(--glass-bg);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--text-secondary);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    text-transform: uppercase;
    letter-spacing: 0.025em;
    backdrop-filter: blur(10px);
    box-shadow: var(--shadow-sm);
  }

  .type-btn.active {
    background: rgba(100, 217, 255, 0.1);
    color: var(--text-primary);
    border-color: var(--accent-blue);
    box-shadow: var(--shadow-md);
  }

  .type-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--accent-blue);
    transform: translateY(-1px);
  }

  .last-message h4, .custom-message h4 {
    margin-bottom: 1rem;
    color: #00d4ff;
    font-size: 1rem;
  }

  .custom-message textarea {
    width: 100%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    padding: 1rem;
    color: white;
    font-family: inherit;
    resize: vertical;
    margin-bottom: 1rem;
  }

  .custom-message textarea::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .custom-message textarea:focus {
    outline: none;
    border-color: #00d4ff;
  }

  .send-message-btn {
    width: 100%;
    background: #00d4ff;
    color: white;
    border: none;
    padding: 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    font-size: 1rem;
    transition: all 0.3s ease;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .send-message-btn:hover:not(:disabled) {
    background: #0099cc;
    transform: translateY(-2px);
  }

  .send-message-btn:disabled {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);
    cursor: not-allowed;
  }

  .quick-messages {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .quick-message-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: all 0.3s ease;
    font-size: 0.9rem;
    text-transform: none;
    letter-spacing: normal;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .quick-message-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #00d4ff;
  }



  .last-message {
    margin-bottom: 1.5rem;
  }

  .message-display {
    background: rgba(0, 212, 255, 0.1);
    border: 1px solid #00d4ff;
    border-radius: 8px;
    padding: 1rem;
    font-style: italic;
    color: #00d4ff;
  }



  .language-info {
    text-align: center;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .language-info small {
    color: rgba(255, 255, 255, 0.7);
  }

  .language-info strong {
    color: #00d4ff;
  }

  .loading-messages {
    text-align: center;
    padding: 1rem;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
  }

  .no-messages {
    text-align: center;
    padding: 1rem;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px dashed rgba(255, 255, 255, 0.2);
  }

  @media (max-width: 768px) {
    .quick-messages {
      max-height: 150px;
      overflow-y: auto;
    }

    .message-type-selector {
      flex-direction: column;
    }
  }

  /* Icon styles */
  .btn-icon {
    width: 16px;
    height: 16px;
    display: inline-block;
    position: relative;
  }

  .library-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20'%3E%3C/path%3E%3Cpath d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'%3E%3C/path%3E%3C/svg%3E") center/contain no-repeat;
  }

  .edit-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'%3E%3C/path%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'%3E%3C/path%3E%3C/svg%3E") center/contain no-repeat;
  }

  .send-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cline x1='22' y1='2' x2='11' y2='13'%3E%3C/line%3E%3Cpolygon points='22,2 15,22 11,13 2,9 22,2'%3E%3C/polygon%3E%3C/svg%3E") center/contain no-repeat;
  }
</style>