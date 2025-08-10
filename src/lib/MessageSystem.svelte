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

  // All HTTP calls go through centralized API helpers

  onMount(async () => {
    currentRoomId = room.id
    await loadMessagesFromServer()
  })

  // Reactive statement to reload messages only when room ID actually changes
  $: if (room.id !== undefined && room.id !== currentRoomId) {
    currentRoomId = room.id
    loadMessagesFromServer()
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
      
      // Don't automatically initialize default messages - let admin decide
      // if ((roomMessages[currentLanguage] || []).length === 0) {
      //   await initializeDefaultMessages()
      // }
    } catch (error) {
      console.error('❌ Error cargando mensajes:', error)
      // Don't fallback to default messages - start with empty
      roomMessages = {}
    } finally {
      loadingMessages = false
    }
  }

  async function initializeDefaultMessages() {
    const defaultMessages = getDefaultMessages()
    
    try {
      for (const [lang, messages] of Object.entries(defaultMessages)) {
        for (const message of messages) {
          await createRoomMessage(room.id, lang, message)
        }
      }
      
      // Reload messages after initialization
      await loadMessagesFromServer()
    } catch (error) {
      console.error('❌ Error inicializando mensajes:', error)
    }
  }

  function getDefaultMessages() {
    return {
      es: [
        '¡Excelente trabajo equipo!',
        'Van por buen camino',
        'Se están acercando a la solución',
        '¡Muy bien! Sigan así',
        'Tómense un momento para revisar',
        'Trabajan muy bien en equipo',
        '¡Están a punto de resolverlo!',
        'Recuerden que tienen pistas disponibles'
      ],
      en: [
        'Excellent work team!',
        'You\'re on the right track',
        'You\'re getting closer to the solution',
        'Very good! Keep it up',
        'Take a moment to review',
        'You work very well as a team',
        'You\'re about to solve it!',
        'Remember you have hints available'
      ],
      fr: [
        'Excellent travail équipe !',
        'Vous êtes sur la bonne voie',
        'Vous vous rapprochez de la solution',
        'Très bien ! Continuez comme ça',
        'Prenez un moment pour réviser',
        'Vous travaillez très bien en équipe',
        'Vous êtes sur le point de le résoudre !',
        'Rappelez-vous que vous avez des indices disponibles'
      ],
      de: [
        'Ausgezeichnete Arbeit Team!',
        'Ihr seid auf dem richtigen Weg',
        'Ihr kommt der Lösung näher',
        'Sehr gut! Macht weiter so',
        'Nehmt euch einen Moment zum Überprüfen',
        'Ihr arbeitet sehr gut als Team',
        'Ihr seid kurz davor es zu lösen!',
        'Denkt daran, dass ihr Hinweise zur Verfügung habt'
      ]
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


</script>

<div class="message-system">
  <h3>Sistema de Mensajes</h3>

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

  .predefined-messages h4, .last-message h4 {
    margin-bottom: 1rem;
    color: #00d4ff;
    font-size: 1rem;
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
  }
</style>