<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import { getRoomHintHistory } from './api'
  import { socket } from './socket'
  import type { Room, Language } from './types'

  export let room: Room
  export let currentLanguage: Language

  const dispatch = createEventDispatcher()

  interface HintHistoryItem {
    id: number
    hint_id: string
    hint_text: string
    language: string
    sent_at: string
  }

  let hintHistory: HintHistoryItem[] = []
  let loadingHistory = true
  let currentRoomId: number | undefined = undefined

  // Expose refresh function for parent component
  export function refreshHistory() {
    loadHintHistory()
  }

  // Expose clear function for parent component (instant UI clear)
  export function clearLocalHistory() {
    hintHistory = []
  }

  onMount(async () => {
    currentRoomId = room.id
    await loadHintHistory()

    // Listen for room reset events to refresh history (handles resets from other clients)
    socket.on('room-reset', (resetRoomId: number) => {
      if (resetRoomId === room.id) {
        hintHistory = []
        // slight delay to allow server DB clear
        setTimeout(() => loadHintHistory(), 400)
      }
    })
  })

  // Reactive statement to reload history when room ID changes
  $: if (room.id !== undefined && room.id !== currentRoomId) {
    currentRoomId = room.id
    loadHintHistory()
  }

  async function loadHintHistory() {
    try {
      loadingHistory = true
      hintHistory = await getRoomHintHistory(room.id)
    } catch (error) {
      console.error('❌ Error loading hint history:', error)
      hintHistory = []
    } finally {
      loadingHistory = false
    }
  }



  function formatTime(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return 'Hoy'
    }
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  // Group hints by date for better organization, filtered by current language
  $: groupedHistory = hintHistory
    .filter(hint => hint.language === currentLanguage)
    .reduce((groups, hint) => {
      const date = formatDate(hint.sent_at)
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(hint)
      return groups
    }, {} as Record<string, HintHistoryItem[]>)
</script>

<div class="hints-history">
  <div class="history-header">
    <div class="history-title">
      <h3>Historial de Pistas</h3>
      <span class="language-badge">{currentLanguage.toUpperCase()}</span>
    </div>
  </div>

  <div class="history-content">
    {#if loadingHistory}
      <div class="loading-history">
        <div class="loading-spinner"></div>
        <p>Cargando historial...</p>
      </div>
    {:else if hintHistory.length === 0}
      <div class="no-history">
        <div class="no-history-icon">📝</div>
        <p>No hay pistas utilizadas en {currentLanguage.toUpperCase()}</p>
        <small>Las pistas enviadas en este idioma aparecerán aquí durante el juego</small>
      </div>
    {:else}
      <div class="history-list">
        {#each Object.entries(groupedHistory) as [date, hints]}
          <div class="date-group">
            <div class="date-header">{date}</div>
            {#each hints as hint}
              <div class="history-item">
                <div class="hint-content">
                  <div class="hint-text">{hint.hint_text}</div>
                  <div class="hint-meta">
                    <span class="hint-time">{formatTime(hint.sent_at)}</span>
                    <span class="hint-language">{hint.language.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Info about history behavior -->
  <div class="history-info">
    <small>
      ℹ️ El historial se borra automáticamente al reiniciar la sala
    </small>
  </div>
</div>

<style>
  .hints-history {
    background: var(--glass-bg);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    backdrop-filter: blur(10px);
    box-shadow: var(--shadow-md);
    margin-top: var(--space-xl);
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xl);
  }

  .history-title {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  .hints-history h3 {
    margin: 0;
    color: #00d4ff;
    font-size: 1.25rem;
  }

  .language-badge {
    background: rgba(0, 212, 255, 0.2);
    color: var(--accent-blue);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid rgba(0, 212, 255, 0.3);
  }



  .history-content {
    min-height: 200px;
  }

  .loading-history {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2xl);
    text-align: center;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-left: 3px solid #00d4ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--space-lg);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .no-history {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2xl);
    text-align: center;
    color: var(--text-secondary);
  }

  .no-history-icon {
    font-size: 3rem;
    margin-bottom: var(--space-lg);
    opacity: 0.7;
  }

  .no-history p {
    margin: 0 0 var(--space-sm) 0;
    font-size: 1.1rem;
    font-weight: 500;
  }

  .no-history small {
    opacity: 0.8;
    font-size: 0.875rem;
  }

  .history-list {
    max-height: 300px;
    overflow-y: auto;
    padding-right: var(--space-sm);
  }

  /* Custom scrollbar */
  .history-list::-webkit-scrollbar {
    width: 6px;
  }

  .history-list::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  .history-list::-webkit-scrollbar-thumb {
    background: rgba(0, 212, 255, 0.6);
    border-radius: 3px;
  }

  .history-list::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 212, 255, 0.8);
  }

  .date-group {
    margin-bottom: var(--space-lg);
  }

  .date-header {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--accent-orange);
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-xs);
    border-bottom: 1px solid rgba(255, 165, 2, 0.3);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .history-item {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-sm);
    transition: all 0.2s ease;
  }

  .history-item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(0, 212, 255, 0.3);
  }

  .hint-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .hint-text {
    color: var(--text-primary);
    font-size: 0.95rem;
    line-height: 1.4;
    font-weight: 500;
  }

  .hint-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .hint-time {
    font-family: monospace;
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .hint-language {
    background: rgba(0, 212, 255, 0.2);
    color: var(--accent-blue);
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.75rem;
  }

  .history-info {
    margin-top: var(--space-lg);
    padding-top: var(--space-lg);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    text-align: center;
  }

  .history-info small {
    color: var(--text-secondary);
    font-size: 0.8rem;
  }



  @media (max-width: 768px) {
    .history-title {
      justify-content: center;
    }

    .hint-meta {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-xs);
    }
  }
</style>
