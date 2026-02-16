<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { httpClient } from '@/di/http'
import { SwapRequestRepository } from '@/domain/repositories/SwapRequestRepository'
import { EmployeeRepository } from '@/domain/repositories/EmployeeRepository'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin) // Añadido para RBAC

const swapRepo = new SwapRequestRepository(httpClient)
const employeeRepo = new EmployeeRepository(httpClient)

// ── Loading / error ────────────────────────────────────
const isLoading = ref(true)
const loadError = ref(null)

// ── Data ───────────────────────────────────────────────
const swapRequests = ref([])
const employees = ref([])

// ── Tabs ───────────────────────────────────────────────
const activeTab = ref('pending') // admin: 'pending' | 'all' — trader: 'mine' | 'received'

// ── Filters (admin) ────────────────────────────────────
const searchQuery = ref('')
const statusFilter = ref('all')

const statusOptions = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'ACCEPTED_BY_PEER', label: 'Aceptado (Peer)' },
  { value: 'REJECTED_BY_PEER', label: 'Rechazado (Peer)' },
  { value: 'APPROVED', label: 'Aprobado' },
  { value: 'REJECTED_BY_ADMIN', label: 'Rechazado (Admin)' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

// ── Status badge config ────────────────────────────────
const STATUS_CONFIG = {
  PENDING: { label: 'Pendiente', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  ACCEPTED_BY_PEER: { label: 'Aceptado (Peer)', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  REJECTED_BY_PEER: { label: 'Rechazado (Peer)', bg: 'bg-caliente-50', text: 'text-caliente-700', border: 'border-caliente-100', dot: 'bg-caliente-500' },
  APPROVED: { label: 'Aprobado', bg: 'bg-success-50', text: 'text-success-700', border: 'border-success-200', dot: 'bg-success-500' },
  REJECTED_BY_ADMIN: { label: 'Rechazado (Admin)', bg: 'bg-caliente-50', text: 'text-caliente-700', border: 'border-caliente-100', dot: 'bg-caliente-500' },
  CANCELLED: { label: 'Cancelado', bg: 'bg-arena-100', text: 'text-arena-500', border: 'border-arena-200', dot: 'bg-arena-400' },
}

function getStatusInfo(status) {
  return STATUS_CONFIG[status] || { label: status, bg: 'bg-arena-100', text: 'text-arena-500', border: 'border-arena-200', dot: 'bg-arena-400' }
}

// ── Helpers for nested DTOs ────────────────────────────
function getEmployeeName(emp) {
  if (typeof emp === 'object' && emp?.user) return `${emp.user.first_name} ${emp.user.last_name}`.trim()
  return `Emp #${emp}`
}

function getEmployeeId(emp) {
  if (typeof emp === 'object' && emp?.employee_id) return emp.employee_id
  return null
}

function getScheduleInfo(sched) {
  if (typeof sched === 'object' && sched) return sched.date
  return '\u2014'
}

function formatDate(dateStr) {
  if (!dateStr) return '\u2014'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// ── Current user employee ID ───────────────────────────
const currentEmployeeId = computed(() => authStore.user?.employeeId || null)

// ═══════ ZONA ADMIN ═══════
// ── Admin stats ────────────────────────────────────────
const adminStats = computed(() => {
  const all = swapRequests.value
  return {
    total: all.length,
    pendingPeer: all.filter(s => s.status === 'PENDING').length,
    pendingAdmin: all.filter(s => s.status === 'ACCEPTED_BY_PEER').length,
    approved: all.filter(s => s.status === 'APPROVED').length,
  }
})

// ── Admin filtered list ────────────────────────────────
const adminFilteredSwaps = computed(() => {
  let list = swapRequests.value

  // Tab filter
  if (activeTab.value === 'pending') {
    list = list.filter(s => s.status === 'PENDING' || s.status === 'ACCEPTED_BY_PEER')
  }

  // Status filter
  if (statusFilter.value !== 'all') {
    list = list.filter(s => s.status === statusFilter.value)
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(s => {
      const requesterName = getEmployeeName(s.requester).toLowerCase()
      const requestedName = getEmployeeName(s.target_employee).toLowerCase()
      return requesterName.includes(q) || requestedName.includes(q)
    })
  }

  return list
})

// ═══════ ZONA USUARIO ═══════
// ── Trader: my requests vs received ────────────────────
const myRequests = computed(() => {
  return swapRequests.value.filter(s => {
    const empId = getEmployeeId(s.requester)
    return empId === currentEmployeeId.value
  })
})

const receivedRequests = computed(() => {
  return swapRequests.value.filter(s => {
    const empId = getEmployeeId(s.target_employee)
    return empId === currentEmployeeId.value
  })
})

// ── Trader stats ───────────────────────────────────────
const traderStats = computed(() => ({
  mine: myRequests.value.length,
  received: receivedRequests.value.length,
  pending: myRequests.value.filter(s => s.status === 'PENDING').length,
}))

// ── Trader visible list based on tab ───────────────────
const traderVisibleSwaps = computed(() => {
  return activeTab.value === 'mine' ? myRequests.value : receivedRequests.value
})

// ── Employees excluding self (for create form) ────────
const otherEmployees = computed(() => {
  return employees.value.filter(e => e.employeeId !== currentEmployeeId.value)
})

// ══════════════════════════════════════════════════════
// ADMIN MODALS — Approve / Reject
// ══════════════════════════════════════════════════════
const showAdminModal = ref(false)
const adminModalSwap = ref(null)
const adminModalAction = ref('approve') // 'approve' | 'reject'
const adminNotes = ref('')
const adminModalLoading = ref(false)
const adminModalError = ref(null)

function openAdminModal(swap, action) {
  if (!isAdmin.value) return // Añadido para RBAC — Guard
  adminModalSwap.value = swap
  adminModalAction.value = action
  adminNotes.value = ''
  adminModalError.value = null
  showAdminModal.value = true
}

function closeAdminModal() {
  showAdminModal.value = false
  adminModalSwap.value = null
}

async function submitAdminAction() {
  if (!isAdmin.value) return // Añadido para RBAC — Guard
  if (!adminModalSwap.value) return
  adminModalLoading.value = true
  adminModalError.value = null
  try {
    await swapRepo.approve(adminModalSwap.value.uuid, {
      action: adminModalAction.value,
      admin_response_note: adminNotes.value || undefined,
    })
    closeAdminModal()
    await fetchSwaps()
  } catch (err) {
    const data = err.response?.data
    if (data && typeof data === 'object') {
      const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      adminModalError.value = msgs.join(' | ')
    } else {
      adminModalError.value = data?.detail || err.message || 'Error al procesar'
    }
  } finally {
    adminModalLoading.value = false
  }
}

// ══════════════════════════════════════════════════════
// TRADER — Create Swap Modal
// ══════════════════════════════════════════════════════
const showCreateModal = ref(false)
const createForm = ref(getEmptyCreateForm())
const createLoading = ref(false)
const createError = ref(null)

function getEmptyCreateForm() {
  return {
    target_employee: '',
    requester_date: '',
    target_date: '',
    reason: '',
  }
}

function openCreateModal() {
  createForm.value = getEmptyCreateForm()
  createError.value = null
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
}

async function submitCreateSwap() {
  createLoading.value = true
  createError.value = null
  try {
    // Build payload — requester_schedule and requested_schedule expect schedule IDs
    // For now we send dates; the backend may resolve schedules from dates,
    // or these fields map directly to schedule IDs depending on the API contract.
    const payload = {
      target_employee: createForm.value.target_employee,
      requester_date: createForm.value.requester_date,
      target_date: createForm.value.target_date,
      reason: createForm.value.reason || '',
    }
    await swapRepo.create(payload)
    closeCreateModal()
    await fetchSwaps()
  } catch (err) {
    const data = err.response?.data
    if (data && typeof data === 'object') {
      const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      createError.value = msgs.join(' | ')
    } else {
      createError.value = data?.detail || err.message || 'Error al crear solicitud'
    }
  } finally {
    createLoading.value = false
  }
}

// ══════════════════════════════════════════════════════
// TRADER — Respond to Incoming Swap Modal
// ══════════════════════════════════════════════════════
const showRespondModal = ref(false)
const respondSwap = ref(null)
const respondAction = ref('accept') // 'accept' | 'reject'
const peerNotes = ref('')
const respondLoading = ref(false)
const respondError = ref(null)

function openRespondModal(swap) {
  // Verify this swap is addressed to the current user
  const empId = getEmployeeId(swap.target_employee)
  if (empId !== currentEmployeeId.value) return
  respondSwap.value = swap
  respondAction.value = 'accept'
  peerNotes.value = ''
  respondError.value = null
  showRespondModal.value = true
}

function closeRespondModal() {
  showRespondModal.value = false
  respondSwap.value = null
}

async function submitRespond() {
  if (!respondSwap.value) return
  respondLoading.value = true
  respondError.value = null
  try {
    await swapRepo.respond(respondSwap.value.uuid, {
      action: respondAction.value,
      peer_response_note: peerNotes.value || undefined,
    })
    closeRespondModal()
    await fetchSwaps()
  } catch (err) {
    const data = err.response?.data
    if (data && typeof data === 'object') {
      const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      respondError.value = msgs.join(' | ')
    } else {
      respondError.value = data?.detail || err.message || 'Error al responder'
    }
  } finally {
    respondLoading.value = false
  }
}

// ══════════════════════════════════════════════════════
// TRADER — Cancel Own Request
// ══════════════════════════════════════════════════════
const cancelTarget = ref(null)
const cancelLoading = ref(false)

function confirmCancel(swap) {
  // Verify ownership
  const empId = getEmployeeId(swap.requester)
  if (empId !== currentEmployeeId.value) return
  cancelTarget.value = swap
}

function dismissCancel() {
  cancelTarget.value = null
}

async function executeCancel() {
  if (!cancelTarget.value) return
  cancelLoading.value = true
  try {
    await swapRepo.cancel(cancelTarget.value.uuid)
    cancelTarget.value = null
    await fetchSwaps()
  } catch (err) {
    console.error('Cancel error:', err)
  } finally {
    cancelLoading.value = false
  }
}

// ── Fetch data ─────────────────────────────────────────
async function fetchSwaps() {
  const data = await swapRepo.getAll()
  swapRequests.value = data
}

onMounted(async () => {
  try {
    isLoading.value = true
    // Set default tab based on role
    activeTab.value = isAdmin.value ? 'pending' : 'mine'

    const promises = [fetchSwaps()]
    // Traders need employee list for the create form
    if (!isAdmin.value) {
      promises.push(employeeRepo.getAll().then(r => { employees.value = r }))
    }
    await Promise.all(promises)
  } catch (err) {
    loadError.value = err.message || 'Error cargando intercambios'
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
      <p class="text-sm text-arena-400 font-medium">Cargando intercambios...</p>
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

      <!-- ═══════ ZONA ADMIN ═══════ -->
      <template v-if="isAdmin"> <!-- Añadido para RBAC -->

        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold text-arena-900">Intercambios de Turno</h2>
            <p class="text-sm text-arena-400 mt-1">Gestionar solicitudes de intercambio entre empleados</p>
          </div>
        </div>

        <!-- Stats bar -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
            <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Total Solicitudes</p>
            <p class="text-2xl font-bold text-arena-900 mt-1">{{ adminStats.total }}</p>
          </div>
          <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
            <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Pendiente Peer</p>
            <p class="text-2xl font-bold text-amber-600 mt-1">{{ adminStats.pendingPeer }}</p>
          </div>
          <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
            <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Pendiente Admin</p>
            <p class="text-2xl font-bold text-blue-600 mt-1">{{ adminStats.pendingAdmin }}</p>
          </div>
          <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
            <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Aprobadas</p>
            <p class="text-2xl font-bold text-success-600 mt-1">{{ adminStats.approved }}</p>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex items-center gap-1 mb-5 border-b border-arena-200">
          <button
            @click="activeTab = 'pending'"
            class="px-4 py-2.5 text-sm font-medium transition-colors relative"
            :class="activeTab === 'pending'
              ? 'text-caliente-600'
              : 'text-arena-400 hover:text-arena-600'"
          >
            Pendientes
            <span v-if="activeTab === 'pending'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-caliente-600 rounded-full"></span>
          </button>
          <button
            @click="activeTab = 'all'"
            class="px-4 py-2.5 text-sm font-medium transition-colors relative"
            :class="activeTab === 'all'
              ? 'text-caliente-600'
              : 'text-arena-400 hover:text-arena-600'"
          >
            Todas
            <span v-if="activeTab === 'all'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-caliente-600 rounded-full"></span>
          </button>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-3 mb-5">
          <div class="relative flex-1 min-w-[240px] max-w-md">
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
          <select
            v-model="statusFilter"
            class="px-3 py-2 rounded-lg border border-arena-200 bg-white text-sm text-arena-700
                   focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
          >
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- Admin Table -->
        <div class="bg-white border border-arena-200 rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[900px]">
              <thead>
                <tr class="border-b border-arena-200">
                  <th class="px-5 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Solicitante</th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Turno Origen</th>
                  <th class="px-2 py-3.5 text-center text-[11px] font-semibold text-arena-400 uppercase tracking-wider"></th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Companero</th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Turno Destino</th>
                  <th class="px-4 py-3.5 text-center text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Estado</th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Fecha</th>
                  <th class="px-4 py-3.5 text-right text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-arena-100">
                <tr v-if="adminFilteredSwaps.length === 0">
                  <td colspan="8" class="px-5 py-12 text-center">
                    <svg class="mx-auto w-10 h-10 text-arena-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                    <p class="text-sm text-arena-400">No se encontraron solicitudes</p>
                  </td>
                </tr>
                <tr
                  v-for="swap in adminFilteredSwaps" :key="swap.uuid"
                  class="group hover:bg-arena-50/40 transition-colors"
                >
                  <!-- Solicitante -->
                  <td class="px-5 py-3.5">
                    <p class="text-sm font-semibold text-arena-900">{{ getEmployeeName(swap.requester) }}</p>
                  </td>
                  <!-- Turno Origen -->
                  <td class="px-4 py-3.5">
                    <p class="text-sm text-arena-700">{{ getScheduleInfo(swap.requester_schedule) }}</p>
                  </td>
                  <!-- Arrow -->
                  <td class="px-2 py-3.5 text-center">
                    <span class="text-arena-400 text-lg">&harr;</span>
                  </td>
                  <!-- Companero -->
                  <td class="px-4 py-3.5">
                    <p class="text-sm font-semibold text-arena-900">{{ getEmployeeName(swap.target_employee) }}</p>
                  </td>
                  <!-- Turno Destino -->
                  <td class="px-4 py-3.5">
                    <p class="text-sm text-arena-700">{{ getScheduleInfo(swap.target_schedule) }}</p>
                  </td>
                  <!-- Estado -->
                  <td class="px-4 py-3.5 text-center">
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold"
                      :class="[getStatusInfo(swap.status).bg, getStatusInfo(swap.status).text, getStatusInfo(swap.status).border]"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :class="getStatusInfo(swap.status).dot"></span>
                      {{ getStatusInfo(swap.status).label }}
                    </span>
                  </td>
                  <!-- Fecha -->
                  <td class="px-4 py-3.5">
                    <p class="text-sm text-arena-500">{{ formatDate(swap.created_at) }}</p>
                  </td>
                  <!-- Acciones -->
                  <td class="px-4 py-3.5 text-right">
                    <div v-if="swap.status === 'ACCEPTED_BY_PEER'" class="inline-flex items-center gap-1">
                      <button
                        @click="openAdminModal(swap, 'approve')"
                        class="px-3 py-1.5 rounded-lg bg-success-50 text-success-700 border border-success-200 text-[11px] font-semibold hover:bg-success-100 transition-colors"
                      >Aprobar</button>
                      <button
                        @click="openAdminModal(swap, 'reject')"
                        class="px-3 py-1.5 rounded-lg bg-caliente-50 text-caliente-700 border border-caliente-100 text-[11px] font-semibold hover:bg-caliente-100 transition-colors"
                      >Rechazar</button>
                    </div>
                    <span v-else class="text-xs text-arena-300">&mdash;</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </template>

      <!-- ═══════ ZONA USUARIO ═══════ -->
      <template v-else> <!-- Añadido para RBAC -->

        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold text-arena-900">Intercambios de Turno</h2>
            <p class="text-sm text-arena-400 mt-1">Solicita y gestiona intercambios con tus companeros</p>
          </div>
          <button
            @click="openCreateModal"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700 active:scale-[0.98] transition-all shadow-sm"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            Solicitar Intercambio
          </button>
        </div>

        <!-- Stats bar -->
        <div class="grid grid-cols-3 gap-3 mb-6">
          <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
            <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Mis Solicitudes</p>
            <p class="text-2xl font-bold text-arena-900 mt-1">{{ traderStats.mine }}</p>
          </div>
          <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
            <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Recibidas</p>
            <p class="text-2xl font-bold text-blue-600 mt-1">{{ traderStats.received }}</p>
          </div>
          <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
            <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Pendientes</p>
            <p class="text-2xl font-bold text-amber-600 mt-1">{{ traderStats.pending }}</p>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex items-center gap-1 mb-5 border-b border-arena-200">
          <button
            @click="activeTab = 'mine'"
            class="px-4 py-2.5 text-sm font-medium transition-colors relative"
            :class="activeTab === 'mine'
              ? 'text-caliente-600'
              : 'text-arena-400 hover:text-arena-600'"
          >
            Mis Solicitudes
            <span v-if="activeTab === 'mine'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-caliente-600 rounded-full"></span>
          </button>
          <button
            @click="activeTab = 'received'"
            class="px-4 py-2.5 text-sm font-medium transition-colors relative"
            :class="activeTab === 'received'
              ? 'text-caliente-600'
              : 'text-arena-400 hover:text-arena-600'"
          >
            Recibidas
            <span v-if="activeTab === 'received'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-caliente-600 rounded-full"></span>
          </button>
        </div>

        <!-- Trader: "Mis Solicitudes" Table -->
        <div v-if="activeTab === 'mine'" class="bg-white border border-arena-200 rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[700px]">
              <thead>
                <tr class="border-b border-arena-200">
                  <th class="px-5 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Companero</th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Mi Turno</th>
                  <th class="px-2 py-3.5 text-center text-[11px] font-semibold text-arena-400 uppercase tracking-wider"></th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Su Turno</th>
                  <th class="px-4 py-3.5 text-center text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Estado</th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Fecha</th>
                  <th class="px-4 py-3.5 text-right text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-arena-100">
                <tr v-if="myRequests.length === 0">
                  <td colspan="7" class="px-5 py-12 text-center">
                    <svg class="mx-auto w-10 h-10 text-arena-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                    <p class="text-sm text-arena-400">No tienes solicitudes de intercambio</p>
                  </td>
                </tr>
                <tr
                  v-for="swap in myRequests" :key="swap.uuid"
                  class="group hover:bg-arena-50/40 transition-colors"
                >
                  <td class="px-5 py-3.5">
                    <p class="text-sm font-semibold text-arena-900">{{ getEmployeeName(swap.target_employee) }}</p>
                  </td>
                  <td class="px-4 py-3.5">
                    <p class="text-sm text-arena-700">{{ getScheduleInfo(swap.requester_schedule) }}</p>
                  </td>
                  <td class="px-2 py-3.5 text-center">
                    <span class="text-arena-400 text-lg">&harr;</span>
                  </td>
                  <td class="px-4 py-3.5">
                    <p class="text-sm text-arena-700">{{ getScheduleInfo(swap.target_schedule) }}</p>
                  </td>
                  <td class="px-4 py-3.5 text-center">
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold"
                      :class="[getStatusInfo(swap.status).bg, getStatusInfo(swap.status).text, getStatusInfo(swap.status).border]"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :class="getStatusInfo(swap.status).dot"></span>
                      {{ getStatusInfo(swap.status).label }}
                    </span>
                  </td>
                  <td class="px-4 py-3.5">
                    <p class="text-sm text-arena-500">{{ formatDate(swap.created_at) }}</p>
                  </td>
                  <td class="px-4 py-3.5 text-right">
                    <button
                      v-if="swap.status === 'PENDING'"
                      @click="confirmCancel(swap)"
                      class="px-3 py-1.5 rounded-lg border border-arena-200 text-[11px] font-semibold text-arena-600 hover:bg-arena-50 transition-colors"
                    >Cancelar</button>
                    <span v-else class="text-xs text-arena-300">&mdash;</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Trader: "Recibidas" Table -->
        <div v-if="activeTab === 'received'" class="bg-white border border-arena-200 rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[700px]">
              <thead>
                <tr class="border-b border-arena-200">
                  <th class="px-5 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Solicitante</th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Su Turno</th>
                  <th class="px-2 py-3.5 text-center text-[11px] font-semibold text-arena-400 uppercase tracking-wider"></th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Mi Turno</th>
                  <th class="px-4 py-3.5 text-center text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Estado</th>
                  <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Fecha</th>
                  <th class="px-4 py-3.5 text-right text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-arena-100">
                <tr v-if="receivedRequests.length === 0">
                  <td colspan="7" class="px-5 py-12 text-center">
                    <svg class="mx-auto w-10 h-10 text-arena-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                    <p class="text-sm text-arena-400">No tienes solicitudes recibidas</p>
                  </td>
                </tr>
                <tr
                  v-for="swap in receivedRequests" :key="swap.uuid"
                  class="group hover:bg-arena-50/40 transition-colors"
                >
                  <td class="px-5 py-3.5">
                    <p class="text-sm font-semibold text-arena-900">{{ getEmployeeName(swap.requester) }}</p>
                  </td>
                  <td class="px-4 py-3.5">
                    <p class="text-sm text-arena-700">{{ getScheduleInfo(swap.requester_schedule) }}</p>
                  </td>
                  <td class="px-2 py-3.5 text-center">
                    <span class="text-arena-400 text-lg">&harr;</span>
                  </td>
                  <td class="px-4 py-3.5">
                    <p class="text-sm text-arena-700">{{ getScheduleInfo(swap.target_schedule) }}</p>
                  </td>
                  <td class="px-4 py-3.5 text-center">
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold"
                      :class="[getStatusInfo(swap.status).bg, getStatusInfo(swap.status).text, getStatusInfo(swap.status).border]"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :class="getStatusInfo(swap.status).dot"></span>
                      {{ getStatusInfo(swap.status).label }}
                    </span>
                  </td>
                  <td class="px-4 py-3.5">
                    <p class="text-sm text-arena-500">{{ formatDate(swap.created_at) }}</p>
                  </td>
                  <td class="px-4 py-3.5 text-right">
                    <div v-if="swap.status === 'PENDING'" class="inline-flex items-center gap-1">
                      <button
                        @click="openRespondModal(swap)"
                        class="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold hover:bg-blue-100 transition-colors"
                      >Responder</button>
                    </div>
                    <span v-else class="text-xs text-arena-300">&mdash;</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </template>
    </template>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- ADMIN APPROVE / REJECT MODAL                      -->
    <!-- ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showAdminModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-arena-900/40 backdrop-blur-sm" @click="closeAdminModal"></div>

        <!-- Panel -->
        <div class="relative w-full max-w-lg bg-white rounded-xl border border-arena-200 shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-arena-100">
            <h3 class="text-base font-bold text-arena-900">
              {{ adminModalAction === 'approve' ? 'Aprobar Intercambio' : 'Rechazar Intercambio' }}
            </h3>
            <p class="text-xs text-arena-400 mt-0.5">
              {{ getEmployeeName(adminModalSwap?.requester) }} &harr; {{ getEmployeeName(adminModalSwap?.target_employee) }}
            </p>
          </div>

          <!-- Error -->
          <div v-if="adminModalError" class="mx-6 mt-4 px-4 py-2.5 rounded-lg bg-caliente-50 border border-caliente-200">
            <p class="text-xs text-caliente-700 font-medium">{{ adminModalError }}</p>
          </div>

          <!-- Form -->
          <form @submit.prevent="submitAdminAction" class="px-6 py-5 space-y-4">
            <!-- Swap details summary -->
            <div class="bg-arena-50 rounded-lg px-4 py-3 space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-arena-500">Solicitante</span>
                <span class="font-medium text-arena-900">{{ getEmployeeName(adminModalSwap?.requester) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-arena-500">Turno origen</span>
                <span class="font-medium text-arena-700">{{ getScheduleInfo(adminModalSwap?.requester_schedule) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-arena-500">Companero</span>
                <span class="font-medium text-arena-900">{{ getEmployeeName(adminModalSwap?.target_employee) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-arena-500">Turno destino</span>
                <span class="font-medium text-arena-700">{{ getScheduleInfo(adminModalSwap?.target_schedule) }}</span>
              </div>
            </div>

            <!-- Admin notes -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Notas del administrador</label>
              <textarea
                v-model="adminNotes"
                rows="3"
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all resize-none"
                placeholder="Notas opcionales sobre esta decision..."
              ></textarea>
            </div>
          </form>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-arena-100 flex items-center justify-end gap-3">
            <button @click="closeAdminModal" type="button"
              class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors">
              Cancelar
            </button>
            <button @click="submitAdminAction" :disabled="adminModalLoading"
              class="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-sm"
              :class="adminModalAction === 'approve'
                ? 'bg-success-600 hover:bg-success-700'
                : 'bg-caliente-600 hover:bg-caliente-700'"
            >
              <span v-if="adminModalLoading" class="inline-flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Procesando...
              </span>
              <span v-else>{{ adminModalAction === 'approve' ? 'Aprobar' : 'Rechazar' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- TRADER — CREATE SWAP MODAL                        -->
    <!-- ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-arena-900/40 backdrop-blur-sm" @click="closeCreateModal"></div>

        <!-- Panel -->
        <div class="relative w-full max-w-lg bg-white rounded-xl border border-arena-200 shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-arena-100">
            <h3 class="text-base font-bold text-arena-900">Solicitar Intercambio</h3>
            <p class="text-xs text-arena-400 mt-0.5">Selecciona el companero y las fechas de los turnos a intercambiar</p>
          </div>

          <!-- Error -->
          <div v-if="createError" class="mx-6 mt-4 px-4 py-2.5 rounded-lg bg-caliente-50 border border-caliente-200">
            <p class="text-xs text-caliente-700 font-medium">{{ createError }}</p>
          </div>

          <!-- Form -->
          <form @submit.prevent="submitCreateSwap" class="px-6 py-5 space-y-4">
            <!-- Companero -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Companero</label>
              <select
                v-model="createForm.target_employee"
                required
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-700
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
              >
                <option value="" disabled>Seleccionar empleado...</option>
                <option v-for="emp in otherEmployees" :key="emp.uuid" :value="emp.uuid">
                  {{ emp.fullName }} ({{ emp.employeeId }})
                </option>
              </select>
            </div>

            <!-- Dates -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Fecha de mi turno</label>
                <input
                  v-model="createForm.requester_date"
                  type="date"
                  required
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Fecha de su turno</label>
                <input
                  v-model="createForm.target_date"
                  type="date"
                  required
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                />
              </div>
            </div>

            <!-- Reason -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Motivo</label>
              <textarea
                v-model="createForm.reason"
                rows="3"
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all resize-none"
                placeholder="Describe el motivo del intercambio..."
              ></textarea>
            </div>
          </form>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-arena-100 flex items-center justify-end gap-3">
            <button @click="closeCreateModal" type="button"
              class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors">
              Cancelar
            </button>
            <button @click="submitCreateSwap" :disabled="createLoading"
              class="px-5 py-2 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700
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
    <!-- TRADER — RESPOND TO INCOMING SWAP MODAL           -->
    <!-- ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showRespondModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-arena-900/40 backdrop-blur-sm" @click="closeRespondModal"></div>

        <!-- Panel -->
        <div class="relative w-full max-w-lg bg-white rounded-xl border border-arena-200 shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-arena-100">
            <h3 class="text-base font-bold text-arena-900">Responder Solicitud</h3>
            <p class="text-xs text-arena-400 mt-0.5">
              Solicitud de {{ getEmployeeName(respondSwap?.requester) }}
            </p>
          </div>

          <!-- Error -->
          <div v-if="respondError" class="mx-6 mt-4 px-4 py-2.5 rounded-lg bg-caliente-50 border border-caliente-200">
            <p class="text-xs text-caliente-700 font-medium">{{ respondError }}</p>
          </div>

          <!-- Form -->
          <form @submit.prevent="submitRespond" class="px-6 py-5 space-y-4">
            <!-- Swap details -->
            <div class="bg-arena-50 rounded-lg px-4 py-3 space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-arena-500">Solicitante</span>
                <span class="font-medium text-arena-900">{{ getEmployeeName(respondSwap?.requester) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-arena-500">Su turno</span>
                <span class="font-medium text-arena-700">{{ getScheduleInfo(respondSwap?.requester_schedule) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-arena-500">Tu turno</span>
                <span class="font-medium text-arena-700">{{ getScheduleInfo(respondSwap?.target_schedule) }}</span>
              </div>
              <div v-if="respondSwap?.reason" class="pt-2 border-t border-arena-200">
                <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider mb-1">Motivo</p>
                <p class="text-sm text-arena-700">{{ respondSwap.reason }}</p>
              </div>
            </div>

            <!-- Action select -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-2">Decision</label>
              <div class="flex items-center gap-3">
                <label
                  class="flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all"
                  :class="respondAction === 'accept'
                    ? 'border-success-300 bg-success-50 ring-2 ring-success-200'
                    : 'border-arena-200 hover:bg-arena-50'"
                >
                  <input type="radio" v-model="respondAction" value="accept" class="sr-only" />
                  <span class="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                    :class="respondAction === 'accept' ? 'border-success-500' : 'border-arena-300'">
                    <span v-if="respondAction === 'accept'" class="w-2 h-2 rounded-full bg-success-500"></span>
                  </span>
                  <span class="text-sm font-medium" :class="respondAction === 'accept' ? 'text-success-700' : 'text-arena-600'">Aceptar</span>
                </label>
                <label
                  class="flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all"
                  :class="respondAction === 'reject'
                    ? 'border-caliente-200 bg-caliente-50 ring-2 ring-caliente-100'
                    : 'border-arena-200 hover:bg-arena-50'"
                >
                  <input type="radio" v-model="respondAction" value="reject" class="sr-only" />
                  <span class="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                    :class="respondAction === 'reject' ? 'border-caliente-500' : 'border-arena-300'">
                    <span v-if="respondAction === 'reject'" class="w-2 h-2 rounded-full bg-caliente-500"></span>
                  </span>
                  <span class="text-sm font-medium" :class="respondAction === 'reject' ? 'text-caliente-700' : 'text-arena-600'">Rechazar</span>
                </label>
              </div>
            </div>

            <!-- Peer notes -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Notas</label>
              <textarea
                v-model="peerNotes"
                rows="3"
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all resize-none"
                placeholder="Notas opcionales..."
              ></textarea>
            </div>
          </form>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-arena-100 flex items-center justify-end gap-3">
            <button @click="closeRespondModal" type="button"
              class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors">
              Cancelar
            </button>
            <button @click="submitRespond" :disabled="respondLoading"
              class="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-sm"
              :class="respondAction === 'accept'
                ? 'bg-success-600 hover:bg-success-700'
                : 'bg-caliente-600 hover:bg-caliente-700'"
            >
              <span v-if="respondLoading" class="inline-flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Enviando...
              </span>
              <span v-else>{{ respondAction === 'accept' ? 'Aceptar Intercambio' : 'Rechazar Intercambio' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- TRADER — CANCEL CONFIRMATION                      -->
    <!-- ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="cancelTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-arena-900/40 backdrop-blur-sm" @click="dismissCancel"></div>
        <div class="relative w-full max-w-sm bg-white rounded-xl border border-arena-200 shadow-xl overflow-hidden">
          <div class="px-6 py-5 text-center">
            <div class="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 class="text-base font-bold text-arena-900 mb-1">Cancelar solicitud</h3>
            <p class="text-sm text-arena-500">
              Estas seguro que deseas cancelar la solicitud de intercambio con
              <span class="font-semibold text-arena-700">{{ getEmployeeName(cancelTarget.target_employee) }}</span>?
            </p>
          </div>
          <div class="px-6 py-4 border-t border-arena-100 flex items-center justify-center gap-3">
            <button @click="dismissCancel"
              class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors">
              Volver
            </button>
            <button @click="executeCancel" :disabled="cancelLoading"
              class="px-5 py-2 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700
                     disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm"
            >
              {{ cancelLoading ? 'Cancelando...' : 'Cancelar Solicitud' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
