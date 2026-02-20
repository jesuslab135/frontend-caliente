<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { httpClient } from '@/di/http'
import { LeagueRepository } from '@/domain/repositories/LeagueRepository'
import { SportEventRepository } from '@/domain/repositories/SportEventRepository'

const authStore = useAuthStore()
const canEdit = computed(() => !!authStore.user) // Todos los roles autenticados

const leagueRepo = new LeagueRepository(httpClient)
const sportEventRepo = new SportEventRepository(httpClient)

// ── Loading / error ────────────────────────────────────
const isLoading = ref(true)
const loadError = ref(null)

// ── Data ───────────────────────────────────────────────
const events = ref([])
const leagues = ref([])

// ── Event Filters ──────────────────────────────────────
const searchQuery = ref('')
const leagueFilter = ref('all')
const priorityFilter = ref('all')

const priorityOptions = [
  { value: 'all', label: 'Todas las prioridades' },
  { value: 'high', label: 'Alta (1-3)' },
  { value: 'medium', label: 'Media (4-6)' },
  { value: 'low', label: 'Baja (7-10)' },
]

const leagueOptions = computed(() => {
  const opts = [{ value: 'all', label: 'Todas las ligas' }]
  leagues.value.forEach(l => opts.push({ value: l.id, label: l.name }))
  return opts
})

// ── Helpers ────────────────────────────────────────────
function getLeagueName(event) {
  if (typeof event.league === 'object' && event.league) return event.league.name
  const l = leagues.value.find(l => l.id === event.league)
  return l?.name || '\u2014'
}

function getLeagueId(event) {
  if (typeof event.league === 'object' && event.league) return event.league.id
  return event.league
}

function getPriorityInfo(priority) {
  if (priority >= 1 && priority <= 3) return { label: 'Alta', bg: 'bg-caliente-50', text: 'text-caliente-700', bar: 'bg-caliente-500', border: 'border-caliente-200' }
  if (priority >= 4 && priority <= 6) return { label: 'Media', bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500', border: 'border-amber-200' }
  return { label: 'Baja', bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', border: 'border-emerald-200' }
}

function formatDate(dateStr) {
  if (!dateStr) return '\u2014'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// ── Filtered Events ────────────────────────────────────
const filteredEvents = computed(() => {
  return events.value.filter(ev => {
    const matchesSearch = !searchQuery.value ||
      ev.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      getLeagueName(ev).toLowerCase().includes(searchQuery.value.toLowerCase())

    let matchesLeague = true
    if (leagueFilter.value !== 'all') {
      matchesLeague = getLeagueId(ev) === leagueFilter.value
    }

    let matchesPriority = true
    if (priorityFilter.value === 'high') matchesPriority = ev.priority >= 1 && ev.priority <= 3
    else if (priorityFilter.value === 'medium') matchesPriority = ev.priority >= 4 && ev.priority <= 6
    else if (priorityFilter.value === 'low') matchesPriority = ev.priority >= 7 && ev.priority <= 10

    return matchesSearch && matchesLeague && matchesPriority
  })
})

// ── Stats ──────────────────────────────────────────────
const stats = computed(() => {
  const all = events.value
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  return {
    total: all.length,
    activeLeagues: leagues.value.filter(l => l.is_active).length,
    highPriority: all.filter(e => e.priority >= 1 && e.priority <= 3).length,
    thisMonth: all.filter(e => {
      if (!e.date_start) return false
      const d = new Date(e.date_start)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }).length,
  }
})

// ── Event Modal ────────────────────────────────────────
const showEventModal = ref(false)
const eventModalMode = ref('create')
const eventModalLoading = ref(false)
const eventModalError = ref(null)
const editingEvent = ref(null)
const eventForm = ref(getEmptyEventForm())

function getEmptyEventForm() {
  return {
    league: '',
    name: '',
    date_start: '',
    date_end: '',
    priority: 5,
    description: '',
  }
}

function openCreateEvent() {
  if (!canEdit.value) return // Añadido para RBAC
  eventModalMode.value = 'create'
  eventForm.value = getEmptyEventForm()
  eventModalError.value = null
  editingEvent.value = null
  showEventModal.value = true
}

function openEditEvent(ev) {
  if (!canEdit.value) return // Añadido para RBAC
  eventModalMode.value = 'edit'
  editingEvent.value = ev
  eventForm.value = {
    league: getLeagueId(ev) || '',
    name: ev.name,
    date_start: ev.date_start ? ev.date_start.slice(0, 10) : '',
    date_end: ev.date_end ? ev.date_end.slice(0, 10) : '',
    priority: ev.priority,
    description: ev.description || '',
  }
  eventModalError.value = null
  showEventModal.value = true
}

function closeEventModal() {
  showEventModal.value = false
  editingEvent.value = null
}

async function submitEventForm() {
  if (!canEdit.value) return // Añadido para RBAC
  eventModalLoading.value = true
  eventModalError.value = null
  try {
    const payload = {
      league: Number(eventForm.value.league),
      name: eventForm.value.name,
      date_start: eventForm.value.date_start,
      date_end: eventForm.value.date_end || null,
      priority: Number(eventForm.value.priority),
      description: eventForm.value.description || '',
    }
    if (eventModalMode.value === 'create') {
      await sportEventRepo.create(payload)
    } else {
      await sportEventRepo.update(editingEvent.value.uuid, payload)
    }
    closeEventModal()
    await fetchEvents()
  } catch (err) {
    const data = err.response?.data
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      eventModalError.value = msgs.join(' | ')
    } else {
      eventModalError.value = data?.detail || err.message || 'Error al guardar evento'
    }
  } finally {
    eventModalLoading.value = false
  }
}

// ── Event Delete ───────────────────────────────────────
const deleteEventTarget = ref(null)
const deleteEventLoading = ref(false)

function confirmDeleteEvent(ev) {
  if (!canEdit.value) return // Añadido para RBAC
  deleteEventTarget.value = ev
}

function cancelDeleteEvent() {
  deleteEventTarget.value = null
}

async function executeDeleteEvent() {
  if (!canEdit.value) return // Añadido para RBAC
  if (!deleteEventTarget.value) return
  deleteEventLoading.value = true
  try {
    await sportEventRepo.remove(deleteEventTarget.value.uuid)
    deleteEventTarget.value = null
    await fetchEvents()
  } catch (err) {
    console.error('Delete event error:', err)
  } finally {
    deleteEventLoading.value = false
  }
}

// ── Excel Import ───────────────────────────────────────
const fileInputRef = ref(null)
const importLoading = ref(false)
const importMessage = ref(null)
const importIsError = ref(false)

function triggerImport() {
  if (!canEdit.value) return // Añadido para RBAC
  fileInputRef.value.click()
}

async function handleFileImport(e) {
  if (!canEdit.value) return // Añadido para RBAC
  const file = e.target.files?.[0]
  if (!file) return

  importLoading.value = true
  importMessage.value = null
  importIsError.value = false

  try {
    const formData = new FormData()
    formData.append('file', file)
    const result = await sportEventRepo.importFile(formData)
    importMessage.value = `Se importaron ${result.imported} evento(s) exitosamente`
    importIsError.value = false
    await fetchEvents()
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
}

// ── Fetch Data ─────────────────────────────────────────
async function fetchEvents() {
  const data = await sportEventRepo.getAll()
  events.value = data
}

async function fetchLeagues() {
  const data = await leagueRepo.getAll()
  leagues.value = data
}

onMounted(async () => {
  try {
    isLoading.value = true
    await Promise.all([fetchEvents(), fetchLeagues()])
  } catch (err) {
    loadError.value = err.message || 'Error cargando eventos'
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
      <p class="text-sm text-arena-400 font-medium">Cargando eventos...</p>
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
          <h2 class="text-xl font-bold text-arena-900">Eventos Deportivos</h2>
          <p class="text-sm text-arena-400 mt-1">Gestion de eventos y ligas deportivas</p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Solo lectura badge -->
          <span v-if="!canEdit" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-arena-100 border border-arena-200/60 text-[11px] font-semibold text-arena-400 uppercase tracking-wide"> <!-- Añadido para RBAC -->
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
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Total Eventos</p>
          <p class="text-2xl font-bold text-arena-900 mt-1">{{ stats.total }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Ligas Activas</p>
          <p class="text-2xl font-bold text-blue-600 mt-1">{{ stats.activeLeagues }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Alta Prioridad</p>
          <p class="text-2xl font-bold text-caliente-600 mt-1">{{ stats.highPriority }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Este Mes</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">{{ stats.thisMonth }}</p>
        </div>
      </div>

      <!-- ═══════ EVENTOS ═══════ -->
      <div>

        <!-- Import message banner -->
        <div v-if="importMessage" class="mb-4 px-4 py-3 rounded-lg border flex items-center justify-between"
          :class="importIsError ? 'bg-caliente-50 border-caliente-200' : 'bg-emerald-50 border-emerald-200'"
        >
          <p class="text-sm font-medium" :class="importIsError ? 'text-caliente-700' : 'text-emerald-700'">
            {{ importMessage }}
          </p>
          <button @click="dismissImportMessage" class="p-1 rounded-md hover:bg-white/50 transition-colors">
            <svg class="w-4 h-4" :class="importIsError ? 'text-caliente-500' : 'text-emerald-500'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Filters + Actions bar -->
        <div class="flex flex-wrap items-center gap-3 mb-5">
          <!-- Search -->
          <div class="relative flex-1 min-w-[240px] max-w-md">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por nombre o liga..."
              class="w-full pl-9 pr-3 py-2 rounded-lg border border-arena-200 bg-white text-sm text-arena-900 placeholder-arena-400
                     focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
            />
          </div>

          <!-- League filter -->
          <select
            v-model="leagueFilter"
            class="px-3 py-2 rounded-lg border border-arena-200 bg-white text-sm text-arena-700
                   focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
          >
            <option v-for="opt in leagueOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>

          <!-- Priority filter -->
          <select
            v-model="priorityFilter"
            class="px-3 py-2 rounded-lg border border-arena-200 bg-white text-sm text-arena-700
                   focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
          >
            <option v-for="opt in priorityOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>

          <div class="flex-1"></div>

          <!-- ═══════ ZONA ADMIN ═══════ -->
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
          > <!-- Añadido para RBAC -->
            <svg v-if="!importLoading" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ importLoading ? 'Importando...' : 'Importar Excel' }}
          </button>

          <!-- Create Event -->
          <button
            v-if="canEdit"
            @click="openCreateEvent"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700 active:scale-[0.98] transition-all shadow-sm"
          > <!-- Añadido para RBAC -->
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Agregar Evento
          </button>
          <!-- ═══════ FIN ZONA ADMIN ═══════ -->
        </div>

        <!-- Events Table -->
        <div class="bg-white border border-arena-200 rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[800px]">
              <thead>
                <tr class="border-b border-arena-200">
                  <th class="px-5 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Evento</th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Liga</th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Fecha</th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Prioridad</th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Fin</th>
                  <th v-if="canEdit" class="px-4 py-3.5 text-right text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Acciones</th> <!-- Añadido para RBAC -->
                </tr>
              </thead>
              <tbody class="divide-y divide-arena-100">
                <tr
                  v-for="ev in filteredEvents" :key="ev.uuid"
                  class="group hover:bg-arena-50/40 transition-colors"
                >
                  <!-- Evento -->
                  <td class="px-5 py-3.5">
                    <p class="text-sm font-semibold text-arena-900">{{ ev.name }}</p>
                    <p v-if="ev.description" class="text-[11px] text-arena-400 mt-0.5 truncate max-w-[250px]">{{ ev.description }}</p>
                  </td>

                  <!-- Liga -->
                  <td class="px-4 py-3.5">
                    <span class="text-sm text-arena-700">{{ getLeagueName(ev) }}</span>
                  </td>

                  <!-- Fecha -->
                  <td class="px-4 py-3.5">
                    <p class="text-sm text-arena-700">{{ formatDate(ev.date_start) }}</p>
                    <p class="text-[11px] text-arena-400 mt-0.5">{{ formatTime(ev.date_start) }} hrs</p>
                  </td>

                  <!-- Prioridad -->
                  <td class="px-4 py-3.5">
                    <div class="flex items-center gap-2.5">
                      <div class="w-16 h-1.5 rounded-full bg-arena-100 overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all"
                          :class="getPriorityInfo(ev.priority).bar"
                          :style="{ width: ((11 - ev.priority) / 10 * 100) + '%' }"
                        ></div>
                      </div>
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border"
                        :class="[getPriorityInfo(ev.priority).bg, getPriorityInfo(ev.priority).text, getPriorityInfo(ev.priority).border]"
                      >
                        {{ ev.priority }} - {{ getPriorityInfo(ev.priority).label }}
                      </span>
                    </div>
                  </td>

                  <!-- Fin -->
                  <td class="px-4 py-3.5">
                    <p v-if="ev.date_end" class="text-sm text-arena-700">{{ formatDate(ev.date_end) }}</p>
                    <span v-else class="text-sm text-arena-300">&mdash;</span>
                  </td>

                  <!-- ═══════ ZONA ADMIN ═══════ -->
                  <!-- Acciones -->
                  <td v-if="canEdit" class="px-4 py-3.5 text-right"> <!-- Añadido para RBAC -->
                    <div class="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        @click="openEditEvent(ev)"
                        class="p-1.5 rounded-md text-arena-400 hover:text-arena-700 hover:bg-arena-100 transition-colors"
                        title="Editar"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                      </button>
                      <button
                        @click="confirmDeleteEvent(ev)"
                        class="p-1.5 rounded-md text-arena-400 hover:text-caliente-600 hover:bg-caliente-50 transition-colors"
                        title="Eliminar"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <!-- ═══════ FIN ZONA ADMIN ═══════ -->
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ═══════ ZONA USUARIO ═══════ -->
        <!-- Empty state -->
        <div v-if="filteredEvents.length === 0 && events.length > 0" class="text-center py-16">
          <svg class="mx-auto w-12 h-12 text-arena-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <p class="text-sm text-arena-500 mt-3">No se encontraron eventos con los filtros seleccionados</p>
        </div>

        <div v-if="events.length === 0 && !isLoading" class="text-center py-16">
          <svg class="mx-auto w-12 h-12 text-arena-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <p class="text-sm font-medium text-arena-600 mt-3">Sin eventos registrados</p>
          <p class="text-xs text-arena-400 mt-1">Los eventos deportivos apareceran aqui una vez creados</p>
        </div>
        <!-- ═══════ FIN ZONA USUARIO ═══════ -->
      </div>

      <!-- Excel Template Info for Events -->
      <div v-if="canEdit" class="mt-6 bg-arena-50 border border-arena-200 rounded-xl px-5 py-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-arena-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <div>
            <p class="text-sm font-semibold text-arena-700">Formato de plantilla Excel para importar eventos</p>
            <p class="text-xs text-arena-500 mt-1">El archivo debe tener las siguientes columnas (la primera fila es el encabezado):</p>
            <div class="mt-3 overflow-x-auto">
              <table class="text-xs border border-arena-200 rounded-md overflow-hidden">
                <thead>
                  <tr class="bg-arena-100">
                    <th class="px-3 py-1.5 text-left font-semibold text-arena-600 border-r border-arena-200">league_name *</th>
                    <th class="px-3 py-1.5 text-left font-semibold text-arena-600 border-r border-arena-200">name</th>
                    <th class="px-3 py-1.5 text-left font-semibold text-arena-600 border-r border-arena-200">home_team</th>
                    <th class="px-3 py-1.5 text-left font-semibold text-arena-600 border-r border-arena-200">away_team</th>
                    <th class="px-3 py-1.5 text-left font-semibold text-arena-600 border-r border-arena-200">date_start *</th>
                    <th class="px-3 py-1.5 text-left font-semibold text-arena-600 border-r border-arena-200">date_end</th>
                    <th class="px-3 py-1.5 text-left font-semibold text-arena-600 border-r border-arena-200">priority</th>
                    <th class="px-3 py-1.5 text-left font-semibold text-arena-600">description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="bg-white">
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Liga MX</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Final Apertura 2026</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Club America</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Guadalajara</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">2026-05-15</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">2026-05-20</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">1</td>
                    <td class="px-3 py-1.5 text-arena-700">Ida y vuelta</td>
                  </tr>
                  <tr class="bg-arena-50/50">
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Premier League</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200"></td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Arsenal</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Liverpool</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">2026-03-22</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200"></td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">2</td>
                    <td class="px-3 py-1.5 text-arena-700">Jornada 30</td>
                  </tr>
                  <tr class="bg-white">
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">NBA</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Finals Game 7</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Lakers</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">Celtics</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">2026-06-18</td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200"></td>
                    <td class="px-3 py-1.5 text-arena-700 border-r border-arena-200">1</td>
                    <td class="px-3 py-1.5 text-arena-700">Si es necesario</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-[11px] text-arena-400 mt-2">* Campos obligatorios. Se requiere "name" o ambos "home_team" y "away_team" (se genera el nombre automaticamente). Si la liga no existe, se crea automaticamente. Prioridad: 1 (maxima) a 10 (minima), default 5. Fechas en formato YYYY-MM-DD. Formatos aceptados: .xlsx, .xls, .csv</p>
          </div>
        </div>
      </div>

    </template>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- EVENT CREATE / EDIT MODAL                          -->
    <!-- ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showEventModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-arena-900/40 backdrop-blur-sm" @click="closeEventModal"></div>

        <!-- Panel -->
        <div class="relative w-full max-w-lg bg-white rounded-xl border border-arena-200 shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-arena-100">
            <h3 class="text-base font-bold text-arena-900">
              {{ eventModalMode === 'create' ? 'Agregar Evento' : 'Editar Evento' }}
            </h3>
            <p class="text-xs text-arena-400 mt-0.5">
              {{ eventModalMode === 'create' ? 'Registrar un nuevo evento deportivo' : `Editando ${editingEvent?.name}` }}
            </p>
          </div>

          <!-- Error -->
          <div v-if="eventModalError" class="mx-6 mt-4 px-4 py-2.5 rounded-lg bg-caliente-50 border border-caliente-200">
            <p class="text-xs text-caliente-700 font-medium">{{ eventModalError }}</p>
          </div>

          <!-- Form -->
          <form @submit.prevent="submitEventForm" class="px-6 py-5 space-y-4">
            <!-- League -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Liga</label>
              <select v-model="eventForm.league" required
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-700
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
              >
                <option value="" disabled>Seleccionar liga</option>
                <option v-for="l in leagues" :key="l.id" :value="l.id">{{ l.name }}</option>
              </select>
            </div>

            <!-- Name -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Nombre del Evento</label>
              <input v-model="eventForm.name" type="text" required
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                placeholder="Ej. Final Champions League" />
            </div>

            <!-- Date Start + Date End -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Fecha Inicio</label>
                <input v-model="eventForm.date_start" type="date" required
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-700
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Fecha Fin</label>
                <input v-model="eventForm.date_end" type="date"
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-700
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all" />
              </div>
            </div>

            <!-- Priority -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">
                Prioridad (1 = maxima, 10 = minima)
              </label>
              <div class="flex items-center gap-3">
                <input v-model.number="eventForm.priority" type="number" min="1" max="10" required
                  class="w-24 px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900 text-center
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all" />
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border"
                  :class="[getPriorityInfo(eventForm.priority).bg, getPriorityInfo(eventForm.priority).text, getPriorityInfo(eventForm.priority).border]"
                >
                  {{ getPriorityInfo(eventForm.priority).label }}
                </span>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Descripcion</label>
              <textarea v-model="eventForm.description" rows="2"
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900 resize-none
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                placeholder="Descripcion del evento (opcional)"></textarea>
            </div>
          </form>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-arena-100 flex items-center justify-end gap-3">
            <button @click="closeEventModal" type="button"
              class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors">
              Cancelar
            </button>
            <button @click="submitEventForm" :disabled="eventModalLoading"
              class="px-5 py-2 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700
                     disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-sm"
            >
              <span v-if="eventModalLoading" class="inline-flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando...
              </span>
              <span v-else>{{ eventModalMode === 'create' ? 'Crear Evento' : 'Guardar Cambios' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- EVENT DELETE CONFIRMATION                          -->
    <!-- ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="deleteEventTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-arena-900/40 backdrop-blur-sm" @click="cancelDeleteEvent"></div>
        <div class="relative w-full max-w-sm bg-white rounded-xl border border-arena-200 shadow-xl overflow-hidden">
          <div class="px-6 py-5 text-center">
            <div class="w-12 h-12 rounded-full bg-caliente-50 flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-caliente-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 class="text-base font-bold text-arena-900 mb-1">Eliminar evento</h3>
            <p class="text-sm text-arena-500">
              Estas seguro que deseas eliminar <span class="font-semibold text-arena-700">{{ deleteEventTarget.name }}</span>?
              Esta accion no se puede deshacer.
            </p>
          </div>
          <div class="px-6 py-4 border-t border-arena-100 flex items-center justify-center gap-3">
            <button @click="cancelDeleteEvent"
              class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors">
              Cancelar
            </button>
            <button @click="executeDeleteEvent" :disabled="deleteEventLoading"
              class="px-5 py-2 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700
                     disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm"
            >
              {{ deleteEventLoading ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
