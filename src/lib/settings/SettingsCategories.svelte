<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { toast } from '../toast'
  import { getRoomCategories, createRoomCategory, updateRoomCategory, deleteRoomCategory, getRoomHints } from '../api'
  import type { Hint } from '../types'

  export let roomId: number
  export let roomName: string | undefined

  const dispatch = createEventDispatcher()

  let categories: Array<{ id?: number; name: string }> = []
  let hints: Hint[] = []
  let isLoading = false
  let isCreatingCategory = false
  let newCategoryName = ''
  let editingCategoryId = ''
  let editingCategoryName = ''

  onMount(load)

  async function load() {
    try {
      isLoading = true
      categories = await getRoomCategories(roomId)
      hints = await getRoomHints(roomId)
    } catch {
      toast.error('No se pudieron cargar las categorías')
    } finally {
      isLoading = false
    }
  }

  function startCreatingCategory() {
    isCreatingCategory = true
    newCategoryName = ''
  }

  function cancelCategoryEdit() {
    isCreatingCategory = false
    editingCategoryId = ''
    newCategoryName = ''
    editingCategoryName = ''
  }

  function startEditingCategory(category: { id?: number; name: string }) {
    editingCategoryId = String(category.id ?? '')
    editingCategoryName = category.name
  }

  async function saveCategory() {
    if (!newCategoryName.trim()) {
      toast.error('El nombre de la categoría es obligatorio')
      return
    }
    try {
      isLoading = true
      await createRoomCategory(roomId, newCategoryName.trim())
      toast.success('Categoría creada')
      await load()
      cancelCategoryEdit()
    } catch {
      toast.error('No se pudo crear la categoría')
    } finally {
      isLoading = false
    }
  }

  async function updateCategoryName(category: { id?: number; name: string }) {
    if (!editingCategoryName.trim()) {
      toast.error('El nombre de la categoría es obligatorio')
      return
    }
    try {
      isLoading = true
      await updateRoomCategory(roomId, category.name, editingCategoryName.trim())
      toast.success('Categoría actualizada')
      await load()
      cancelCategoryEdit()
      dispatch('hints-updated')
    } catch {
      toast.error('No se pudo actualizar la categoría')
    } finally {
      isLoading = false
    }
  }

  async function removeCategory(category: { id?: number; name: string }) {
    if (!confirm(`¿Eliminar la categoría "${category.name}"?`)) return
    try {
      isLoading = true
      const result = await deleteRoomCategory(roomId, category.name)
      if (result.success) {
        toast.success('Categoría eliminada')
        await load()
      } else {
        toast.error(result.message || 'No se pudo eliminar la categoría')
      }
    } catch {
      toast.error('No se pudo eliminar la categoría')
    } finally {
      isLoading = false
    }
  }
</script>

<div class="categories-tab">
  <div class="categories-header">
    <h3>Gestión de Categorías para {roomName}</h3>
    <button class="create-btn" on:click={startCreatingCategory}>
      <span class="btn-icon plus-icon"></span>
      Crear Categoría
    </button>
  </div>

  {#if isCreatingCategory}
    <div class="category-form">
      <h4>Crear Nueva Categoría</h4>
      <div class="form-group">
        <label for="category-name">Nombre de la categoría:</label>
        <input id="category-name" type="text" bind:value={newCategoryName} placeholder="Nombre de la categoría..." on:keydown={(e) => e.key === 'Enter' && saveCategory()} />
      </div>
      <div class="form-actions">
        <button class="save-btn" on:click={saveCategory} disabled={isLoading || !newCategoryName.trim()}>
          <span class="btn-icon save-icon"></span>
          Crear Categoría
        </button>
        <button class="cancel-btn" on:click={cancelCategoryEdit}>
          <span class="btn-icon cancel-icon"></span>
          Cancelar
        </button>
      </div>
    </div>
  {/if}

  <div class="categories-list">
    <h4>Categorías existentes ({categories.length})</h4>
    {#if categories.length === 0}
      <div class="no-categories">
        <p>No hay categorías definidas para esta sala.</p>
        <p>Las categorías te ayudan a organizar tus pistas.</p>
      </div>
    {:else}
      {#each categories as category}
        <div class="category-item">
          {#if editingCategoryId === String(category.id ?? '')}
            <div class="category-edit">
              <input type="text" bind:value={editingCategoryName} on:keydown={(e) => e.key === 'Enter' && updateCategoryName(category)} />
              <button class="save-btn small" aria-label="Guardar categoría" on:click={() => updateCategoryName(category)} disabled={isLoading}>
                <span class="btn-icon save-icon"></span>
              </button>
              <button class="cancel-btn small" aria-label="Cancelar edición" on:click={cancelCategoryEdit}>
                <span class="btn-icon cancel-icon"></span>
              </button>
            </div>
          {:else}
            <div class="category-display">
              <span class="category-name">{category.name}</span>
              <div class="category-actions">
                <button class="edit-btn small" aria-label="Editar categoría" on:click={() => startEditingCategory(category)}>
                  <span class="btn-icon edit-icon"></span>
                </button>
                <button class="delete-btn small" aria-label="Eliminar categoría" on:click={() => removeCategory(category)}>
                  <span class="btn-icon delete-icon"></span>
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <div class="category-info">
    <h4>💡 Información sobre categorías:</h4>
    <ul>
      <li>Las categorías son específicas de cada sala</li>
      <li>No puedes eliminar una categoría que contenga pistas</li>
      <li>Al editar una categoría, se actualizarán todas las pistas que la usen</li>
      <li>Cada sala puede tener sus propias categorías personalizadas</li>
    </ul>
  </div>
</div>

<style>
  .categories-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 1.5rem; }
  .category-form { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
  .form-group { margin-bottom: 1rem; }
  .form-group label { display:block; margin-bottom: .5rem; font-weight: 700; color: #00d4ff; }
  .form-group input { width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; padding: .75rem; color: white; font-family: inherit; }
  .form-actions { display:flex; gap: 1rem; margin-top: 1.5rem; }
  .categories-list h4 { margin-bottom: 1rem; color: #00d4ff; font-size: 1.1rem; }
  .no-categories { text-align:center; padding: 2rem; color: rgba(255,255,255,0.5); font-style: italic; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; background: rgba(0,0,0,0.1); }
  .category-item { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; margin-bottom: .5rem; transition: all .2s ease; }
  .category-item:hover { background: rgba(255,255,255,0.08); }
  .category-display { display:flex; align-items:center; justify-content:space-between; }
  .category-actions { display:flex; gap:.5rem; }
  .category-edit { display:flex; gap:.5rem; align-items:center; }
  .category-edit input { flex:1; padding:.5rem; border-radius:4px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: white; }
  .category-info { background: rgba(0,212,255,0.1); border: 1px solid #00d4ff; border-radius: 8px; padding: 1.5rem; margin-top: 2rem; }

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
  }
</style>


