<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { httpClient } from '@/di/http'
import { LeagueRepository } from '@/domain/repositories/LeagueRepository'

const authStore = useAuthStore()
const canEdit = computed(() => !!authStore.user) // Todos los roles autenticados

const leagueRepo = new LeagueRepository(httpClient)

// ── Loading / error ────────────────────────────────────
const isLoading = ref(true)
const loadError = ref(null)

// ── Data ───────────────────────────────────────────────
const leagues = ref([])

// ── Search / Filter ────────────────────────────────────
const searchQuery = ref('')
const statusFilter = ref('all')
const sportFilter = ref('all')

const sportOptions = computed(() => {
  const sports = new Set(leagues.value.map(l => l.sport).filter(Boolean))
  const opts = [{ value: 'all', label: 'Todos los deportes' }]
  sports.forEach(s => opts.push({ value: s, label: s }))
  return opts
})

const filteredLeagues = computed(() => {
  return leagues.value.filter(l => {
    const matchesSearch = !searchQuery.value ||
      l.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (l.sport || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (l.country || '').toLowerCase().includes(searchQuery.value.toLowerCase())

    let matchesStatus = true
    if (statusFilter.value === 'active') matchesStatus = l.is_active
    else if (statusFilter.value === 'inactive') matchesStatus = !l.is_active

    let matchesSport = true
    if (sportFilter.value !== 'all') matchesSport = l.sport === sportFilter.value

    return matchesSearch && matchesStatus && matchesSport
  })
})

// ── Stats ──────────────────────────────────────────────
const stats = computed(() => {
  const all = leagues.value
  const sports = new Set(all.map(l => l.sport).filter(Boolean))
  return {
    total: all.length,
    active: all.filter(l => l.is_active).length,
    highPriority: all.filter(l => l.base_priority >= 1 && l.base_priority <= 3).length,
    sports: sports.size,
  }
})

// ── Helpers ────────────────────────────────────────────
function getPriorityInfo(priority) {
  if (priority >= 1 && priority <= 3) return { label: 'Alta', bg: 'bg-caliente-50', text: 'text-caliente-700', bar: 'bg-caliente-500', border: 'border-caliente-200' }
  if (priority >= 4 && priority <= 6) return { label: 'Media', bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500', border: 'border-amber-200' }
  return { label: 'Baja', bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', border: 'border-emerald-200' }
}

// ── Excel Import ───────────────────────────────────────
const fileInputRef = ref(null)
const importLoading = ref(false)
const importMessage = ref(null)
const importIsError = ref(false)
const importErrors = ref([])

function triggerImport() {
  if (!canEdit.value) return
  fileInputRef.value.click()
}

async function handleFileImport(e) {
  if (!canEdit.value) return
  const file = e.target.files?.[0]
  if (!file) return

  importLoading.value = true
  importMessage.value = null
  importIsError.value = false
  importErrors.value = []

  try {
    const formData = new FormData()
    formData.append('file', file)
    const result = await leagueRepo.importFile(formData)
    importMessage.value = `Se importaron ${result.imported} liga(s) exitosamente`
    importIsError.value = false
    if (result.errors && result.errors.length > 0) {
      importErrors.value = result.errors
      importIsError.value = true
      importMessage.value = `Se importaron ${result.imported} liga(s) con ${result.errors.length} error(es)`
    }
    await fetchLeagues()
  } catch (err) {
    const data = err.response?.data
    importMessage.value = data?.detail || data?.error || err.message || 'Error al importar archivo'
    importIsError.value = true
  } finally {
    importLoading.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

function dismissImportMessage() {
  importMessage.value = null
  importErrors.value = []
}

// ── League Modal ───────────────────────────────────────
const showModal = ref(false)
const modalMode = ref('create')
const modalLoading = ref(false)
const modalError = ref(null)
const editingLeague = ref(null)
const leagueForm = ref(getEmptyForm())

function getEmptyForm() {
  return {
    name: '',
    sport: '',
    country: '',
    base_priority: 5,
    is_active: true,
  }
}

function openCreate() {
  if (!canEdit.value) return
  modalMode.value = 'create'
  leagueForm.value = getEmptyForm()
  modalError.value = null
  editingLeague.value = null
  showModal.value = true
}

function openEdit(league) {
  if (!canEdit.value) return
  modalMode.value = 'edit'
  editingLeague.value = league
  leagueForm.value = {
    name: league.name,
    sport: league.sport || '',
    country: league.country || '',
    base_priority: league.base_priority ?? 5,
    is_active: league.is_active,
  }
  modalError.value = null
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingLeague.value = null
}

async function submitForm() {
  if (!canEdit.value) return
  modalLoading.value = true
  modalError.value = null
  try {
    const payload = {
      name: leagueForm.value.name,
      sport: leagueForm.value.sport || '',
      country: leagueForm.value.country || '',
      base_priority: Number(leagueForm.value.base_priority) || 5,
      is_active: leagueForm.value.is_active,
    }
    if (modalMode.value === 'create') {
      await leagueRepo.create(payload)
    } else {
      await leagueRepo.update(editingLeague.value.uuid, payload)
    }
    closeModal()
    await fetchLeagues()
  } catch (err) {
    const data = err.response?.data
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      modalError.value = msgs.join(' | ')
    } else {
      modalError.value = data?.detail || err.message || 'Error al guardar liga'
    }
  } finally {
    modalLoading.value = false
  }
}

// ── Delete ─────────────────────────────────────────────
const deleteTarget = ref(null)
const deleteLoading = ref(false)

function confirmDelete(league) {
  if (!canEdit.value) return
  deleteTarget.value = league
}

function cancelDelete() {
  deleteTarget.value = null
}

async function executeDelete() {
  if (!canEdit.value || !deleteTarget.value) return
  deleteLoading.value = true
  try {
    await leagueRepo.remove(deleteTarget.value.uuid)
    deleteTarget.value = null
    await fetchLeagues()
  } catch (err) {
    console.error('Delete league error:', err)
  } finally {
    deleteLoading.value = false
  }
}

// ── Fetch Data ─────────────────────────────────────────
async function fetchLeagues() {
  const data = await leagueRepo.getAll()
  leagues.value = data
}

onMounted(async () => {
  try {
    isLoading.value = true
    await fetchLeagues()
  } catch (err) {
    loadError.value = err.message || 'Error cargando ligas'
    console.error('Load error:', err)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div>
    <!-- ── LOADING ── -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="relative w-12 h-12">
        <div class="absolute inset-0 rounded-full border-4 border-arena-100"></div>
        <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-caliente-600 animate-spin"></div>
      </div>
      <p class="text-sm text-arena-400 font-medium">Cargando ligas...</p>
    </div>

    <!-- ── ERROR ── -->
    <div v-else-if="loadError" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="w-12 h-12 rounded-full bg-caliente-50 flex items-center justify-center">
        <svg class="w-6 h-6 text-caliente-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      </div>
      <p class="text-sm text-arena-600 font-medium">{{ loadError }}</p>
      <button @click="location.reload()" class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors">
        Reintentar
      </button>
    </div>

    <!-- ── MAIN CONTENT ── -->
    <template v-else>

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-arena-900">Ligas Deportivas</h2>
          <p class="text-sm text-arena-400 mt-1">Administracion de ligas para eventos y algoritmo de horarios</p>
        </div>
        <div class="flex items-center gap-3">
          <span v-if="!canEdit" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-arena-100 border border-arena-200/60 text-[11px] font-semibold text-arena-400 uppercase tracking-wide">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Solo lectura
          </span>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Total Ligas</p>
          <p class="text-2xl font-bold text-arena-900 mt-1">{{ stats.total }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Activas</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">{{ stats.active }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Alta Prioridad</p>
          <p class="text-2xl font-bold text-caliente-600 mt-1">{{ stats.highPriority }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Deportes</p>
          <p class="text-2xl font-bold text-blue-600 mt-1">{{ stats.sports }}</p>
        </div>
      </div>

      <!-- Import message banner -->
      <div v-if="importMessage" class="mb-4 px-4 py-3 rounded-lg border"
        :class="importIsError ? 'bg-caliente-50 border-caliente-200' : 'bg-emerald-50 border-emerald-200'"
      >
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium" :class="importIsError ? 'text-caliente-700' : 'text-emerald-700'">
            {{ importMessage }}
          </p>
          <button @click="dismissImportMessage" class="p-1 rounded-md hover:bg-white/50 transition-colors">
            <svg class="w-4 h-4" :class="importIsError ? 'text-caliente-500' : 'text-emerald-500'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul v-if="importErrors.length > 0" class="mt-2 space-y-0.5">
          <li v-for="(err, i) in importErrors" :key="i" class="text-xs text-caliente-600">
            &bull; {{ err }}
          </li>
        </ul>
      </div>

      <!-- Filters + Actions bar -->
      <div class="flex flex-wrap items-center gap-3 mb-5">
        <!-- Search -->
        <div class="relative flex-1 min-w-[200px] max-w-md">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nombre, deporte o pais..."
            class="w-full pl-9 pr-3 py-2 rounded-lg border border-arena-200 bg-white text-sm text-arena-900 placeholder-arena-400
                   focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
          />
        </div>

        <!-- Sport filter -->
        <select
          v-model="sportFilter"
          class="px-3 py-2 rounded-lg border border-arena-200 bg-white text-sm text-arena-700
                 focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
        >
          <option v-for="opt in sportOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>

        <!-- Status filter -->
        <select
          v-model="statusFilter"
          class="px-3 py-2 rounded-lg border border-arena-200 bg-white text-sm text-arena-700
                 focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>

        <p class="text-xs text-arena-400">{{ filteredLeagues.length }} de {{ leagues.length }}</p>

        <div class="flex-1"></div>

        <!-- Excel Import -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx,.xls,.csv"
          class="hidden"
          @change="handleFileImport"
        />
        <button
          v-if="canEdit"
          @click="triggerImport"
          :disabled="importLoading"
          class="flex items-center gap-2 px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors disabled:opacity-50"
        >
          <svg v-if="!importLoading" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ importLoading ? 'Importando...' : 'Importar Excel' }}
        </button>

        <!-- Create League -->
        <button
          v-if="canEdit"
          @click="openCreate"
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700 active:scale-[0.98] transition-all shadow-sm"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Agregar Liga
        </button>
      </div>

      <!-- Leagues Table -->
      <div v-if="filteredLeagues.length > 0" class="bg-white border border-arena-200 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[750px]">
            <thead>
              <tr class="border-b border-arena-200">
                <th class="px-5 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">#</th>
                <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Liga</th>
                <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Deporte</th>
                <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Pais</th>
                <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Prioridad Base</th>
                <th class="px-4 py-3.5 text-center text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Estado</th>
                <th v-if="canEdit" class="px-4 py-3.5 text-right text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-arena-100">
              <tr
                v-for="(league, idx) in filteredLeagues" :key="league.uuid"
                class="group hover:bg-arena-50/40 transition-colors"
              >
                <!-- Index -->
                <td class="px-5 py-3.5">
                  <span class="text-xs text-arena-400 font-mono">{{ idx + 1 }}</span>
                </td>

                <!-- Liga -->
                <td class="px-4 py-3.5">
                  <p class="text-sm font-semibold text-arena-900">{{ league.name }}</p>
                </td>

                <!-- Deporte -->
                <td class="px-4 py-3.5">
                  <span v-if="league.sport" class="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    {{ league.sport }}
                  </span>
                  <span v-else class="text-sm text-arena-300">&mdash;</span>
                </td>

                <!-- Pais -->
                <td class="px-4 py-3.5">
                  <span class="text-sm text-arena-700">{{ league.country || '\u2014' }}</span>
                </td>

                <!-- Prioridad Base -->
                <td class="px-4 py-3.5">
                  <div class="flex items-center gap-2.5">
                    <div class="w-14 h-1.5 rounded-full bg-arena-100 overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all"
                        :class="getPriorityInfo(league.base_priority).bar"
                        :style="{ width: ((11 - league.base_priority) / 10 * 100) + '%' }"
                      ></div>
                    </div>
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border"
                      :class="[getPriorityInfo(league.base_priority).bg, getPriorityInfo(league.base_priority).text, getPriorityInfo(league.base_priority).border]"
                    >
                      {{ league.base_priority }} - {{ getPriorityInfo(league.base_priority).label }}
                    </span>
                  </div>
                </td>

                <!-- Estado -->
                <td class="px-4 py-3.5 text-center">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                    :class="league.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-arena-100 text-arena-400 border-arena-200'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="league.is_active ? 'bg-emerald-500' : 'bg-arena-400'"></span>
                    {{ league.is_active ? 'Activa' : 'Inactiva' }}
                  </span>
                </td>

                <!-- Acciones -->
                <td v-if="canEdit" class="px-4 py-3.5 text-right">
                  <div class="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      @click="openEdit(league)"
                      class="p-1.5 rounded-md text-arena-400 hover:text-arena-700 hover:bg-arena-100 transition-colors"
                      title="Editar"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    <button
                      @click="confirmDelete(league)"
                      class="p-1.5 rounded-md text-arena-400 hover:text-caliente-600 hover:bg-caliente-50 transition-colors"
                      title="Eliminar"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty state: no results from filter -->
      <div v-if="filteredLeagues.length === 0 && leagues.length > 0" class="text-center py-16">
        <svg class="mx-auto w-12 h-12 text-arena-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <p class="text-sm text-arena-500 mt-3">No se encontraron ligas con los filtros seleccionados</p>
      </div>

      <!-- Empty state: no leagues at all -->
      <div v-if="leagues.length === 0 && !isLoading" class="text-center py-16">
        <svg class="mx-auto w-12 h-12 text-arena-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 1 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 0 1-2.02 1.272m2.02-1.272a6.023 6.023 0 0 0 2.02 1.272" />
        </svg>
        <p class="text-sm font-medium text-arena-600 mt-3">Sin ligas registradas</p>
        <p class="text-xs text-arena-400 mt-1">Agrega una liga manualmente o importa desde un archivo Excel</p>
      </div>

      <!-- Excel Template Info (admin only) -->
      <div v-if="canEdit" class="mt-6 bg-arena-50 border border-arena-200 rounded-xl px-5 py-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-arena-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <div>
            <p class="text-sm font-semibold text-arena-700">Formato de plantilla Excel para importar ligas</p>
            <p class="text-xs text-arena-500 mt-1">El archivo debe tener las siguientes columnas (la primera fila es el encabezado):</p>
            <div class="mt-3 overflow-x-auto">
              <table class="text-xs border border-arena-200 rounded-md overflow-hidden">
                <thead>
                  <tr class="bg-arena-100">
                    <th class="px-3 py-1.5 text-left font-semibold text-arena-600 border-r border-arena-200">name *</th>
                    <th class="px-3 py-1.5 text-left font-semibold text-arena-600 border-r border-arena-200">sport</th>
                    <th class="px-3 py-1.5 text-left font-semibold text-arena-600 border-r border-arena-200">country</th>
                    <th class="px-3 py-1.5 text-left font-semibold text-arena-600 border-r border-arena-200">base_priority</th>
                    <th class="px-3 py-1.5 text-left font-semibold text-arena-600">is_active</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="bg-white">
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Liga MX</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Futbol</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Mexico</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">2</td>
                    <td class="px-3 py-1.5 text-arena-700">true</td>
                  </tr>
                  <tr class="bg-arena-50/50">
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Premier League</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Futbol</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Inglaterra</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">1</td>
                    <td class="px-3 py-1.5 text-arena-700">true</td>
                  </tr>
                  <tr class="bg-white">
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">NBA</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Basketball</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">USA</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">3</td>
                    <td class="px-3 py-1.5 text-arena-700">true</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-[11px] text-arena-400 mt-2">* Campo obligatorio. La prioridad base va de 1 (maxima) a 10 (minima). Formatos aceptados: .xlsx, .xls, .csv</p>
          </div>
        </div>
      </div>

    </template>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- LEAGUE CREATE / EDIT MODAL                         -->
    <!-- ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-arena-900/40 backdrop-blur-sm" @click="closeModal"></div>

        <!-- Panel -->
        <div class="relative w-full max-w-lg bg-white rounded-xl border border-arena-200 shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-arena-100">
            <h3 class="text-base font-bold text-arena-900">
              {{ modalMode === 'create' ? 'Agregar Liga' : 'Editar Liga' }}
            </h3>
            <p class="text-xs text-arena-400 mt-0.5">
              {{ modalMode === 'create' ? 'Registrar una nueva liga deportiva' : `Editando ${editingLeague?.name}` }}
            </p>
          </div>

          <!-- Error -->
          <div v-if="modalError" class="mx-6 mt-4 px-4 py-2.5 rounded-lg bg-caliente-50 border border-caliente-200">
            <p class="text-xs text-caliente-700 font-medium">{{ modalError }}</p>
          </div>

          <!-- Form -->
          <form @submit.prevent="submitForm" class="px-6 py-5 space-y-4">
            <!-- Name -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Nombre *</label>
              <input v-model="leagueForm.name" type="text" required
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                placeholder="Ej. Liga MX, Premier League, NBA" />
            </div>

            <!-- Sport + Country -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Deporte</label>
                <input v-model="leagueForm.sport" type="text"
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                  placeholder="Ej. Futbol" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Pais</label>
                <input v-model="leagueForm.country" type="text"
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                  placeholder="Ej. Mexico" />
              </div>
            </div>

            <!-- Base Priority -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">
                Prioridad Base (1 = maxima, 10 = minima)
              </label>
              <div class="flex items-center gap-3">
                <input v-model.number="leagueForm.base_priority" type="number" min="1" max="10" required
                  class="w-24 px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900 text-center
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all" />
                <div class="flex-1">
                  <div class="w-full h-1.5 rounded-full bg-arena-100 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="getPriorityInfo(leagueForm.base_priority).bar"
                      :style="{ width: ((11 - leagueForm.base_priority) / 10 * 100) + '%' }"
                    ></div>
                  </div>
                </div>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border"
                  :class="[getPriorityInfo(leagueForm.base_priority).bg, getPriorityInfo(leagueForm.base_priority).text, getPriorityInfo(leagueForm.base_priority).border]"
                >
                  {{ getPriorityInfo(leagueForm.base_priority).label }}
                </span>
              </div>
              <p class="text-[11px] text-arena-400 mt-1">Define la prioridad predeterminada para los eventos de esta liga</p>
            </div>

            <!-- Active toggle -->
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider">Estado</label>
                <p class="text-xs text-arena-400 mt-0.5">{{ leagueForm.is_active ? 'La liga esta activa' : 'La liga esta inactiva' }}</p>
              </div>
              <button type="button" @click="leagueForm.is_active = !leagueForm.is_active"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-caliente-600/20"
                :class="leagueForm.is_active ? 'bg-caliente-600' : 'bg-arena-200'"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  :class="leagueForm.is_active ? 'translate-x-5' : 'translate-x-0'"
                ></span>
              </button>
            </div>
          </form>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-arena-100 flex items-center justify-end gap-3">
            <button @click="closeModal" type="button"
              class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors">
              Cancelar
            </button>
            <button @click="submitForm" :disabled="modalLoading"
              class="px-5 py-2 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700
                     disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-sm"
            >
              <span v-if="modalLoading" class="inline-flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando...
              </span>
              <span v-else>{{ modalMode === 'create' ? 'Crear Liga' : 'Guardar Cambios' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- LEAGUE DELETE CONFIRMATION                         -->
    <!-- ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-arena-900/40 backdrop-blur-sm" @click="cancelDelete"></div>
        <div class="relative w-full max-w-sm bg-white rounded-xl border border-arena-200 shadow-xl overflow-hidden">
          <div class="px-6 py-5 text-center">
            <div class="w-12 h-12 rounded-full bg-caliente-50 flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-caliente-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 class="text-base font-bold text-arena-900 mb-1">Eliminar liga</h3>
            <p class="text-sm text-arena-500">
              Estas seguro que deseas eliminar <span class="font-semibold text-arena-700">{{ deleteTarget.name }}</span>?
              Los eventos asociados podrian verse afectados.
            </p>
          </div>
          <div class="px-6 py-4 border-t border-arena-100 flex items-center justify-center gap-3">
            <button @click="cancelDelete"
              class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors">
              Cancelar
            </button>
            <button @click="executeDelete" :disabled="deleteLoading"
              class="px-5 py-2 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700
                     disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm"
            >
              {{ deleteLoading ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
