<script lang="ts">
  import type { Language } from '../types'
  import { getLanguages, getRoomMessagesGrouped, createRoomMessage, deleteRoomMessage } from '../api'
  import { toast } from '../toast'
  import Modal from '../Modal.svelte'

  export let roomId: number

  let systemLanguages: Array<{ code: string; name: string; flag?: string }> = []
  let roomMessages: Record<string, Array<{ id: number; message: string }>> = {}
  let viewingLanguage: Language = 'es'
  let editingMessageIndex = -1
  let editingMessageLanguage: Language = 'es'
  let newMessage = ''
  let isLoading = false
  let showCreateForm = false

  $: load()

  async function load() {
    try {
      systemLanguages = await getLanguages()
      const grouped = await getRoomMessagesGrouped(roomId)
      roomMessages = grouped
      if (!systemLanguages.find(l => l.code === viewingLanguage)) viewingLanguage = systemLanguages[0]?.code || 'es'
      if (!systemLanguages.find(l => l.code === editingMessageLanguage)) editingMessageLanguage = viewingLanguage
    } catch {
      toast.error('No se pudieron cargar los mensajes')
    }
  }

  function startCreatingMessage() {
    newMessage = ''
    editingMessageIndex = -1
    editingMessageLanguage = viewingLanguage
    showCreateForm = true
  }

  function startEditingMessage(index: number, language: Language) {
    editingMessageIndex = index
    editingMessageLanguage = language
    newMessage = roomMessages[language][index].message
    showCreateForm = true
  }

  function cancelMessageEdit() {
    editingMessageIndex = -1
    newMessage = ''
    showCreateForm = false
  }

  async function addMessage() {
    if (!newMessage.trim()) {
      return
    }
    
    try {
      isLoading = true
      
      if (editingMessageIndex >= 0) {
        const toEdit = roomMessages[editingMessageLanguage][editingMessageIndex]
        await deleteRoomMessage(roomId, toEdit.id)
      }
      
      await createRoomMessage(roomId, editingMessageLanguage, newMessage.trim())
      
      await load()
      cancelMessageEdit()
      toast.success('Mensaje guardado')
    } catch (error) {
      console.error('Error creating message:', error)
      toast.error('No se pudo guardar el mensaje')
    } finally {
      isLoading = false
    }
  }

  // Delete confirmation modal state
  let showDeleteModal = false
  let messageToDelete: { index: number, language: Language, message: string } | null = null

  function confirmDeleteMessage(index: number, language: Language) {
    const toDelete = roomMessages[language][index]
    messageToDelete = { index, language, message: toDelete.message }
    showDeleteModal = true
  }

  async function deleteMessage() {
    if (!messageToDelete) return
    
    const toDelete = roomMessages[messageToDelete.language][messageToDelete.index]
    try {
      isLoading = true
      await deleteRoomMessage(roomId, toDelete.id)
      await load()
      toast.success('Mensaje eliminado')
    } catch {
      toast.error('No se pudo eliminar el mensaje')
    } finally {
      isLoading = false
      showDeleteModal = false
      messageToDelete = null
    }
  }

  function cancelDelete() {
    showDeleteModal = false
    messageToDelete = null
  }
</script>

<div class="messages-tab">
  <div class="messages-header">
    <h3>Gestión de Mensajes Rápidos</h3>
    <button class="create-btn" on:click={startCreatingMessage}>
      <span class="btn-icon plus-icon"></span>
      Crear Mensaje
    </button>
  </div>

  {#if showCreateForm}
    <div class="message-form">
      <h4>{editingMessageIndex >= 0 ? 'Editar Mensaje' : 'Crear Nuevo Mensaje'}</h4>
      <div class="form-group">
        <label for="message-language">Idioma del mensaje:</label>
        <select id="message-language" bind:value={editingMessageLanguage} disabled={editingMessageIndex >= 0}>
          {#each systemLanguages as lang}
            <option value={lang.code}>{lang.flag} {lang.name}</option>
          {/each}
        </select>
      </div>
      <div class="form-group">
        <label for="message-text">Texto del mensaje:</label>
        <textarea id="message-text" bind:value={newMessage} placeholder="Escribe el mensaje rápido aquí..." rows="3"></textarea>
      </div>
      <div class="form-actions">
        <button class="save-btn" on:click={addMessage} disabled={isLoading}>
          <span class="btn-icon save-icon"></span>
          {editingMessageIndex >= 0 ? 'Actualizar' : 'Crear'} Mensaje
        </button>
        <button class="cancel-btn" on:click={cancelMessageEdit}>
          <span class="btn-icon cancel-icon"></span>
          Cancelar
        </button>
      </div>
    </div>
  {/if}

  <div class="language-selector">
    <label for="viewing-language">Ver mensajes en:</label>
    <select id="viewing-language" bind:value={viewingLanguage}>
      {#each systemLanguages as lang}
        <option value={lang.code}>{lang.flag} {lang.name}</option>
      {/each}
    </select>
  </div>

  <div class="messages-list">
    {#each roomMessages[viewingLanguage] || [] as messageObj, index}
      <div class="message-item">
        <div class="message-content">
          <span class="message-text">"{messageObj.message}"</span>
        </div>
        <div class="message-actions">
          <button class="edit-btn" on:click={() => startEditingMessage(index, viewingLanguage)}>
            <span class="btn-icon edit-icon"></span>
            Editar
          </button>
          <button class="delete-btn" on:click={() => confirmDeleteMessage(index, viewingLanguage)}>
            <span class="btn-icon delete-icon"></span>
            Eliminar
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .messages-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 1.5rem; }
  .message-form { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
  .message-item { display:flex; align-items:center; justify-content:space-between; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; margin-bottom: .5rem; }
  .form-group { margin-bottom: 1rem; }
  .form-group label { display:block; margin-bottom: .5rem; font-weight: 700; color: #00d4ff; }
  .form-group select,
  .form-group textarea { width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; padding: .75rem; color: white; font-family: inherit; }
  .form-group textarea { min-height: 80px; resize: vertical; }
  .form-actions { display:flex; gap: 1rem; margin-top: 1.5rem; }
  .message-actions { display:flex; gap: .5rem; }

  /* Buttons */
  .create-btn, .save-btn, .edit-btn, .delete-btn, .cancel-btn { background: var(--glass-bg); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.2); padding: var(--space-sm) var(--space-lg); border-radius: var(--radius-md); cursor: pointer; font-weight: 600; font-size: .875rem; display:inline-flex; align-items:center; gap: var(--space-sm); text-transform: uppercase; letter-spacing: .025em; backdrop-filter: blur(10px); box-shadow: var(--shadow-sm); position: relative; overflow: hidden; }
  .save-btn, .create-btn { border-color: var(--accent-green); }
  .edit-btn { border-color: var(--accent-blue); padding: var(--space-xs) var(--space-sm); font-size:.8rem; }
  .delete-btn { border-color: var(--accent-red); padding: var(--space-xs) var(--space-sm); font-size:.8rem; }
  .cancel-btn { color: var(--text-secondary); }
  .create-btn::before, .save-btn::before, .edit-btn::before, .delete-btn::before, .cancel-btn::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); transition:left .5s ease; }
  .create-btn:hover::before, .save-btn:hover::before, .edit-btn:hover::before, .delete-btn:hover::before, .cancel-btn:hover::before { left:100%; }
  .create-btn:hover, .save-btn:hover { background: rgba(74,222,128,0.1); border-color: var(--accent-green); transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .edit-btn:hover { background: rgba(100,217,255,0.1); border-color: var(--accent-blue); transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .delete-btn:hover { background: rgba(255,87,87,0.1); border-color: var(--accent-red); transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .cancel-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); border-color: rgba(255,255,255,0.4); transform: translateY(-1px); box-shadow: var(--shadow-md); }

  /* Icons */
  .btn-icon { width: 16px; height: 16px; display:inline-block; position: relative; }
  .plus-icon::before { content:''; position:absolute; inset:0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cline x1='12' y1='5' x2='12' y2='19'/%3E%3Cline x1='5' y1='12' x2='19' y2='12'/%3E%3C/svg%3E") center/contain no-repeat; }
  .edit-icon::before { content:''; position:absolute; inset:0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/%3E%3C/svg%3E") center/contain no-repeat; }
  .delete-icon::before { content:''; position:absolute; inset:0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpolyline points='3,6 5,6 21,6'/%3E%3Cpath d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/%3E%3Cline x1='10' y1='11' x2='10' y2='17'/%3E%3Cline x1='14' y1='11' x2='14' y2='17'/%3E%3C/svg%3E") center/contain no-repeat; }

  @media (max-width: 768px) {
    .form-actions { flex-direction: column; }
  }
</style>

<!-- Delete Confirmation Modal -->
<Modal 
  bind:isOpen={showDeleteModal}
  title="Eliminar Mensaje"
  confirmText="Eliminar"
  cancelText="Cancelar"
  on:confirm={deleteMessage}
  on:cancel={cancelDelete}
>
  <p>¿Estás seguro de que quieres eliminar este mensaje?</p>
  {#if messageToDelete}
    <p><strong>"{messageToDelete.message}"</strong></p>
  {/if}
  <p>Esta acción no se puede deshacer.</p>
</Modal>


