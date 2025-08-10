<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { Room } from '../types'
  import { updateRoomName } from '../api'
  import { toast } from '../toast'

  export let rooms: Room[] = []

  const dispatch = createEventDispatcher()

  let editingRoom: Room | null = null
  let roomName = ''
  let isLoading = false

  function startEditingRoom(room: Room) {
    editingRoom = room
    roomName = room.name
  }

  function cancelEditRoom() {
    editingRoom = null
    roomName = ''
  }

  async function saveRoomName() {
    if (!editingRoom || !roomName.trim()) return
    try {
      isLoading = true
      const updated = await updateRoomName(editingRoom.id, roomName.trim())
      dispatch('room-updated', updated)
      toast.success('Nombre de sala actualizado')
      editingRoom = null
    } catch (e) {
      toast.error('No se pudo actualizar el nombre de la sala')
    } finally {
      isLoading = false
    }
  }
</script>

<div class="rooms-tab">
  <h3>Gestión de Salas</h3>
  <div class="rooms-list">
    {#each rooms as room}
      <div class="room-item">
        {#if editingRoom && editingRoom.id === room.id}
          <div class="edit-room">
            <input 
              type="text" 
              bind:value={roomName}
              placeholder="Nombre de la sala"
            />
            <button class="save-btn" on:click={saveRoomName} disabled={isLoading}>
              <span class="btn-icon save-icon"></span>
              Guardar
            </button>
            <button class="cancel-btn" on:click={cancelEditRoom}>
              <span class="btn-icon cancel-icon"></span>
              Cancelar
            </button>
          </div>
        {:else}
          <div class="room-display">
            <span class="room-name">{room.name}</span>
            <button class="edit-btn" on:click={() => startEditingRoom(room)}>
              <span class="btn-icon edit-icon"></span>
              Editar
            </button>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .rooms-tab h3 { margin-bottom: 1.5rem; color: #00d4ff; }
  .room-item { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
  .room-display { display: flex; justify-content: space-between; align-items: center; }
  .room-name { font-weight: 700; color: white; }
  .edit-room { display: flex; gap: 1rem; align-items: center; }
  .edit-room input { flex: 1; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; padding: 0.5rem; color: white; }
  .btn-icon { width: 16px; height: 16px; display: inline-block; position: relative; }
  .save-icon::before { content: ''; position: absolute; inset: 0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'/%3E%3Cpolyline points='17,21 17,13 7,13 7,21'/%3E%3Cpolyline points='7,3 7,8 15,8'/%3E%3C/svg%3E") center/contain no-repeat; }
  .edit-icon::before { content: ''; position: absolute; inset: 0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/%3E%3C/svg%3E") center/contain no-repeat; }
  .cancel-icon::before { content: ''; position: absolute; inset: 0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='15' y1='9' x2='9' y2='15'/%3E%3Cline x1='9' y1='9' x2='15' y2='15'/%3E%3C/svg%3E") center/contain no-repeat; }
  .save-btn, .cancel-btn, .edit-btn { background: var(--glass-bg); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.2); padding: var(--space-sm) var(--space-lg); border-radius: var(--radius-md); cursor: pointer; font-weight: 600; font-size: 0.875rem; display: inline-flex; align-items: center; gap: .5rem; }
</style>


