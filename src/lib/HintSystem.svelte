<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { socket } from './socket'
  import { getRoomHints, getRoomCategories, reorderRoomCategories, reorderRoomHints } from './api'
  import type { Room, Language, Hint } from './types'
  import Modal from './Modal.svelte'
  import { toast } from './toast'

  export let room: Room
  export let currentLanguage: Language

  const dispatch = createEventDispatcher()

  // Custom hint text stored per room so it doesn't bleed between rooms
  let customHintByRoom: Record<number, string> = {}
  
  // Getter for current room's custom hint
  function getCurrentCustomHint(): string {
    return customHintByRoom[room.id] || ''
  }
  
  // Setter for current room's custom hint
  function setCurrentCustomHint(value: string) {
    if (room.id !== undefined) {
      customHintByRoom[room.id] = value
      // Force reactivity update for Svelte
      customHintByRoom = customHintByRoom
    }
  }

  let hintsLibrary: Hint[] = []
  let showCustomHint = false
  
  // Modal states
  let showAddHintsModal = false
  let hintsToAdd = '1'
  let loadingHints = true
  let currentRoomId: number | undefined = undefined
  let categories: Array<{ id?: number; name: string; position?: number }> = []
  let orderedCategoryNames: string[] = []
  let draggingCategoryIndex: number | null = null
  let draggingHint: { category: string; index: number } | null = null
  let isDragging = false
  let hintOrderByCategory: Record<string, string[]> = {}

  // Obtener la URL base del servidor
  const SERVER_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001'

  onMount(async () => {
    currentRoomId = room.id
    
    // Listen for server acknowledgment of hints
    socket.on('hint-processed', (data: { roomId: number, hintId: string, success: boolean, timestamp: string }) => {
      toast.info(`✅ Servidor confirmó recepción de pista`)
    })
    
    socket.on('hint-error', (error: { message: string }) => {
      toast.error(`❌ Error del servidor: ${error.message}`)
    })
    
    // Initialize customHintByRoom for this room if it doesn't exist
    if (room.id !== undefined && !(room.id in customHintByRoom)) {
      customHintByRoom[room.id] = ''
      // Force reactivity update
      customHintByRoom = customHintByRoom
    }
    
    await Promise.all([loadHintsFromServer(), loadCategoriesFromServer()])
    syncCategoryAndHintOrders()
  })

  // Reactive statement to reload hints only when room ID actually changes
  $: if (room.id !== undefined && room.id !== currentRoomId) {
    currentRoomId = room.id
    
    // Initialize customHintByRoom for the new room if it doesn't exist
    if (!(room.id in customHintByRoom)) {
      customHintByRoom[room.id] = ''
      // Force reactivity update
      customHintByRoom = customHintByRoom
    }
    
    loadHintsFromServer()
    loadCategoriesFromServer()
  }
  
  // Ensure customHintByRoom is always initialized for the current room
  $: if (room.id !== undefined && !(room.id in customHintByRoom)) {
    customHintByRoom[room.id] = ''
    // Force reactivity update
    customHintByRoom = customHintByRoom
  }

  async function loadHintsFromServer() {
    try {
      loadingHints = true
      hintsLibrary = await getRoomHints(room.id)
    } catch (error) {
      console.error('❌ Error conectando con servidor:', error)
    } finally {
      loadingHints = false
    }
  }

  async function loadCategoriesFromServer() {
    try {
      const list = await getRoomCategories(room.id)
      categories = list
    } catch (e) {
      console.error('❌ Error cargando categorías:', e)
    } finally {
      syncCategoryAndHintOrders()
    }
  }

  function syncCategoryAndHintOrders() {
    // Build category order from API list first, then any categories found in hints
    const namesFromApi = categories.map((c) => c.name)
    const namesFromHints = Object.keys(hintsByCategory)
    orderedCategoryNames = [...namesFromApi, ...namesFromHints.filter((n) => !namesFromApi.includes(n))]

    // Initialize hint order per category if not present
    for (const [category, hints] of Object.entries(hintsByCategory)) {
      if (!hintOrderByCategory[category]) {
        hintOrderByCategory[category] = hints.map((h) => h.id)
      }
    }
  }

  function sendHint(hintText: string, hintId?: string) {
    // Safety check for room ID
    if (!room || room.id === undefined) {
      return
    }
    
    if (!hintText.trim()) {
      return
    }

    const eventData = {
      roomId: room.id,
      hint: hintText,
      hintId: hintId || 'custom',
      language: currentLanguage
    }

    // Emit the hint to the server
    socket.emit('hint-sent', eventData)
    
    // Show visual feedback
    toast.success(`Pista enviada: "${hintText}"`)

    // Dispatch local event for UI updates
    dispatch('hint-sent', { hint: hintText, language: currentLanguage })
  }

  function sendHintDirectly(hint: Hint) {
    sendHint(hint.text[currentLanguage], hint.id)
  }

  function sendCustomHint() {
    // Safety check for room ID
    if (!room || room.id === undefined) {
      return
    }
    
    const currentHint = customHintByRoom[room.id] || ''
    
    if (currentHint && currentHint.trim()) {
      sendHint(currentHint)
      
      // Clear custom hint input and switch back to library view after sending
      setCurrentCustomHint('')
      showCustomHint = false
    }
  }



  function addHintsToRoom() {
    showAddHintsModal = true
  }

  function handleAddHints(event: CustomEvent) {
    const amount = event.detail
    if (amount && !isNaN(Number(amount))) {
      const hintsToAddNum = Number(amount)
      
      // Always add as free hints by default for game master convenience
      room.hintsRemaining += hintsToAddNum
      room.freeHintsCount = (room.freeHintsCount || 3) + hintsToAddNum
      
      dispatch('hint-sent', { 
        hintsAdded: hintsToAddNum, 
        freeHintsIncreased: hintsToAddNum 
      })
    }
  }



  function toggleCustomHint() {
    showCustomHint = !showCustomHint
  }

  function handleCustomHintKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      const currentHint = customHintByRoom[room.id] || ''
      
      if (currentHint && currentHint.trim()) {
        sendCustomHint()
      }
    }
  }

  // Agrupar pistas por categoría
  $: hintsByCategory = hintsLibrary.reduce((acc, hint) => {
    if (!acc[hint.category]) {
      acc[hint.category] = []
    }
    acc[hint.category].push(hint)
    return acc
  }, {} as Record<string, Hint[]>)

  // Helpers for ordered rendering
  function orderedHints(category: string, hints: Hint[]) {
    const order = hintOrderByCategory[category]
    if (!order) return hints
    const map = new Map(hints.map((h) => [h.id, h]))
    const result: Hint[] = []
    for (const id of order) {
      const h = map.get(id)
      if (h) result.push(h)
    }
    for (const h of hints) {
      if (!order.includes(h.id)) result.push(h)
    }
    return result
  }

  // Drag & drop: categories
  function onCategoryDragStart(event: DragEvent, index: number) {
    draggingCategoryIndex = index
    isDragging = true
    try { event.dataTransfer?.setData('text/plain', `cat:${index}`); event.dataTransfer!.effectAllowed = 'move' } catch (_) {}
  }

  function onCategoryDrop(index: number) {
    if (draggingCategoryIndex === null || draggingCategoryIndex === index) return
    const next = [...orderedCategoryNames]
    const [moved] = next.splice(draggingCategoryIndex, 1)
    next.splice(index, 0, moved)
    orderedCategoryNames = next
    draggingCategoryIndex = null
    isDragging = false
    saveCategoryOrder()
  }

  async function saveCategoryOrder() {
    try {
      const ids = orderedCategoryNames
        .map((name) => categories.find((c) => c.name === name)?.id)
        .filter((v): v is number => typeof v === 'number')
      if (ids.length > 0) {
        await reorderRoomCategories(room.id, ids)
      }
    } catch (e) {
      console.error('❌ Error guardando orden de categorías:', e)
    }
  }

  // Drag & drop: hints within a category
  function onHintDragStart(event: DragEvent, category: string, index: number) {
    draggingHint = { category, index }
    isDragging = true
    try { event.dataTransfer?.setData('text/plain', `hint:${category}:${index}`); event.dataTransfer!.effectAllowed = 'move' } catch(_) {}
  }

  async function onHintDrop(category: string, index: number) {
    if (!draggingHint || draggingHint.category !== category) return
    const order = [...(hintOrderByCategory[category] || [])]
    const [moved] = order.splice(draggingHint.index, 1)
    order.splice(index, 0, moved)
    hintOrderByCategory[category] = order
    draggingHint = null
    isDragging = false
    try {
      await reorderRoomHints(room.id, order)
    } catch (e) {
      console.error('❌ Error guardando orden de pistas:', e)
    }
  }

  function getCustomHint(): string {
    return customHintByRoom[room.id] ?? ''
  }

  function setCustomHint(value: string) {
    customHintByRoom[room.id] = value
    // Force reactivity update
    customHintByRoom = customHintByRoom
  }
</script>

<div class="hint-system">
  <h3>Sistema de Pistas</h3>
  
  <!-- Contador de pistas -->
  <div class="hints-counter">
    <div class="counter-display" class:low={room.hintsRemaining <= 1} class:empty={room.hintsRemaining <= 0}>
      <span class="count">{room.hintsRemaining}</span>
      <span class="label">
        {room.hintsRemaining <= 0 ? 'pistas gratuitas agotadas' : 'pistas restantes'}
      </span>
      {#if room.hintsRemaining <= 0}
        <div class="penalty-notice">
          ⚠️ Siguientes pistas: -2 min cada una
        </div>
      {/if}
    </div>
    <button class="add-hints-btn" on:click={addHintsToRoom}>
      ➕ Agregar Pistas
    </button>
  </div>

  <!-- Selector de tipo de pista -->
  <div class="hint-type-selector">
    <button 
      class="type-btn" 
      class:active={!showCustomHint}
      on:click={() => showCustomHint = false}
    >
      <span class="btn-icon library-icon"></span>
      Biblioteca
    </button>
    <button 
      class="type-btn" 
      class:active={showCustomHint}
      on:click={toggleCustomHint}
    >
      <span class="btn-icon edit-icon"></span>
      Personalizada
    </button>
  </div>

  {#if !showCustomHint}
    <!-- Pistas de la biblioteca -->
    <div class="hints-library">
      <h4>Seleccionar pista predefinida:</h4>
      
      {#if loadingHints}
        <div class="loading-hints">
          <div class="loading-spinner"></div>
          <p>Cargando pistas...</p>
        </div>
      {:else if Object.keys(hintsByCategory).length === 0}
        <div class="no-hints">
          <p>No hay pistas disponibles. <button class="secondary" on:click={loadHintsFromServer}>
            <span class="btn-icon refresh-icon"></span>
            Recargar
          </button></p>
        </div>
      {:else}
      <div class="hints-container">
          {#each orderedCategoryNames as catName, catIndex}
            <div class="category-section"
                 role="button"
                 tabindex="0"
                 draggable
                 on:dragstart={(e) => onCategoryDragStart(e, catIndex)}
                 on:dragover|preventDefault
                 on:drop={() => onCategoryDrop(catIndex)}>
              <h5 role="listitem">{catName}</h5>
              <div class="hints-grid">
                {#each orderedHints(catName, hintsByCategory[catName] || []) as hint, hintIndex}
                  <button
                    class="hint-card"
                    class:penalty-warning={room.hintsRemaining <= 0}
                    draggable
                    on:dragstart={(e) => onHintDragStart(e, catName, hintIndex)}
                    on:dragover|preventDefault
                    on:drop={() => onHintDrop(catName, hintIndex)}
                    on:click={() => sendHintDirectly(hint)}
                  >
                    <div class="hint-preview">
                      {hint.text[currentLanguage] || hint.text['es']}
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        </div>


      {/if}
    </div>
  {:else}
    <!-- Pista personalizada -->
    <div class="custom-hint">
      <h4>Escribir pista personalizada:</h4>
      <textarea 
        bind:value={customHintByRoom[room.id]}
        placeholder="Escribe tu pista personalizada aquí... (Presiona Enter para enviar)"
        rows="4"
        on:keydown={handleCustomHintKeydown}
      ></textarea>
      

      
      <button 
        class="send-hint-btn" 
        class:penalty-warning={room.hintsRemaining <= 0}
        disabled={!customHintByRoom[room.id]?.trim()}
        on:click={sendCustomHint}
      >
        <span class="btn-icon send-icon"></span>
        Enviar Pista Personalizada
      </button>
    </div>
  {/if}

  <!-- Preview del idioma actual -->
  <div class="language-info">
    <small>
      🌐 Enviando pistas en: <strong>{currentLanguage.toUpperCase()}</strong>
    </small>
  </div>
</div>

<!-- Add Hints Modal -->
<Modal 
  bind:isOpen={showAddHintsModal}
  title="Agregar Pistas"
  type="prompt"
  bind:inputValue={hintsToAdd}
  inputLabel="¿Cuántas pistas adicionales quieres agregar?"
  inputPlaceholder="1"
  confirmText="Agregar"
  cancelText="Cancelar"
  on:confirm={handleAddHints}
/>

<style>
  .refresh-icon::before {
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'%3E%3C/path%3E%3Cpath d='M21 3v5h-5'%3E%3C/path%3E%3Cpath d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'%3E%3C/path%3E%3Cpath d='M8 16l-5 5v-5h5'%3E%3C/path%3E%3C/svg%3E") center/contain no-repeat;
  }
  .hint-system h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    color: #00d4ff;
    text-align: center;
  }

  .hints-counter {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    margin-bottom: 1.5rem;
    gap: var(--space-md);
  }

  .counter-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--glass-bg);
    padding: var(--space-md);
    border-radius: var(--radius-lg);
    border: 2px solid var(--accent-blue);
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    flex: 1;
    min-height: 80px;
  }

  .counter-display.low {
    border-color: #ff4757;
    background: rgba(255, 71, 87, 0.1);
  }

  .counter-display.empty {
    border-color: #ff6b3d;
    background: rgba(255, 107, 61, 0.15);
    animation: pulseWarning 2s ease-in-out infinite;
  }

  @keyframes pulseWarning {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .count {
    font-size: 2rem;
    font-weight: bold;
    color: #00d4ff;
  }

  .counter-display.low .count {
    color: #ff4757;
  }

  .counter-display.empty .count {
    color: #ff6b3d;
  }

  .penalty-notice {
    font-size: 0.75rem;
    color: #ff6b3d;
    margin-top: 0.25rem;
    text-align: center;
    font-weight: 600;
  }

  .label {
    font-size: 0.8rem;
    opacity: 0.8;
  }

  .add-hints-btn {
    background: var(--glass-bg);
    color: var(--text-primary);
    border: 1px solid var(--accent-green);
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: var(--space-md);
    text-transform: uppercase;
    letter-spacing: 0.025em;
    backdrop-filter: blur(10px);
    box-shadow: var(--shadow-sm);
  }



  .add-hints-btn:hover {
    background: rgba(74, 222, 128, 0.1);
    border-color: var(--accent-green);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .hint-type-selector {
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

  .hints-container {
    max-height: 400px;
    overflow-y: auto;
    padding-right: 8px;
  }

  /* Scrollbar personalizado */
  .hints-container::-webkit-scrollbar {
    width: 8px;
  }

  .hints-container::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  .hints-container::-webkit-scrollbar-thumb {
    background: rgba(0, 212, 255, 0.6);
    border-radius: 4px;
  }

  .hints-container::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 212, 255, 0.8);
  }

  .hints-library h4, .custom-hint h4 {
    margin-bottom: 1rem;
    color: #00d4ff;
    font-size: 1rem;
  }

  .category-section {
    margin-bottom: 1.5rem;
  }

  .category-section h5 {
    margin-bottom: 0.5rem;
    color: #ffa502;
    font-size: 0.9rem;
  }

  .hints-grid {
    display: grid;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .hint-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 0.75rem;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
    text-transform: none;
    letter-spacing: normal;
  }

  .hint-card:hover {
    background: rgba(255, 255, 255, 0.1);
  }





  .hint-card.penalty-warning {
    border-color: #ff6b3d;
    background: rgba(255, 107, 61, 0.1);
    position: relative;
  }

  .hint-card.penalty-warning::before {
    content: '⚠️ -2 min';
    position: absolute;
    top: -8px;
    right: -8px;
    background: #ff6b3d;
    color: white;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: bold;
  }

  .hint-card.penalty-warning:hover {
    background: rgba(255, 107, 61, 0.15);
    border-color: #ff6b3d;
  }

  .hint-preview {
    font-size: 0.9rem;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.9);
    text-transform: none;
    letter-spacing: normal;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  textarea {
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

  textarea::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  textarea:focus {
    outline: none;
    border-color: #00d4ff;
  }

  .send-hint-btn {
    width: 100%;
    background: #ff6b35;
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

  .send-hint-btn:hover:not(:disabled) {
    background: #e55a2b;
    transform: translateY(-2px);
  }

  .send-hint-btn:disabled {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);
    cursor: not-allowed;
  }

  .send-hint-btn.penalty-warning {
    background: #ff6b3d;
    border: 2px solid #ff6b3d;
    position: relative;
  }

  .send-hint-btn.penalty-warning::before {
    content: '⚠️ Penalización: -2 minutos';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #ff6b3d;
    color: white;
    font-size: 0.75rem;
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
    margin-bottom: 4px;
    font-weight: normal;
  }

  .send-hint-btn.penalty-warning:hover:not(:disabled) {
    background: #e55a2b;
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

  .loading-hints {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    text-align: center;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-left: 4px solid #00d4ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .no-hints {
    text-align: center;
    padding: 2rem;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
  }

  .no-hints button {
    background: #00d4ff;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    margin-left: 0.5rem;
    cursor: pointer;
  }

  @media (max-width: 768px) {
    .hints-counter {
      flex-direction: column;
      align-items: stretch;
    }

    .hint-type-selector {
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