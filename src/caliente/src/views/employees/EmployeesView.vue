<script setup>
import { ref, computed } from 'vue'

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

const teams = [
  { value: 'all', label: 'Todos los equipos' },
  { value: 'Equipo A', label: 'Equipo A' },
  { value: 'Equipo B', label: 'Equipo B' },
]

// Demo data
const employees = ref([
  { id: 1, name: 'Carlos Hernández', email: 'carlos.h@caliente.mx', employeeId: 'EMP-001', role: 'MONITOR_TRADER', team: 'Equipo A', phone: '+52 55 1234 5678', isActive: true, hireDate: '2023-03-15' },
  { id: 2, name: 'María López', email: 'maria.l@caliente.mx', employeeId: 'EMP-002', role: 'MONITOR_TRADER', team: 'Equipo A', phone: '+52 55 2345 6789', isActive: true, hireDate: '2023-06-01' },
  { id: 3, name: 'Juan García', email: 'juan.g@caliente.mx', employeeId: 'EMP-003', role: 'INPLAY_TRADER', team: 'Equipo A', phone: '+52 55 3456 7890', isActive: true, hireDate: '2024-01-10' },
  { id: 4, name: 'Ana Martínez', email: 'ana.m@caliente.mx', employeeId: 'EMP-004', role: 'INPLAY_TRADER', team: 'Equipo B', phone: '+52 55 4567 8901', isActive: true, hireDate: '2023-09-20' },
  { id: 5, name: 'Roberto Sánchez', email: 'roberto.s@caliente.mx', employeeId: 'EMP-005', role: 'MONITOR_TRADER', team: 'Equipo B', phone: '', isActive: true, hireDate: '2024-04-05' },
  { id: 6, name: 'Laura Torres', email: 'laura.t@caliente.mx', employeeId: 'EMP-006', role: 'INPLAY_TRADER', team: 'Equipo B', phone: '+52 55 6789 0123', isActive: false, hireDate: '2023-11-12' },
  { id: 7, name: 'Diego Ramírez', email: 'diego.r@caliente.mx', employeeId: 'EMP-007', role: 'MANAGER', team: 'Equipo A', phone: '+52 55 7890 1234', isActive: true, hireDate: '2022-08-01' },
  { id: 8, name: 'Sofía Flores', email: 'sofia.f@caliente.mx', employeeId: 'EMP-008', role: 'ADMIN', team: null, phone: '+52 55 8901 2345', isActive: true, hireDate: '2022-01-15' },
])

const filteredEmployees = computed(() => {
  return employees.value.filter(emp => {
    const matchesSearch = !searchQuery.value ||
      emp.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesRole = roleFilter.value === 'all' || emp.role === roleFilter.value
    const matchesTeam = teamFilter.value === 'all' || emp.team === teamFilter.value
    return matchesSearch && matchesRole && matchesTeam
  })
})

function getRoleInfo(role) {
  const map = {
    MONITOR_TRADER: { label: 'Monitor Trader', class: 'bg-blue-50 text-blue-700 border-blue-200' },
    INPLAY_TRADER: { label: 'In-Play Trader', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    MANAGER: { label: 'Manager', class: 'bg-violet-50 text-violet-700 border-violet-200' },
    ADMIN: { label: 'Administrador', class: 'bg-caliente-50 text-caliente-700 border-caliente-100' },
  }
  return map[role] || { label: role, class: 'bg-arena-100 text-arena-600 border-arena-200' }
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-lg font-semibold text-arena-900">Empleados</h2>
        <p class="text-sm text-arena-400 mt-0.5">{{ filteredEmployees.length }} de {{ employees.length }} empleados</p>
      </div>

      <button class="flex items-center gap-2 px-3.5 py-2 rounded-md bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700 transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Agregar Empleado
      </button>
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
          placeholder="Buscar por nombre, email o código..."
          class="w-full pl-9 pr-3 py-2 rounded-md border border-arena-300 bg-white text-sm text-arena-900 placeholder-arena-400
                 focus:outline-none focus:ring-2 focus:ring-caliente-600/30 focus:border-caliente-600 transition-colors"
        />
      </div>

      <!-- Role filter -->
      <select
        v-model="roleFilter"
        class="px-3 py-2 rounded-md border border-arena-300 bg-white text-sm text-arena-700
               focus:outline-none focus:ring-2 focus:ring-caliente-600/30 focus:border-caliente-600 transition-colors"
      >
        <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
      </select>

      <!-- Team filter -->
      <select
        v-model="teamFilter"
        class="px-3 py-2 rounded-md border border-arena-300 bg-white text-sm text-arena-700
               focus:outline-none focus:ring-2 focus:ring-caliente-600/30 focus:border-caliente-600 transition-colors"
      >
        <option v-for="t in teams" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
    </div>

    <!-- Employee cards grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="employee in filteredEmployees"
        :key="employee.id"
        class="bg-white border border-arena-200 rounded-lg p-5 hover:border-arena-300 transition-colors group"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <!-- Avatar -->
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
              :class="employee.isActive ? 'bg-caliente-50 text-caliente-600' : 'bg-arena-100 text-arena-400'"
            >
              {{ getInitials(employee.name) }}
            </div>
            <div>
              <p class="text-sm font-semibold text-arena-900">{{ employee.name }}</p>
              <p class="text-xs text-arena-400 mt-0.5">{{ employee.employeeId }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="p-1.5 rounded-md text-arena-400 hover:text-arena-600 hover:bg-arena-100 transition-colors" title="Editar">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </button>
            <button class="p-1.5 rounded-md text-arena-400 hover:text-caliente-600 hover:bg-caliente-50 transition-colors" title="Eliminar">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Info rows -->
        <div class="space-y-2.5">
          <!-- Role -->
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold"
              :class="getRoleInfo(employee.role).class"
            >
              {{ getRoleInfo(employee.role).label }}
            </span>
            <span v-if="!employee.isActive" class="inline-flex items-center px-2 py-0.5 rounded-md bg-arena-100 border border-arena-200 text-arena-400 text-[11px] font-semibold">
              Inactivo
            </span>
          </div>

          <!-- Email -->
          <div class="flex items-center gap-2 text-sm">
            <svg class="w-3.5 h-3.5 text-arena-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            <span class="text-arena-600 truncate">{{ employee.email }}</span>
          </div>

          <!-- Team -->
          <div class="flex items-center gap-2 text-sm">
            <svg class="w-3.5 h-3.5 text-arena-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
            <span class="text-arena-600">{{ employee.team || 'Sin equipo' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="filteredEmployees.length === 0" class="text-center py-16">
      <svg class="mx-auto w-12 h-12 text-arena-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
      <p class="text-sm text-arena-500 mt-3">No se encontraron empleados con los filtros seleccionados</p>
    </div>
  </div>
</template>
