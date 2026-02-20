<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { httpClient } from '@/di/http'
import { EmployeeRepository } from '@/domain/repositories/EmployeeRepository'
import { TeamRepository } from '@/domain/repositories/TeamRepository'
import { API_ROUTES } from '@/domain/constants/endpoints'

const authStore = useAuthStore()
const employeeRepo = new EmployeeRepository(httpClient)
const teamRepo = new TeamRepository(httpClient)

// ── Loading / error ────────────────────────────────────
const isLoading = ref(true)
const loadError = ref(null)

// ── Data ───────────────────────────────────────────────
const employees = ref([])
const apiTeams = ref([])

// ── Filters ────────────────────────────────────────────
const searchQuery = ref('')
const roleFilter = ref('all')
const teamFilter = ref('all')

const roles = [
  { value: 'all', label: 'Todos los roles' },
  { value: 'MONITOR_TRADER', label: 'Monitor Trader' },
  { value: 'INPLAY_TRADER', label: 'In-Play Trader' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Administrador' },
]

const teamOptions = computed(() => {
  const opts = [{ value: 'all', label: 'Todos los equipos' }]
  apiTeams.value.forEach(t => opts.push({ value: t.uuid, label: t.name }))
  opts.push({ value: '__none', label: 'Sin equipo' })
  return opts
})

const filteredEmployees = computed(() => {
  return employees.value.filter(emp => {
    const matchesSearch = !searchQuery.value ||
      emp.fullName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesRole = roleFilter.value === 'all' || emp.role === roleFilter.value
    let matchesTeam = true
    if (teamFilter.value === '__none') matchesTeam = !emp.teamUuid
    else if (teamFilter.value !== 'all') matchesTeam = emp.teamUuid === teamFilter.value
    return matchesSearch && matchesRole && matchesTeam
  })
})

// ── Stats ──────────────────────────────────────────────
const stats = computed(() => {
  const all = employees.value
  return {
    total: all.length,
    active: all.filter(e => e.isActive).length,
    monitors: all.filter(e => e.role === 'MONITOR_TRADER').length,
    inplay: all.filter(e => e.role === 'INPLAY_TRADER').length,
  }
})

// ── Role display ───────────────────────────────────────
function getRoleInfo(role) {
  const map = {
    MONITOR_TRADER: { label: 'Monitor Trader', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    INPLAY_TRADER: { label: 'In-Play Trader', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    MANAGER: { label: 'Manager', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
    ADMIN: { label: 'Administrador', bg: 'bg-caliente-50', text: 'text-caliente-700', border: 'border-caliente-100', dot: 'bg-caliente-500' },
  }
  return map[role] || { label: role, bg: 'bg-arena-100', text: 'text-arena-600', border: 'border-arena-200', dot: 'bg-arena-400' }
}

// ── Modal state ────────────────────────────────────────
const showModal = ref(false)
const modalMode = ref('create') // 'create' | 'edit'
const modalLoading = ref(false)
const modalError = ref(null)
const editingEmployee = ref(null)
const formData = ref(getEmptyForm())

function getEmptyForm() {
  return {
    first_name: '', last_name: '', email: '', password: '',
    employee_id: '', role: 'INPLAY_TRADER', phone: '',
    team_uuid: '', hire_date: '',
  }
}

function openCreateModal() {
  modalMode.value = 'create'
  formData.value = getEmptyForm()
  modalError.value = null
  editingEmployee.value = null
  showModal.value = true
}

function openEditModal(emp) {
  modalMode.value = 'edit'
  editingEmployee.value = emp
  formData.value = {
    first_name: emp.firstName, last_name: emp.lastName, email: emp.email,
    password: '', employee_id: emp.employeeId, role: emp.role,
    phone: emp.phone, team_uuid: emp.teamUuid || '',
    hire_date: emp.hireDate || '',
  }
  modalError.value = null
  showModal.value = true
}

function closeModal() { showModal.value = false; editingEmployee.value = null }

async function submitForm() {
  modalLoading.value = true
  modalError.value = null
  try {
    if (modalMode.value === 'create') {
      const payload = {
        email: formData.value.email,
        password: formData.value.password,
        first_name: formData.value.first_name,
        last_name: formData.value.last_name,
        employee_id: formData.value.employee_id,
        role: formData.value.role,
        phone: formData.value.phone || '',
        team_id: formData.value.team_uuid || null,
        hire_date: formData.value.hire_date || null,
        send_welcome_email: false,
      }
      await httpClient.post(`${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.REGISTER}`, payload)
    } else {
      const payload = {
        first_name: formData.value.first_name,
        last_name: formData.value.last_name,
        email: formData.value.email,
        employee_id: formData.value.employee_id,
        role: formData.value.role,
        phone: formData.value.phone || '',
        team_uuid: formData.value.team_uuid || null,
        hire_date: formData.value.hire_date || null,
      }
      if (formData.value.password) payload.password = formData.value.password
      await employeeRepo.update(editingEmployee.value.uuid, payload)
    }
    closeModal()
    await fetchEmployees()
  } catch (err) {
    const data = err.response?.data
    if (data && typeof data === 'object') {
      const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      modalError.value = msgs.join(' | ')
    } else {
      modalError.value = data?.detail || err.message || 'Error al guardar'
    }
  } finally {
    modalLoading.value = false
  }
}

// ── Delete ─────────────────────────────────────────────
const deleteTarget = ref(null)
const deleteLoading = ref(false)

function confirmDelete(emp) { deleteTarget.value = emp }
function cancelDelete() { deleteTarget.value = null }

async function executeDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await employeeRepo.remove(deleteTarget.value.uuid)
    deleteTarget.value = null
    await fetchEmployees()
  } catch (err) {
    console.error('Delete error:', err)
  } finally {
    deleteLoading.value = false
  }
}

// ── Toggle active ──────────────────────────────────────
async function toggleActive(emp) {
  try {
    await employeeRepo.update(emp.uuid, { is_active: !emp.isActive })
    await fetchEmployees()
  } catch (err) {
    console.error('Toggle active error:', err)
  }
}

// ── Fetch data ─────────────────────────────────────────
async function fetchEmployees() {
  const data = await employeeRepo.getAll()
  employees.value = data
}

onMounted(async () => {
  try {
    isLoading.value = true
    await Promise.all([
      fetchEmployees(),
      teamRepo.getAll().then(r => { apiTeams.value = r }),
    ])
  } catch (err) {
    loadError.value = err.message || 'Error cargando empleados'
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
      <p class="text-sm text-arena-400 font-medium">Cargando empleados...</p>
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
          <h2 class="text-xl font-bold text-arena-900">Empleados</h2>
          <p class="text-sm text-arena-400 mt-1">{{ filteredEmployees.length }} de {{ employees.length }} empleados</p>
        </div>
        <button
          v-if="authStore.isAdmin"
          @click="openCreateModal"
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700 active:scale-[0.98] transition-all shadow-sm"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Agregar Empleado
        </button>
      </div>

      <!-- Stats bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Total</p>
          <p class="text-2xl font-bold text-arena-900 mt-1">{{ stats.total }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Activos</p>
          <p class="text-2xl font-bold text-success-600 mt-1">{{ stats.active }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Monitor</p>
          <p class="text-2xl font-bold text-blue-600 mt-1">{{ stats.monitors }}</p>
        </div>
        <div class="bg-white border border-arena-200 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">In-Play</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">{{ stats.inplay }}</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-3 mb-5">
        <!-- Search -->
        <div class="relative flex-1 min-w-[240px] max-w-md">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nombre, email o codigo..."
            class="w-full pl-9 pr-3 py-2 rounded-lg border border-arena-200 bg-white text-sm text-arena-900 placeholder-arena-400
                   focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
          />
        </div>

        <!-- Role filter -->
        <select
          v-model="roleFilter"
          class="px-3 py-2 rounded-lg border border-arena-200 bg-white text-sm text-arena-700
                 focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
        >
          <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>

        <!-- Team filter -->
        <select
          v-model="teamFilter"
          class="px-3 py-2 rounded-lg border border-arena-200 bg-white text-sm text-arena-700
                 focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
        >
          <option v-for="t in teamOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </div>

      <!-- ── TABLE ── -->
      <div class="bg-white border border-arena-200 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[800px]">
            <thead>
              <tr class="border-b border-arena-200">
                <th class="px-5 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Empleado</th>
                <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Rol</th>
                <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Equipo</th>
                <th class="px-4 py-3.5 text-left text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Contacto</th>
                <th class="px-4 py-3.5 text-center text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Estado</th>
                <th v-if="authStore.isAdmin" class="px-4 py-3.5 text-right text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-arena-100">
              <tr
                v-for="emp in filteredEmployees" :key="emp.uuid"
                class="group hover:bg-arena-50/40 transition-colors"
              >
                <!-- Employee -->
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      :class="emp.isActive
                        ? (emp.isMonitorTrader ? 'bg-blue-50 text-blue-700' : emp.isInplayTrader ? 'bg-emerald-50 text-emerald-700' : emp.isAdmin ? 'bg-caliente-50 text-caliente-600' : 'bg-violet-50 text-violet-700')
                        : 'bg-arena-100 text-arena-400'"
                    >{{ emp.initials }}</div>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-arena-900 truncate">{{ emp.fullName }}</p>
                      <p class="text-[11px] text-arena-400 mt-0.5 font-mono">{{ emp.employeeId }}</p>
                    </div>
                  </div>
                </td>

                <!-- Role -->
                <td class="px-4 py-3.5">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold"
                    :class="[getRoleInfo(emp.role).bg, getRoleInfo(emp.role).text, getRoleInfo(emp.role).border]"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="getRoleInfo(emp.role).dot"></span>
                    {{ getRoleInfo(emp.role).label }}
                  </span>
                </td>

                <!-- Team -->
                <td class="px-4 py-3.5">
                  <span v-if="emp.teamName" class="text-sm text-arena-700">{{ emp.teamName }}</span>
                  <span v-else class="text-sm text-arena-300 italic">Sin equipo</span>
                </td>

                <!-- Contact -->
                <td class="px-4 py-3.5">
                  <p class="text-sm text-arena-600 truncate max-w-[200px]">{{ emp.email }}</p>
                  <p v-if="emp.phone" class="text-[11px] text-arena-400 mt-0.5">{{ emp.phone }}</p>
                </td>

                <!-- Status -->
                <td class="px-4 py-3.5 text-center">
                  <button
                    v-if="authStore.isAdmin"
                    @click="toggleActive(emp)"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer"
                    :class="emp.isActive
                      ? 'bg-success-50 text-success-700 border border-success-200 hover:bg-success-100'
                      : 'bg-arena-100 text-arena-400 border border-arena-200 hover:bg-arena-200'"
                    :title="emp.isActive ? 'Clic para desactivar' : 'Clic para activar'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="emp.isActive ? 'bg-success-500' : 'bg-arena-400'"></span>
                    {{ emp.isActive ? 'Activo' : 'Inactivo' }}
                  </button>
                  <span
                    v-else
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    :class="emp.isActive ? 'bg-success-50 text-success-700 border border-success-200' : 'bg-arena-100 text-arena-400 border border-arena-200'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="emp.isActive ? 'bg-success-500' : 'bg-arena-400'"></span>
                    {{ emp.isActive ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>

                <!-- Actions -->
                <td v-if="authStore.isAdmin" class="px-4 py-3.5 text-right">
                  <div class="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      @click="openEditModal(emp)"
                      class="p-1.5 rounded-md text-arena-400 hover:text-arena-700 hover:bg-arena-100 transition-colors"
                      title="Editar"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    <button
                      @click="confirmDelete(emp)"
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

      <!-- Empty state -->
      <div v-if="filteredEmployees.length === 0 && employees.length > 0" class="text-center py-16">
        <svg class="mx-auto w-12 h-12 text-arena-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
        <p class="text-sm text-arena-500 mt-3">No se encontraron empleados con los filtros seleccionados</p>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- CREATE / EDIT MODAL                                -->
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
              {{ modalMode === 'create' ? 'Agregar Empleado' : 'Editar Empleado' }}
            </h3>
            <p class="text-xs text-arena-400 mt-0.5">
              {{ modalMode === 'create' ? 'Se creara un usuario y perfil de empleado' : `Editando ${editingEmployee?.fullName}` }}
            </p>
          </div>

          <!-- Error -->
          <div v-if="modalError" class="mx-6 mt-4 px-4 py-2.5 rounded-lg bg-caliente-50 border border-caliente-200">
            <p class="text-xs text-caliente-700 font-medium">{{ modalError }}</p>
          </div>

          <!-- Form -->
          <form @submit.prevent="submitForm" class="px-6 py-5 space-y-4">
            <!-- Name row -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Nombre</label>
                <input v-model="formData.first_name" type="text" required
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                  placeholder="Nombre(s)" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Apellido</label>
                <input v-model="formData.last_name" type="text" required
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                  placeholder="Apellido(s)" />
              </div>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Email</label>
              <input v-model="formData.email" type="email" required :disabled="modalMode === 'edit'"
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900 disabled:bg-arena-50 disabled:text-arena-400
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                placeholder="usuario@caliente.mx" />
            </div>

            <!-- Password -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">
                {{ modalMode === 'create' ? 'Contrasena' : 'Nueva contrasena (dejar vacio para mantener)' }}
              </label>
              <input v-model="formData.password" type="password" :required="modalMode === 'create'" minlength="8"
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                placeholder="Minimo 8 caracteres" />
            </div>

            <!-- Employee ID + Role -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Codigo Empleado</label>
                <input v-model="formData.employee_id" type="text" required :disabled="modalMode === 'edit'"
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900 font-mono disabled:bg-arena-50 disabled:text-arena-400
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                  placeholder="EMP-018" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Rol</label>
                <select v-model="formData.role" required
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-700
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                >
                  <option value="MONITOR_TRADER">Monitor Trader</option>
                  <option value="INPLAY_TRADER">In-Play Trader</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>

            <!-- Team + Phone -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Equipo</label>
                <select v-model="formData.team_uuid"
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-700
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                >
                  <option value="">Sin equipo</option>
                  <option v-for="t in apiTeams" :key="t.uuid" :value="t.uuid">{{ t.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Telefono</label>
                <input v-model="formData.phone" type="text"
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                  placeholder="+52 55 1234 5678" />
              </div>
            </div>

            <!-- Hire date -->
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Fecha de ingreso</label>
              <input v-model="formData.hire_date" type="date"
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-700
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all" />
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
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Guardando...
              </span>
              <span v-else>{{ modalMode === 'create' ? 'Crear Empleado' : 'Guardar Cambios' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- DELETE CONFIRMATION                                -->
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
            <h3 class="text-base font-bold text-arena-900 mb-1">Eliminar empleado</h3>
            <p class="text-sm text-arena-500">
              Estas seguro que deseas eliminar a <span class="font-semibold text-arena-700">{{ deleteTarget.fullName }}</span>?
              Esta accion no se puede deshacer.
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
