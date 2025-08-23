<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import { config } from '../config'
  import { toast } from '../toast'
  import { getLanguages, getRoomHints, createRoomHint, updateHint, deleteHint as apiDeleteHint, getRoomCategories } from '../api'
  import type { Hint, Language } from '../types'
  import Modal from '../Modal.svelte'

  export let roomId: number

  const dispatch = createEventDispatcher()

  let isLoading = false
  let systemLanguages: Array<{ code: string; name: string; flag?: string }> = []
  let hints: Hint[] = []
  let categories: Array<{ id?: number; name: string }> = []

  let isCreatingHint = false
  let editingHintId = ''
  let viewingLanguage: Language = 'es'

  // form state: dynamic per language
  let selectedCategory = ''
  let textByLang: Record<string, string> = {}

  onMount(loadAll)

  async function loadAll() {
    try {
      isLoading = true
      systemLanguages = await getLanguages()
      categories = await getRoomCategories(roomId)
      hints = await getRoomHints(roomId)
      // ensure form languages keys exist
      syncFormLanguages()
      if (!systemLanguages.find(l => l.code === viewingLanguage)) viewingLanguage = (systemLanguages[0]?.code || 'es') as Language
    } catch (e) {
      toast.error('No se pudieron cargar las pistas')
    } finally {
      isLoading = false
    }
  }

  function syncFormLanguages() {
    const next: Record<string, string> = {}
    for (const { code } of systemLanguages) {
      next[code] = textByLang[code] || ''
    }
    textByLang = next
  }

  $: syncFormLanguages()

  $: hintsByCategory = hints.reduce((acc, hint) => {
    if (!acc[hint.category]) acc[hint.category] = []
    acc[hint.category].push(hint)
    return acc
  }, {} as Record<string, Hint[]>)

  function startCreatingHint() {
    isCreatingHint = true
    editingHintId = ''
    selectedCategory = categories[0]?.name || 'General'
    const next: Record<string, string> = {}
    for (const { code } of systemLanguages) next[code] = ''
    textByLang = next
  }

  function editHint(hint: Hint) {
    isCreatingHint = true
    editingHintId = hint.id
    selectedCategory = hint.category
    const next: Record<string, string> = {}
    for (const { code } of systemLanguages) next[code] = (hint.text as any)[code] || ''
    textByLang = next
  }

  function cancelHintEdit() {
    isCreatingHint = false
    editingHintId = ''
  }

  function buildTextObject() {
    const spanish = (textByLang['es'] || '').trim()
    const out: Record<string, string> = {}
    for (const { code } of systemLanguages) {
      const v = (textByLang[code] || '').trim()
      out[code] = v || spanish
    }
    return out
  }

  async function saveHint() {
    const mandatoryOk = $config.obligatoryLanguages.every(code => (textByLang[code] || '').trim().length > 0 || (textByLang['es'] || '').trim().length > 0)
    if (!mandatoryOk || !selectedCategory.trim()) {
      toast.error('Texto obligatorio y categoría requerida')
      return
    }
    try {
      isLoading = true
      if (editingHintId) {
        // Update existing hint
        await updateHint(editingHintId, { text: buildTextObject(), category: selectedCategory.trim() })
      } else {
        // Create new hint
        await createRoomHint(roomId, { text: buildTextObject(), category: selectedCategory.trim() })
      }
      toast.success(editingHintId ? 'Pista actualizada' : 'Pista creada')
      await reloadHints()
      cancelHintEdit()
      dispatch('hints-updated')
    } catch (e) {
      toast.error('No se pudo guardar la pista')
    } finally {
      isLoading = false
    }
  }

  async function reloadHints() {
    try {
      hints = await getRoomHints(roomId)
    } catch {}
  }

  // Delete confirmation modal state
  let showDeleteModal = false
  let hintToDelete: { id: string, text: string } | null = null

  function confirmDeleteHint(id: string, text: string) {
    hintToDelete = { id, text }
    showDeleteModal = true
  }

  async function deleteHint() {
    if (!hintToDelete) return
    
    try {
      isLoading = true
      await apiDeleteHint(hintToDelete.id)
      await reloadHints()
      toast.success('Pista eliminada')
      dispatch('hints-updated')
    } catch (e) {
      toast.error('No se pudo eliminar la pista')
    } finally {
      isLoading = false
      showDeleteModal = false
      hintToDelete = null
    }
  }

  function cancelDelete() {
    showDeleteModal = false
    hintToDelete = null
  }
</script>

<div class="hints-tab">
  <div class="hints-header">
    <h3>Gestión de Pistas</h3>
    <button class="create-btn" on:click={startCreatingHint}>
      <span class="btn-icon plus-icon"></span>
      Crear Pista
    </button>
  </div>

  {#if isCreatingHint}
    <div class="hint-form">
      <h4>{editingHintId ? 'Editar Pista' : 'Crear Nueva Pista'}</h4>
      <div class="form-group">
        <label for="hint-category">Categoría:</label>
        <select id="hint-category" bind:value={selectedCategory}>
          {#each categories as c}
            <option value={c.name}>{c.name}</option>
          {/each}
          {#if categories.length === 0}
            <option value="General">General</option>
          {/if}
        </select>
      </div>
      {#each systemLanguages as lang}
        <div class="form-group">
          <label for="hint-text-{lang.code}">{lang.flag} Texto en {lang.name} {$config.obligatoryLanguages.includes(lang.code) ? '(obligatorio)' : '(opcional)'}:</label>
          <textarea id="hint-text-{lang.code}" bind:value={textByLang[lang.code]} placeholder="Texto de la pista en {lang.name}"></textarea>
        </div>
      {/each}
      <div class="form-actions">
        <button class="save-btn" on:click={saveHint} disabled={isLoading}>
          <span class="btn-icon save-icon"></span>
          {editingHintId ? 'Actualizar' : 'Crear'} Pista
        </button>
        <button class="cancel-btn" on:click={cancelHintEdit}>
          <span class="btn-icon cancel-icon"></span>
          Cancelar
        </button>
      </div>
    </div>
  {/if}

  <div class="hints-list">
    {#each Object.entries(hintsByCategory) as [category, categoryHints]}
      <div class="category-group">
        <h4>{category}</h4>
        {#each categoryHints as hint}
          <div class="hint-item">
            <div class="hint-content">
              <span class="hint-text">{hint.text[viewingLanguage] || hint.text['es']}</span>
            </div>
            <div class="hint-actions">
              <button class="edit-btn" on:click={() => editHint(hint)}>
                <span class="btn-icon edit-icon"></span>
                Editar
              </button>
              <button class="delete-btn" on:click={() => confirmDeleteHint(hint.id, hint.text[viewingLanguage] || hint.text['es'] || 'Pista sin texto')}>
                <span class="btn-icon delete-icon"></span>
                Eliminar
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .hints-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 1.5rem; }
  .hint-form { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
  .form-group { margin-bottom: 1rem; }
  .form-group label { display:block; margin-bottom: .5rem; font-weight: 700; color: #00d4ff; }
  .form-group select,
  .form-group textarea { width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; padding: .75rem; color: white; font-family: inherit; }
  .form-group textarea { min-height: 80px; resize: vertical; }
  .form-actions { display:flex; gap: 1rem; margin-top: 1.5rem; }
  .category-group { margin-bottom: 2rem; }
  .category-group h4 { color: #ffa502; margin-bottom: .75rem; border-bottom: 1px solid rgba(255,165,2,0.3); padding-bottom: .25rem; }
  .hint-item { display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; margin-bottom: .5rem; }
  .hint-content { flex:1; color:white; }
  .hint-actions { display:flex; gap:.5rem; }

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
  .save-icon::before { content:''; position:absolute; inset:0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'/%3E%3Cpolyline points='17,21 17,13 7,13 7,21'/%3E%3Cpolyline points='7,3 7,8 15,8'/%3E%3C/svg%3E") center/contain no-repeat; }
  .cancel-icon::before { content:''; position:absolute; inset:0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='15' y1='9' x2='9' y2='15'/%3E%3Cline x1='9' y1='9' x2='15' y2='15'/%3E%3C/svg%3E") center/contain no-repeat; }

  @media (max-width: 768px) {
    .form-actions { flex-direction: column; }
    .hint-item { flex-direction: column; align-items: stretch; gap: 1rem; }
    .hint-actions { justify-content: center; }
  }
</style>

<!-- Delete Confirmation Modal -->
<Modal 
  bind:isOpen={showDeleteModal}
  title="Eliminar Pista"
  confirmText="Eliminar"
  cancelText="Cancelar"
  on:confirm={deleteHint}
  on:cancel={cancelDelete}
>
  <p>¿Estás seguro de que quieres eliminar esta pista?</p>
  {#if hintToDelete}
    <p><strong>"{hintToDelete.text}"</strong></p>
  {/if}
  <p>Esta acción no se puede deshacer.</p>
</Modal>


