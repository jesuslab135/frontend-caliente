<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'

const authStore = useAuthStore()

// --- Shared state ---
const currentDate = ref(new Date())

const weekStart = computed(() => {
  const d = new Date(currentDate.value)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
})

const weekDays = computed(() => {
  const days = []
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.value)
    d.setDate(d.getDate() + i)
    days.push({
      name: dayNames[i],
      date: d.getDate(),
      month: d.toLocaleString('es-MX', { month: 'short' }),
      full: new Date(d),
      isToday: isSameDay(d, new Date()),
      isWeekend: i >= 5,
    })
  }
  return days
})

const weekLabel = computed(() => {
  const start = weekStart.value
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const opts = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('es-MX', opts)} — ${end.toLocaleDateString('es-MX', opts)}, ${end.getFullYear()}`
})

function isSameDay(a, b) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

function navigateWeek(direction) {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + (direction * 7))
  currentDate.value = d
}

function goToToday() {
  currentDate.value = new Date()
}

// --- Shift styling ---
const shiftColors = {
  MON6:  { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200',    label: '6:00-14:00' },
  MON12: { bg: 'bg-cyan-100',    text: 'text-cyan-700',    border: 'border-cyan-200',    label: '12:00-20:00' },
  MON14: { bg: 'bg-indigo-100',  text: 'text-indigo-700',  border: 'border-indigo-200',  label: '14:00-22:00' },
  IP6:   { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', label: '6:00-14:00' },
  IP9:   { bg: 'bg-teal-100',    text: 'text-teal-700',    border: 'border-teal-200',    label: '9:00-17:00' },
  IP10:  { bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-200',   label: '10:00-18:00' },
  IP12:  { bg: 'bg-lime-100',    text: 'text-lime-700',    border: 'border-lime-200',    label: '12:00-20:00' },
  IP14:  { bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-200',  label: '14:00-22:00' },
  OFF:   { bg: 'bg-arena-100',   text: 'text-arena-400',   border: 'border-arena-200',   label: 'Libre' },
  VAC:   { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   label: 'Vacaciones' },
}

function getShiftStyle(code) {
  return shiftColors[code] || shiftColors.OFF
}

function getRoleBadge(role) {
  if (role === 'MONITOR_TRADER') return { label: 'MON', class: 'bg-blue-50 text-blue-600' }
  if (role === 'INPLAY_TRADER') return { label: 'IP', class: 'bg-emerald-50 text-emerald-600' }
  if (role === 'MANAGER') return { label: 'MGR', class: 'bg-violet-50 text-violet-600' }
  return { label: 'ADM', class: 'bg-caliente-50 text-caliente-600' }
}

// ============================================================
// ADMIN / MANAGER — Global grid view
// ============================================================

const viewMode = ref('week')
const viewModes = [
  { key: 'day', label: 'Día' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'team', label: 'Equipo' },
]

// Demo employee list (replaced by API)
const allEmployees = ref([
  { id: 1, name: 'Carlos Hernández', employeeId: 'EMP-001', role: 'MONITOR_TRADER', team: 'Equipo A' },
  { id: 2, name: 'María López', employeeId: 'EMP-002', role: 'MONITOR_TRADER', team: 'Equipo A' },
  { id: 3, name: 'Juan García', employeeId: 'EMP-003', role: 'INPLAY_TRADER', team: 'Equipo A' },
  { id: 4, name: 'Ana Martínez', employeeId: 'EMP-004', role: 'INPLAY_TRADER', team: 'Equipo B' },
  { id: 5, name: 'Roberto Sánchez', employeeId: 'EMP-005', role: 'MONITOR_TRADER', team: 'Equipo B' },
  { id: 6, name: 'Laura Torres', employeeId: 'EMP-006', role: 'INPLAY_TRADER', team: 'Equipo B' },
  { id: 7, name: 'Diego Ramírez', employeeId: 'EMP-007', role: 'MONITOR_TRADER', team: 'Equipo A' },
  { id: 8, name: 'Sofia Flores', employeeId: 'EMP-008', role: 'INPLAY_TRADER', team: 'Equipo A' },
])

// Demo schedules (employee id → shift codes per day-of-week index)
const allSchedules = ref({
  1: ['MON6',  'MON6',  'MON12', 'MON6',  'MON14', 'OFF',   'OFF'],
  2: ['MON14', 'MON14', 'MON6',  'MON14', 'MON12', 'MON6',  'OFF'],
  3: ['IP9',   'IP6',   'IP12',  'IP9',   'OFF',   'IP6',   'OFF'],
  4: ['IP14',  'IP10',  'IP9',   'OFF',   'IP14',  'IP10',  'IP9'],
  5: ['MON12', 'OFF',   'MON14', 'MON12', 'MON6',  'MON14', 'OFF'],
  6: ['OFF',   'IP14',  'IP6',   'IP10',  'IP9',   'OFF',   'IP12'],
  7: ['MON6',  'MON12', 'OFF',   'MON6',  'MON14', 'MON12', 'OFF'],
  8: ['IP12',  'IP9',   'IP14',  'IP6',   'IP10',  'VAC',   'VAC'],
})

function getShift(employeeId, dayIndex) {
  return allSchedules.value[employeeId]?.[dayIndex] || null
}

// Coverage stats per day
const coverageStats = computed(() => {
  return weekDays.value.map((_, dayIndex) => {
    let am = 0, ins = 0, mid = 0
    allEmployees.value.forEach(emp => {
      const shift = getShift(emp.id, dayIndex)
      if (shift === 'MON6' || shift === 'IP6') am++
      if (shift === 'MON12' || shift === 'IP9' || shift === 'IP10' || shift === 'IP12') ins++
      if (shift === 'MON14' || shift === 'IP14') mid++
    })
    return { am, ins, mid }
  })
})

// Summary cards data (demo)
const summaryCards = computed(() => [
  { label: 'Empleados Activos', value: allEmployees.value.length, icon: 'users', accent: 'text-arena-700' },
  { label: 'En turno hoy', value: allEmployees.value.filter(e => { const s = getShift(e.id, weekDays.value.findIndex(d => d.isToday)); return s && s !== 'OFF' && s !== 'VAC' }).length, icon: 'clock', accent: 'text-success-500' },
  { label: 'Intercambios pendientes', value: 2, icon: 'swap', accent: 'text-warning-500' },
  { label: 'Vacaciones pendientes', value: 1, icon: 'sun', accent: 'text-caliente-600' },
])

// ============================================================
// TRADER — Personal schedule view
// ============================================================

// Simulated "my" schedule — uses employee ID 3 as demo trader
const mySchedule = computed(() => {
  const myId = 3 // Will come from authStore.user.id once connected
  return weekDays.value.map((day, idx) => {
    const code = allSchedules.value[myId]?.[idx] || 'OFF'
    return { ...day, shiftCode: code, shiftStyle: getShiftStyle(code) }
  })
})

const myNextShift = computed(() => {
  return mySchedule.value.find(d => {
    const code = d.shiftCode
    return !d.full || d.full >= new Date() ? code !== 'OFF' && code !== 'VAC' : false
  })
})
</script>

<template>
  <div>
    <!-- ================================================================ -->
    <!-- ADMIN / MANAGER DASHBOARD                                        -->
    <!-- ================================================================ -->
    <template v-if="authStore.isManager || authStore.isAdmin">
      <!-- Summary cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          v-for="card in summaryCards"
          :key="card.label"
          class="bg-white border border-arena-200 rounded-lg px-5 py-4"
        >
          <p class="text-xs font-medium text-arena-400 uppercase tracking-wider">{{ card.label }}</p>
          <p class="text-2xl font-bold mt-1" :class="card.accent">{{ card.value }}</p>
        </div>
      </div>

      <!-- Header row -->
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-lg font-semibold text-arena-900">Horarios</h2>
          <p class="text-sm text-arena-400 mt-0.5">{{ weekLabel }}</p>
        </div>

        <div class="flex items-center gap-3">
          <button class="flex items-center gap-2 px-3.5 py-2 rounded-md bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
            </svg>
            Generar Horario
          </button>
        </div>
      </div>

      <!-- View mode tabs + Week navigation -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex gap-1 bg-arena-100 rounded-lg p-0.5">
          <button
            v-for="mode in viewModes"
            :key="mode.key"
            @click="viewMode = mode.key"
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            :class="viewMode === mode.key
              ? 'bg-white text-arena-900 shadow-sm'
              : 'text-arena-500 hover:text-arena-700'"
          >
            {{ mode.label }}
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="goToToday"
            class="px-2.5 py-1.5 rounded-md border border-arena-200 text-xs font-medium text-arena-600 hover:bg-arena-100 transition-colors"
          >
            Hoy
          </button>
          <button
            @click="navigateWeek(-1)"
            class="p-1.5 rounded-md border border-arena-200 text-arena-500 hover:bg-arena-100 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            @click="navigateWeek(1)"
            class="p-1.5 rounded-md border border-arena-200 text-arena-500 hover:bg-arena-100 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Schedule Grid -->
      <div class="bg-white border border-arena-200 rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[800px]">
            <thead>
              <tr class="border-b border-arena-200">
                <th class="sticky left-0 z-10 bg-white w-[200px] min-w-[200px] px-4 py-3 text-left text-xs font-semibold text-arena-500 uppercase tracking-wider border-r border-arena-100">
                  Empleado
                </th>
                <th
                  v-for="(day, idx) in weekDays"
                  :key="idx"
                  class="px-2 py-3 text-center min-w-[110px]"
                  :class="day.isWeekend ? 'bg-arena-50/50' : ''"
                >
                  <div class="text-xs font-medium text-arena-400">{{ day.name }}</div>
                  <div
                    class="text-sm font-semibold mt-0.5 inline-flex items-center justify-center"
                    :class="day.isToday
                      ? 'w-7 h-7 rounded-full bg-caliente-600 text-white'
                      : 'text-arena-700'"
                  >
                    {{ day.date }}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-arena-100">
              <tr
                v-for="employee in allEmployees"
                :key="employee.id"
                class="group hover:bg-arena-50/50 transition-colors"
              >
                <td class="sticky left-0 z-10 bg-white group-hover:bg-arena-50/50 transition-colors px-4 py-2.5 border-r border-arena-100">
                  <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-full bg-arena-100 flex items-center justify-center shrink-0">
                      <span class="text-xs font-medium text-arena-500">{{ employee.name.charAt(0) }}</span>
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-arena-900 truncate">{{ employee.name }}</p>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span
                          class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none"
                          :class="getRoleBadge(employee.role).class"
                        >
                          {{ getRoleBadge(employee.role).label }}
                        </span>
                        <span class="text-[11px] text-arena-400">{{ employee.team }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <td
                  v-for="(day, dayIdx) in weekDays"
                  :key="dayIdx"
                  class="px-1.5 py-1.5 text-center"
                  :class="day.isWeekend ? 'bg-arena-50/50' : ''"
                >
                  <button
                    v-if="getShift(employee.id, dayIdx)"
                    class="w-full px-2 py-1.5 rounded-md border text-xs font-semibold transition-all duration-100 hover:scale-[1.03] hover:shadow-sm cursor-pointer"
                    :class="[
                      getShiftStyle(getShift(employee.id, dayIdx)).bg,
                      getShiftStyle(getShift(employee.id, dayIdx)).text,
                      getShiftStyle(getShift(employee.id, dayIdx)).border,
                    ]"
                    :title="`${getShift(employee.id, dayIdx)} — ${getShiftStyle(getShift(employee.id, dayIdx)).label}`"
                  >
                    {{ getShift(employee.id, dayIdx) }}
                  </button>
                  <div v-else class="w-full px-2 py-1.5 text-xs text-arena-300">—</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Coverage footer -->
        <div class="border-t border-arena-200 bg-arena-50/50">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[800px]">
              <tr>
                <td class="sticky left-0 z-10 bg-arena-50/50 w-[200px] min-w-[200px] px-4 py-2 border-r border-arena-100">
                  <span class="text-[11px] font-semibold text-arena-400 uppercase tracking-wider">Cobertura</span>
                </td>
                <td
                  v-for="(stats, idx) in coverageStats"
                  :key="idx"
                  class="px-2 py-2 text-center"
                >
                  <div class="flex items-center justify-center gap-1.5">
                    <span class="text-[10px] font-medium" :class="stats.am >= 3 ? 'text-success-500' : 'text-caliente-600'">
                      AM:{{ stats.am }}
                    </span>
                    <span class="text-arena-300">·</span>
                    <span class="text-[10px] font-medium text-arena-400">
                      INS:{{ stats.ins }}
                    </span>
                    <span class="text-arena-300">·</span>
                    <span class="text-[10px] font-medium" :class="stats.mid >= 3 ? 'text-success-500' : 'text-caliente-600'">
                      MID:{{ stats.mid }}
                    </span>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </div>

      <!-- Shift legend -->
      <div class="mt-4 flex flex-wrap gap-3">
        <div
          v-for="(style, code) in shiftColors"
          :key="code"
          class="flex items-center gap-1.5"
        >
          <span
            class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border"
            :class="[style.bg, style.text, style.border]"
          >
            {{ code }}
          </span>
          <span class="text-[11px] text-arena-400">{{ style.label }}</span>
        </div>
      </div>
    </template>

    <!-- ================================================================ -->
    <!-- TRADER DASHBOARD — "Mi Horario"                                  -->
    <!-- ================================================================ -->
    <template v-else>
      <!-- Welcome -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold text-arena-900">
          Hola, {{ authStore.fullName }}
        </h2>
        <p class="text-sm text-arena-400 mt-0.5">
          Aquí tienes tu horario de la semana · {{ weekLabel }}
        </p>
      </div>

      <!-- Week nav -->
      <div class="flex items-center gap-2 mb-5">
        <button
          @click="goToToday"
          class="px-2.5 py-1.5 rounded-md border border-arena-200 text-xs font-medium text-arena-600 hover:bg-arena-100 transition-colors"
        >
          Hoy
        </button>
        <button
          @click="navigateWeek(-1)"
          class="p-1.5 rounded-md border border-arena-200 text-arena-500 hover:bg-arena-100 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button
          @click="navigateWeek(1)"
          class="p-1.5 rounded-md border border-arena-200 text-arena-500 hover:bg-arena-100 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      <!-- My schedule — day cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        <div
          v-for="day in mySchedule"
          :key="day.date"
          class="bg-white border rounded-lg p-4 text-center transition-colors"
          :class="day.isToday
            ? 'border-caliente-200 ring-1 ring-caliente-100'
            : 'border-arena-200'"
        >
          <p class="text-xs font-medium text-arena-400">{{ day.name }}</p>
          <p
            class="text-lg font-bold mt-1"
            :class="day.isToday ? 'text-caliente-600' : 'text-arena-700'"
          >
            {{ day.date }}
          </p>
          <p class="text-[11px] text-arena-400 mb-3">{{ day.month }}</p>

          <div
            class="inline-flex items-center px-3 py-1.5 rounded-md border text-xs font-bold"
            :class="[day.shiftStyle.bg, day.shiftStyle.text, day.shiftStyle.border]"
          >
            {{ day.shiftCode }}
          </div>
          <p class="text-[10px] text-arena-400 mt-1.5">
            {{ shiftColors[day.shiftCode]?.label || '' }}
          </p>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <router-link
          to="/swap-requests"
          class="flex items-center gap-4 bg-white border border-arena-200 rounded-lg px-5 py-4 hover:border-arena-300 transition-colors group"
        >
          <div class="w-10 h-10 rounded-full bg-caliente-50 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-caliente-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-arena-900 group-hover:text-caliente-600 transition-colors">Solicitar Intercambio</p>
            <p class="text-xs text-arena-400 mt-0.5">Intercambia un turno con un compañero</p>
          </div>
        </router-link>

        <router-link
          to="/vacations"
          class="flex items-center gap-4 bg-white border border-arena-200 rounded-lg px-5 py-4 hover:border-arena-300 transition-colors group"
        >
          <div class="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-arena-900 group-hover:text-amber-600 transition-colors">Solicitar Vacaciones</p>
            <p class="text-xs text-arena-400 mt-0.5">Envía una solicitud de periodo vacacional</p>
          </div>
        </router-link>
      </div>
    </template>
  </div>
</template>
