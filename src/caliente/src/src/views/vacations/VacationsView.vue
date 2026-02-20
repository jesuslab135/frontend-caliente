<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore' // Añadido para RBAC
import { httpClient } from '@/di/http'
import { VacationRepository } from '@/domain/repositories/VacationRepository'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin) // Añadido para RBAC

const vacationRepo = new VacationRepository(httpClient)

// ── Loading / error ────────────────────────────────────
const isLoading = ref(true)
const loadError = ref(null)

// ── Data ───────────────────────────────────────────────
const vacations = ref([])

// ── Filters ────────────────────────────────────────────
const searchQuery = ref('')
const statusFilter = ref('all')

const statusOptions = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
]

// ── Status badge config ────────────────────────────────
const STATUS_CONFIG = {
  PENDING: { label: 'Pendiente', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  APPROVED: { label: 'Aprobada', bg: 'bg-success-50', text: 'text-success-700', border: 'border-success-200', dot: 'bg-success-500' },
  REJECTED: { label: 'Rechazada', bg: 'bg-caliente-50', text: 'text-caliente-700', border: 'border-caliente-100', dot: 'bg-caliente-500' },
  CANCELLED: { label: 'Cancelada', bg: 'bg-arena-100', text: 'text-arena-500', border: 'border-arena-200', dot: 'bg-arena-400' },
}

// ── Helpers ────────────────────────────────────────────
function getEmployeeName(emp) {
  if (typeof emp === 'object' && emp?.user) return `${emp.user.first_name} ${emp.user.last_name}`.trim()
  return `Emp #${emp}`
}

function getEmployeeInitials(emp) {
  const name = getEmployeeName(emp)
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function computeDays(start, end) {
  if (!start || !end) return 0
  const d1 = new Date(start), d2 = new Date(end)
  return Math.max(0, Math.ceil((d2 - d1) / 86400000) + 1)
}

// ── Filtered data ──────────────────────────────────────
const filteredVacations = computed(() => {
  return vacations.value.filter(v => {
    const matchesStatus = statusFilter.value === 'all' || v.status === statusFilter.value
    const matchesSearch = !searchQuery.value ||
      getEmployeeName(v.employee).toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchesStatus && matchesSearch
  })
})

// ═══════ ZONA USUARIO ═══════
// Filter to own requests for trader mode
const displayedVacations = computed(() => {
  if (isAdmin.value) return filteredVacations.value // Añadido para RBAC
  const empId = authStore.user?.employeeId
  return filteredVacations.value.filter(v => {
    if (typeof v.employee === 'object') return v.employee.employee_id === empId
    return false
  })
})

// ── Stats ──────────────────────────────────────────────
const stats = computed(() => {
  const source = isAdmin.value ? vacations.value : displayedVacations.value // Añadido para RBAC
  return {
    total: source.length,
    pending: source.filter(v => v.status === 'PENDING').length,
    approved: source.filter(v => v.status === 'APPROVED').length,
    rejected: source.filter(v => v.status === 'REJECTED').length,
  }
})

// ═══════ ZONA USUARIO ═══════
// ── Create vacation modal (trader) ─────────────────────
const showCreateModal = ref(false)
const createLoading = ref(false)
const createError = ref(null)
const createForm = ref({
  start_date: '',
  end_date: '',
  reason: '',
})

const createDaysCount = computed(() => computeDays(createForm.value.start_date, createForm.value.end_date))

const minEndDate = computed(() => createForm.value.start_date || undefined)

function openCreateModal() {
  createForm.value = { start_date: '', end_date: '', reason: '' }
  createError.value = null
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
}

async function submitCreateVacation() {
  createLoading.value = true
  createError.value = null
  try {
    await vacationRepo.create({
      start_date: createForm.value.start_date,
      end_date: createForm.value.end_date,
      reason: createForm.value.reason || undefined,
    })
    closeCreateModal()
    await fetchVacations()
  } catch (err) {
    const data = err.response?.data
    if (data && typeof data === 'object' && !data.detail) {
      const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      createError.value = msgs.join(' | ')
    } else {
      createError.value = data?.detail || err.message || 'Error al crear solicitud'
    }
  } finally {
    createLoading.value = false
  }
}

// ═══════ ZONA ADMIN ═══════
// ── Approve / Reject modal (admin) ────────────────────
const showActionModal = ref(false)
const actionMode = ref('approve') // 'approve' | 'reject'
const actionTarget = ref(null)
const actionLoading = ref(false)
const actionError = ref(null)
const adminNotes = ref('')

function openActionModal(vacation, mode) {
  if (!isAdmin.value) return // Añadido para RBAC — Guard
  actionTarget.value = vacation
  actionMode.value = mode
  adminNotes.value = ''
  actionError.value = null
  showActionModal.value = true
}

function closeActionModal() {
  showActionModal.value = false
  actionTarget.value = null
}

async function submitAction() {
  if (!isAdmin.value) return // Añadido para RBAC — Guard
  if (!actionTarget.value) return
  actionLoading.value = true
  actionError.value = null
  try {
    await vacationRepo.approve(actionTarget.value.uuid, {
      action: actionMode.value,
      rejection_reason: adminNotes.value || undefined,
    })
    closeActionModal()
    await fetchVacations()
  } catch (err) {
    const data = err.response?.data
    actionError.value = data?.detail || err.message || 'Error al procesar solicitud'
  } finally {
    actionLoading.value = false
  }
}

// ── Fetch data ─────────────────────────────────────────
async function fetchVacations() {
  vacations.value = await vacationRepo.getAll()
}

onMounted(async () => {
  try {
    isLoading.value = true
    await fetchVacations()
  } catch (err) {
    loadError.value = err.message || 'Error cargando vacaciones'
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
      <p class="text-sm text-arena-400 font-medium">Cargando vacaciones...</p>
    </div>

    <!-- ── ERROR ── -->
    <div v-else-if="loadError" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="w-12 h-12 rounded-full bg-caliente-50 flex items-center justify-center">
        <svg class="w-6 h-6 text-caliente-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      </div>
      <p class="text-sm text-arena-600 font-medium">{{ loadError }}</p>
      <button @click="location.reload()" class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors">Reintentar</button>
    </div>

    <!-- ── MAIN CONTENT ── -->
    <template v-else>

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-arena-900">Vacaciones</h2>
          <p class="text-sm text-arena-400 mt-1">
            {{ isAdmin ? 'Gestionar solicitudes de vacaciones' : 'Mis solicitudes de vacaciones' }}
          </p>
        </div>
        <!-- ═══════ ZONA USUARIO ═══════ -->
        <button
          v-if="!isAdmin"
          @click="openCreateModal"
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700 active:scale-[0.98] transition-all shadow-sm"
        >
          <!-- Sun icon -->
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
          </svg>
          Solicitar Vacaciones
        </button>
      </div>

      <!-- ═══════ ZONA ADMIN ═══════ -->
      <!-- Stats bar — Admin (4 cards) -->
      <div v-if="isAdmin" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Total Solicitudes</p>
          <p class="text-2xl font-bold text-arena-900 mt-1">{{ stats.total }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Pendientes</p>
          <p class="text-2xl font-bold mt-1" :class="stats.pending > 0 ? 'text-caliente-600' : 'text-arena-900'">{{ stats.pending }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Aprobadas</p>
          <p class="text-2xl font-bold text-success-600 mt-1">{{ stats.approved }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Rechazadas</p>
          <p class="text-2xl font-bold text-arena-900 mt-1">{{ stats.rejected }}</p>
        </div>
      </div>

      <!-- ═══════ ZONA USUARIO ═══════ -->
      <!-- Stats bar — Trader (3 cards) -->
      <div v-else class="grid grid-cols-3 gap-3 mb-6">
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Mis Solicitudes</p>
          <p class="text-2xl font-bold text-arena-900 mt-1">{{ stats.total }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Pendientes</p>
          <p class="text-2xl font-bold mt-1" :class="stats.pending > 0 ? 'text-amber-600' : 'text-arena-900'">{{ stats.pending }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Aprobadas</p>
          <p class="text-2xl font-bold text-success-600 mt-1">{{ stats.approved }}</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-3 mb-5">
        <!-- Search (admin only — search by employee name) -->
        <div v-if="isAdmin" class="relative flex-1 min-w-[240px] max-w-md">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nombre de empleado..."
            class="w-full pl-9 pr-3 py-2 rounded-lg border border-arena-200 bg-white text-sm text-arena-900 placeholder-arena-400
                   focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
          />
        </div>

        <!-- Status filter -->
        <select
          v-model="statusFilter"
          class="px-3 py-2 rounded-lg border border-arena-200 bg-white text-sm text-arena-700
                 focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
        >
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <!-- ══════════════════════════════════════════════════ -->
      <!-- TABLE                                              -->
      <!-- ══════════════════════════════════════════════════ -->
      <div class="bg-white border border-arena-200 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[700px]">
            <thead>
              <tr class="border-b border-arena-200">
                <!-- ═══════ ZONA ADMIN ═══════ -->
                <th v-if="isAdmin" class="px-5 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Empleado</th>
                <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Periodo</th>
                <th class="px-4 py-3.5 text-center text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Dias</th>
                <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Razon</th>
                <th class="px-4 py-3.5 text-center text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Estado</th>
                <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Fecha Solicitud</th>
                <!-- ═══════ ZONA ADMIN ═══════ -->
                <th v-if="isAdmin" class="px-4 py-3.5 text-right text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-arena-100">
              <tr
                v-for="vac in displayedVacations" :key="vac.uuid"
                class="group hover:bg-arena-50/40 transition-colors"
              >
                <!-- ═══════ ZONA ADMIN ═══════ -->
                <!-- Employee (admin only) -->
                <td v-if="isAdmin" class="px-5 py-3.5">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {{ getEmployeeInitials(vac.employee) }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-arena-900 truncate">{{ getEmployeeName(vac.employee) }}</p>
                      <p v-if="typeof vac.employee === 'object'" class="text-[11px] text-arena-400 mt-0.5 font-mono">{{ vac.employee.employee_id }}</p>
                    </div>
                  </div>
                </td>

                <!-- Periodo -->
                <td class="px-4 py-3.5">
                  <p class="text-sm text-arena-900">{{ formatDate(vac.start_date) }}</p>
                  <p class="text-[11px] text-arena-400 mt-0.5">al {{ formatDate(vac.end_date) }}</p>
                </td>

                <!-- Dias -->
                <td class="px-4 py-3.5 text-center">
                  <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-arena-50 text-sm font-bold text-arena-700">
                    {{ vac.total_days }}
                  </span>
                </td>

                <!-- Razon -->
                <td class="px-4 py-3.5">
                  <p v-if="vac.reason" class="text-sm text-arena-600 truncate max-w-[200px]" :title="vac.reason">{{ vac.reason }}</p>
                  <span v-else class="text-sm text-arena-300 italic">Sin motivo</span>
                </td>

                <!-- Estado -->
                <td class="px-4 py-3.5 text-center">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold"
                    :class="[
                      STATUS_CONFIG[vac.status]?.bg || 'bg-arena-100',
                      STATUS_CONFIG[vac.status]?.text || 'text-arena-600',
                      STATUS_CONFIG[vac.status]?.border || 'border-arena-200',
                    ]"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="STATUS_CONFIG[vac.status]?.dot || 'bg-arena-400'"></span>
                    {{ STATUS_CONFIG[vac.status]?.label || vac.status }}
                  </span>
                </td>

                <!-- Fecha Solicitud -->
                <td class="px-4 py-3.5">
                  <p class="text-sm text-arena-500">{{ formatDateTime(vac.created_at) }}</p>
                </td>

                <!-- ═══════ ZONA ADMIN ═══════ -->
                <!-- Acciones (admin only, PENDING only) -->
                <td v-if="isAdmin" class="px-4 py-3.5 text-right">
                  <div v-if="vac.status === 'PENDING'" class="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      @click="openActionModal(vac, 'approve')"
                      class="p-1.5 rounded-md text-arena-400 hover:text-success-600 hover:bg-success-50 transition-colors"
                      title="Aprobar"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </button>
                    <button
                      @click="openActionModal(vac, 'reject')"
                      class="p-1.5 rounded-md text-arena-400 hover:text-caliente-600 hover:bg-caliente-50 transition-colors"
                      title="Rechazar"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="displayedVacations.length === 0 && !isLoading" class="text-center py-16">
        <svg class="mx-auto w-12 h-12 text-arena-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
        <p class="text-sm text-arena-500 mt-3">
          {{ isAdmin ? 'No se encontraron solicitudes con los filtros seleccionados' : 'No tienes solicitudes de vacaciones' }}
        </p>
        <button
          v-if="!isAdmin"
          @click="openCreateModal"
          class="mt-4 px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors"
        >
          Solicitar vacaciones
        </button>
      </div>

    </template>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- CREATE VACATION MODAL (trader)                     -->
    <!-- ═══════ ZONA USUARIO ═══════                       -->
    <!-- ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-arena-900/40 backdrop-blur-sm" @click="closeCreateModal"></div>

        <!-- Panel -->
        <div class="relative w-full max-w-md bg-white rounded-xl border border-arena-200 shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-arena-100">
            <h3 class="text-base font-bold text-arena-900">Solicitar Vacaciones</h3>
            <p class="text-xs text-arena-400 mt-0.5">Selecciona las fechas de tu periodo vacacional</p>
          </div>

          <!-- Error -->
          <div v-if="createError" class="mx-6 mt-4 px-4 py-2.5 rounded-lg bg-caliente-50 border border-caliente-200">
            <p class="text-xs text-caliente-700 font-medium">{{ createError }}</p>
          </div>

          <!-- Form -->
          <form @submit.prevent="submitCreateVacation" class="px-6 py-5 space-y-4">
            <!-- Date row -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Fecha inicio</label>
                <input
                  v-model="createForm.start_date"
                  type="date"
                  required
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Fecha fin</label>
                <input
                  v-model="createForm.end_date"
                  type="date"
                  required
                  :min="minEndDate"
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                />
              </div>
            </div>

            <!-- Days count -->
            <div v-if="createDaysCount > 0" class="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <p class="text-sm font-medium text-amber-700">{{ createDaysCount }} {{ createDaysCount === 1 ? 'dia solicitado' : 'dias solicitados' }}</p>
            </div>

            <!-- Reason -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Razon (opcional)</label>
              <textarea
                v-model="createForm.reason"
                rows="3"
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900 resize-none
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                placeholder="Motivo de las vacaciones..."
              ></textarea>
            </div>
          </form>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-arena-100 flex items-center justify-end gap-3">
            <button @click="closeCreateModal" type="button"
              class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors">
              Cancelar
            </button>
            <button @click="submitCreateVacation" :disabled="createLoading || !createForm.start_date || !createForm.end_date"
              class="px-5 py-2.5 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700
                     disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-sm"
            >
              <span v-if="createLoading" class="inline-flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Enviando...
              </span>
              <span v-else>Enviar Solicitud</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- APPROVE / REJECT MODAL (admin)                     -->
    <!-- ═══════ ZONA ADMIN ═══════                         -->
    <!-- ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showActionModal && actionTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-arena-900/40 backdrop-blur-sm" @click="closeActionModal"></div>

        <!-- Panel -->
        <div class="relative w-full max-w-md bg-white rounded-xl border border-arena-200 shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-arena-100">
            <h3 class="text-base font-bold text-arena-900">
              {{ actionMode === 'approve' ? 'Aprobar Vacaciones' : 'Rechazar Vacaciones' }}
            </h3>
            <p class="text-xs text-arena-400 mt-0.5">
              {{ actionMode === 'approve' ? 'Confirma la aprobacion de esta solicitud' : 'Indica el motivo del rechazo' }}
            </p>
          </div>

          <!-- Error -->
          <div v-if="actionError" class="mx-6 mt-4 px-4 py-2.5 rounded-lg bg-caliente-50 border border-caliente-200">
            <p class="text-xs text-caliente-700 font-medium">{{ actionError }}</p>
          </div>

          <!-- Vacation details -->
          <div class="px-6 pt-5 pb-2 space-y-3">
            <!-- Employee -->
            <div class="flex items-center gap-3 p-3 rounded-lg bg-arena-50 border border-arena-100">
              <div class="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">
                {{ getEmployeeInitials(actionTarget.employee) }}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-arena-900">{{ getEmployeeName(actionTarget.employee) }}</p>
                <p class="text-[11px] text-arena-400 mt-0.5">
                  {{ formatDate(actionTarget.start_date) }} — {{ formatDate(actionTarget.end_date) }}
                  <span class="ml-1 font-semibold">({{ actionTarget.total_days }} dias)</span>
                </p>
              </div>
            </div>

            <!-- Reason (if exists) -->
            <div v-if="actionTarget.reason" class="px-3 py-2.5 rounded-lg bg-arena-50 border border-arena-100">
              <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider mb-1">Razon del empleado</p>
              <p class="text-sm text-arena-700">{{ actionTarget.reason }}</p>
            </div>

            <!-- Admin notes -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Notas del administrador (opcional)</label>
              <textarea
                v-model="adminNotes"
                rows="3"
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900 resize-none
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                :placeholder="actionMode === 'approve' ? 'Notas adicionales...' : 'Motivo del rechazo...'"
              ></textarea>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-arena-100 flex items-center justify-end gap-3">
            <button @click="closeActionModal" type="button"
              class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors">
              Cancelar
            </button>
            <button
              @click="submitAction"
              :disabled="actionLoading"
              class="px-5 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-sm"
              :class="actionMode === 'approve' ? 'bg-success-500 hover:bg-success-600' : 'bg-caliente-600 hover:bg-caliente-700'"
            >
              <span v-if="actionLoading" class="inline-flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Procesando...
              </span>
              <span v-else>{{ actionMode === 'approve' ? 'Aprobar' : 'Rechazar' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
