<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { httpClient } from '@/di/http'
import { EmployeeRepository } from '@/domain/repositories/EmployeeRepository'
import { ScheduleRepository } from '@/domain/repositories/ScheduleRepository'
import { ShiftRepository } from '@/domain/repositories/ShiftRepository'
import GenerateScheduleModal from '@/components/schedule/GenerateScheduleModal.vue'
import { useGridSummary } from '@/composables/useGridSummary'

const authStore = useAuthStore()
const employeeRepo = new EmployeeRepository(httpClient)
const scheduleRepo = new ScheduleRepository(httpClient)
const shiftRepo = new ShiftRepository(httpClient)

// Añadido para RBAC — Computed central: solo Admin puede editar el grid
const canEdit = computed(() => authStore.isAdmin)

// ── Generate modal state ──
const showGenerateModal = ref(false)
function openGenerateModal() { showGenerateModal.value = true }
function closeGenerateModal() { showGenerateModal.value = false }
function onScheduleGenerated() { fetchSchedules() }

// ── Loading state ────────────────────────────────────────
const isLoadingData = ref(true)
const loadError = ref(null)

// ── Date helpers ─────────────────────────────────────────
const currentDate = ref(new Date())

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a, b) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

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
      dateStr: formatDate(d),
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

function navigateWeek(dir) {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + dir * 7)
  currentDate.value = d
}
function goToToday() { currentDate.value = new Date() }

// ── Shift color palette (code → tailwind classes) ────────
const SHIFT_COLORS = {
  MON6:    { bg: 'bg-blue-50',     text: 'text-blue-700',     border: 'border-blue-200' },
  MON12:   { bg: 'bg-cyan-50',     text: 'text-cyan-700',     border: 'border-cyan-200' },
  MON14:   { bg: 'bg-indigo-50',   text: 'text-indigo-700',   border: 'border-indigo-200' },
  IP6:     { bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200' },
  IP9:     { bg: 'bg-teal-50',     text: 'text-teal-700',     border: 'border-teal-200' },
  IP10:    { bg: 'bg-green-50',    text: 'text-green-700',    border: 'border-green-200' },
  IP12:    { bg: 'bg-lime-50',     text: 'text-lime-700',     border: 'border-lime-200' },
  IP14:    { bg: 'bg-violet-50',   text: 'text-violet-700',   border: 'border-violet-200' },
  PM7:     { bg: 'bg-sky-50',      text: 'text-sky-700',      border: 'border-sky-200' },
  PM9:     { bg: 'bg-sky-50',      text: 'text-sky-600',      border: 'border-sky-200' },
  NS:      { bg: 'bg-slate-100',   text: 'text-slate-700',    border: 'border-slate-300' },
  'HO-IP6':  { bg: 'bg-orange-50', text: 'text-orange-700',   border: 'border-orange-200' },
  'HO-IP10': { bg: 'bg-amber-50',  text: 'text-amber-600',    border: 'border-amber-200' },
  'HO-IP12': { bg: 'bg-yellow-50', text: 'text-yellow-700',   border: 'border-yellow-200' },
  'HO-IP14': { bg: 'bg-orange-50', text: 'text-orange-600',   border: 'border-orange-200' },
  'IP10-FER14': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  FERDI10: { bg: 'bg-pink-50',     text: 'text-pink-700',     border: 'border-pink-200' },
  FERDI14: { bg: 'bg-rose-50',     text: 'text-rose-700',     border: 'border-rose-200' },
  CUMPLE:  { bg: 'bg-pink-50',     text: 'text-pink-600',     border: 'border-pink-200' },
  OFF:     { bg: 'bg-arena-50',    text: 'text-arena-400',    border: 'border-arena-200' },
  VAC:     { bg: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200' },
  FES:     { bg: 'bg-purple-50',   text: 'text-purple-700',   border: 'border-purple-200' },
}

const CAT_FALLBACK = {
  AM: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  INS: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
  MID: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
  NS: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
  HO: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  STATUS: { bg: 'bg-arena-50', text: 'text-arena-500', border: 'border-arena-200' },
}
const DEF_COLOR = { bg: 'bg-arena-50', text: 'text-arena-500', border: 'border-arena-200' }

// ── API data refs ────────────────────────────────────────
const rawEmployees = ref([])       // All employees from API
const apiShiftTypes = ref([])      // ShiftType models
const shiftCategories = ref([])    // ShiftCategory models
const cycleConfigs = ref([])
const scheduleMap = ref({})        // { employee_uuid: { 'yyyy-mm-dd': shift_code } }
const scheduleUuidMap = ref({})    // { employee_uuid: { 'yyyy-mm-dd': schedule_uuid } }

// ── Lookup maps (built after loading) ────────────────────
const empDbIdToUuid = ref({})      // { 18: 'uuid...' }
const shiftTypeIdToCode = ref({})  // { 22: 'MON6' }
const shiftTypeCodeToId = ref({})  // { 'MON6': 22 }
const catIdToCode = ref({})        // { 7: 'AM' }

// ── Filtered employees for grid (exclude admins, exclude_from_grid) ──
const gridEmployees = computed(() => {
  return rawEmployees.value.filter(emp => !emp.excludeFromGrid)
})

// ── Shift display map ────────────────────────────────────
const shiftDisplayMap = computed(() => {
  const map = {}
  apiShiftTypes.value.forEach(st => {
    const colors = SHIFT_COLORS[st.code] || CAT_FALLBACK[st.categoryCode] || DEF_COLOR
    let time = st.timeRange
    if (!time) {
      if (st.code === 'OFF') time = 'Libre'
      else if (st.code === 'VAC') time = 'Vacaciones'
      else if (st.code === 'FES') time = 'Festivo'
      else if (st.code === 'CUMPLE') time = 'Cumpleaños'
      else time = ''
    }
    map[st.code] = { code: st.code, name: st.name, time, category: st.categoryCode || 'STATUS', ...colors }
  })
  return map
})

function getShiftInfo(code) {
  return shiftDisplayMap.value[code] || { code, name: code, time: '', ...DEF_COLOR }
}

// ── View state ──────────────────────────────────────────
const viewMode = ref('week')
// Añadido para RBAC — Traders ven "Mi Horario" por defecto, Admin/Manager ven "Equipo"
const scopeMode = ref(authStore.isAdmin || authStore.isManager ? 'team' : 'my')

function getShift(empUuid, dateStr) {
  return scheduleMap.value[empUuid]?.[dateStr] || null
}

// ── Cycle sequences ─────────────────────────────────────
const shiftCycles = computed(() => {
  const map = {}
  cycleConfigs.value.forEach(cfg => {
    if (cfg.is_default || !map[cfg.trader_role]) map[cfg.trader_role] = cfg.shift_order
  })
  if (!map.MONITOR_TRADER) map.MONITOR_TRADER = ['MON6', 'MON12', 'MON14', 'OFF']
  if (!map.INPLAY_TRADER) map.INPLAY_TRADER = ['IP6', 'IP9', 'IP10', 'IP12', 'IP14', 'OFF']
  return map
})

function getCycleForRole(role) { return shiftCycles.value[role] || shiftCycles.value.MONITOR_TRADER || ['OFF'] }

function getNextInCycle(cur, role, dir = 1) {
  const cycle = getCycleForRole(role)
  // Closed loop: [null, ...shifts] — blank is index 0
  const fullCycle = [null, ...cycle]
  if (!cur) {
    // Currently blank (index 0) → advance/retreat in the full cycle
    return fullCycle[(0 + dir + fullCycle.length) % fullCycle.length]
  }
  const idx = fullCycle.indexOf(cur)
  if (idx === -1) return fullCycle[1] || null
  return fullCycle[(idx + dir + fullCycle.length) % fullCycle.length]
}

function getNextShiftPreview(empUuid, dayIndex) {
  const dateStr = weekDays.value[dayIndex].dateStr
  const emp = rawEmployees.value.find(e => e.uuid === empUuid)
  const role = emp?.role || 'MONITOR_TRADER'
  const current = getShift(empUuid, dateStr)
  const next = getNextInCycle(current, role, 1)
  return { current, next }
}

// ── Undo stack ──────────────────────────────────────────
const undoStack = ref([])
const MAX_UNDO = 50

function pushUndo(empUuid, dateStr, oldCode) {
  undoStack.value.push({ empUuid, dateStr, oldCode })
  if (undoStack.value.length > MAX_UNDO) undoStack.value.shift()
}

function undo() {
  if (!canEdit.value) return // Añadido para RBAC — Guard
  const entry = undoStack.value.pop()
  if (!entry) return
  if (!scheduleMap.value[entry.empUuid]) scheduleMap.value[entry.empUuid] = {}
  if (entry.oldCode) {
    scheduleMap.value[entry.empUuid][entry.dateStr] = entry.oldCode
    saveScheduleToApi(entry.empUuid, entry.dateStr, entry.oldCode)
  } else {
    delete scheduleMap.value[entry.empUuid][entry.dateStr]
    deleteScheduleFromApi(entry.empUuid, entry.dateStr)
  }
  const dayIdx = weekDays.value.findIndex(d => d.dateStr === entry.dateStr)
  if (dayIdx !== -1) flashCell(entry.empUuid, dayIdx)
}

// ── Cell flash ──────────────────────────────────────────
const flashingCell = ref(null)
let flashTimer = null
function flashCell(empUuid, dayIndex) {
  flashingCell.value = `${empUuid}-${dayIndex}`
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flashingCell.value = null }, 300)
}

// ── API schedule save (create or update) ─────────────────
async function saveScheduleToApi(empUuid, date, shiftCode) {
  if (!canEdit.value) return // Añadido para RBAC — Guard
  const emp = rawEmployees.value.find(e => e.uuid === empUuid)
  if (!emp) return

  const shiftTypeId = shiftTypeCodeToId.value[shiftCode]
  if (!shiftTypeId) return

  try {
    const existingUuid = scheduleUuidMap.value[empUuid]?.[date]
    if (existingUuid) {
      await scheduleRepo.update(existingUuid, { shift_type: shiftTypeId })
    } else {
      const dto = await scheduleRepo.create({
        employee: emp.dbId,
        shift_type: shiftTypeId,
        date: date,
      })
      if (!scheduleUuidMap.value[empUuid]) scheduleUuidMap.value[empUuid] = {}
      scheduleUuidMap.value[empUuid][date] = dto.uuid
    }
  } catch (err) {
    console.error('Error saving shift:', err)
  }
}

// ── API schedule delete ─────────────────────────────────
async function deleteScheduleFromApi(empUuid, date) {
  if (!canEdit.value) return
  try {
    const existingUuid = scheduleUuidMap.value[empUuid]?.[date]
    if (existingUuid) {
      await scheduleRepo.remove(existingUuid)
      delete scheduleUuidMap.value[empUuid][date]
    }
  } catch (err) {
    console.error('Error deleting shift:', err)
  }
}

// ── Click-to-cycle (HU-005) ────────────────────────────
function handleCellClick(employee, dayIndex, event) {
  if (!canEdit.value) return // Añadido para RBAC — Guard
  event.preventDefault()
  if (editingCell.value) closeShiftPicker()

  const dateStr = weekDays.value[dayIndex].dateStr
  const dir = event.shiftKey ? -1 : 1
  const oldCode = getShift(employee.uuid, dateStr)
  const newCode = getNextInCycle(oldCode, employee.role, dir)

  pushUndo(employee.uuid, dateStr, oldCode)
  if (!scheduleMap.value[employee.uuid]) scheduleMap.value[employee.uuid] = {}
  if (newCode === null) {
    delete scheduleMap.value[employee.uuid][dateStr]
    deleteScheduleFromApi(employee.uuid, dateStr)
  } else {
    scheduleMap.value[employee.uuid][dateStr] = newCode
    saveScheduleToApi(employee.uuid, dateStr, newCode)
  }
  flashCell(employee.uuid, dayIndex)
}

// ── Right-click shift picker ────────────────────────────
const editingCell = ref(null)
const pickerPos = ref({ top: 0, left: 0 })

function handleCellRightClick(employee, dayIndex, event) {
  event.preventDefault()
  event.stopPropagation()
  if (!canEdit.value) return // Añadido para RBAC — Guard (after preventDefault to block browser menu)
  const rect = event.currentTarget.getBoundingClientRect()
  const vw = window.innerWidth, vh = window.innerHeight
  let top = rect.bottom + 6, left = rect.left
  if (left + 300 > vw - 16) left = vw - 316
  if (left < 16) left = 16
  if (top + 420 > vh - 16) top = rect.top - 426
  pickerPos.value = { top, left }
  editingCell.value = { empUuid: employee.uuid, dayIndex }
}

function selectShift(code) {
  if (!canEdit.value) return // Añadido para RBAC — Guard
  if (editingCell.value) {
    const { empUuid, dayIndex } = editingCell.value
    const dateStr = weekDays.value[dayIndex].dateStr
    const oldCode = getShift(empUuid, dateStr)
    pushUndo(empUuid, dateStr, oldCode)
    if (!scheduleMap.value[empUuid]) scheduleMap.value[empUuid] = {}
    if (code === null) {
      delete scheduleMap.value[empUuid][dateStr]
      deleteScheduleFromApi(empUuid, dateStr)
    } else {
      scheduleMap.value[empUuid][dateStr] = code
      saveScheduleToApi(empUuid, dateStr, code)
    }
    flashCell(empUuid, dayIndex)
  }
  editingCell.value = null
}

function removeShift() {
  if (!canEdit.value) return // Añadido para RBAC — Guard
  if (editingCell.value) {
    const { empUuid, dayIndex } = editingCell.value
    const dateStr = weekDays.value[dayIndex].dateStr
    const oldCode = getShift(empUuid, dateStr)
    pushUndo(empUuid, dateStr, oldCode)
    if (!scheduleMap.value[empUuid]) scheduleMap.value[empUuid] = {}
    delete scheduleMap.value[empUuid][dateStr]
    flashCell(empUuid, dayIndex)
    deleteScheduleFromApi(empUuid, dateStr)
  }
  editingCell.value = null
}

function closeShiftPicker() { editingCell.value = null }

// ── Hover tooltip ───────────────────────────────────────
const tooltipCell = ref(null)
const tooltipPos = ref({ top: 0, left: 0 })
let tooltipTimer = null

function handleCellMouseEnter(employee, dayIndex, event) {
  if (!canEdit.value) return // Añadido para RBAC — No tooltip de edición en modo lectura
  clearTimeout(tooltipTimer)
  tooltipTimer = setTimeout(() => {
    const rect = event.currentTarget.getBoundingClientRect()
    tooltipPos.value = { top: rect.top - 36, left: rect.left + rect.width / 2 }
    tooltipCell.value = { empUuid: employee.uuid, dayIndex }
  }, 500)
}
function handleCellMouseLeave() { clearTimeout(tooltipTimer); tooltipCell.value = null }

// ── Global listeners ────────────────────────────────────
function onGlobalClick(e) {
  if (editingCell.value && !e.target.closest('.shift-picker-popover') && !e.target.closest('.shift-cell')) closeShiftPicker()
}
function onKeydown(e) {
  if (e.key === 'Escape') closeShiftPicker()
  if (!canEdit.value) return // Añadido para RBAC — No undo en modo lectura
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
}

// ── Grouped shifts for context menu ─────────────────────
const groupedShifts = computed(() => {
  const groups = {}
  const order = ['AM', 'INS', 'MID', 'NS', 'HO', 'STATUS']
  order.forEach(catCode => {
    const cat = shiftCategories.value.find(c => c.code === catCode)
    const shifts = apiShiftTypes.value.filter(st => st.categoryCode === catCode && st.isActive)
    if (shifts.length) groups[catCode] = { label: cat?.name || catCode, shifts }
  })
  return groups
})

// ── Coverage stats ──────────────────────────────────────
const coverageCats = computed(() => shiftCategories.value.filter(c => ['AM', 'INS', 'MID'].includes(c.code)))

const coverageStats = computed(() => {
  return weekDays.value.map(day => {
    const counts = {}
    shiftCategories.value.forEach(cat => { counts[cat.code] = { count: 0, min: cat.minTraders } })
    gridEmployees.value.forEach(emp => {
      const code = getShift(emp.uuid, day.dateStr)
      if (!code) return
      const st = apiShiftTypes.value.find(s => s.code === code)
      if (st?.categoryCode && counts[st.categoryCode]) counts[st.categoryCode].count++
    })
    return counts
  })
})

// ── My schedule (personal view) ──────────────────────────
const myEmployee = computed(() => {
  const empId = authStore.user?.employeeId
  return empId ? rawEmployees.value.find(e => e.employeeId === empId) : null
})

const mySchedule = computed(() => {
  const emp = myEmployee.value
  return weekDays.value.map(day => {
    const code = emp ? (getShift(emp.uuid, day.dateStr) || 'OFF') : 'OFF'
    return { ...day, shiftCode: code, shiftInfo: getShiftInfo(code) }
  })
})

// ── Grid Summary (composable) ───────────────────────────
const { summaryRows, getCellAlert } = useGridSummary(
  gridEmployees, scheduleMap, weekDays, apiShiftTypes, shiftCategories
)
const showSummaryPanel = ref(true)

// Category accent colors for left-border on summary rows
const CAT_ACCENT = {
  AM:  'border-l-blue-400',
  INS: 'border-l-teal-400',
  MID: 'border-l-indigo-400',
  NS:  'border-l-slate-400',
  HO:  'border-l-orange-400',
}

function getSummaryCellClasses(row, count) {
  const alert = getCellAlert(row, count)
  if (row.type === 'total') return 'bg-arena-900 text-white font-bold'
  if (row.type === 'category') {
    if (alert === 'danger') return 'bg-caliente-100/80 text-caliente-700 font-bold'
    if (alert === 'warning') return 'bg-amber-100/80 text-amber-700 font-semibold'
    return 'text-arena-800 font-semibold'
  }
  if (row.type === 'off') return count === 0 ? 'text-arena-300' : 'text-arena-500'
  // shift
  if (alert === 'low') return 'bg-caliente-50/60 text-caliente-300'
  return 'text-arena-700'
}

function getSummaryLabelClasses(row) {
  if (row.type === 'total') return 'bg-arena-900 text-white font-bold uppercase tracking-wider'
  if (row.type === 'category') return 'text-arena-700 font-bold'
  if (row.type === 'off') return 'text-arena-400 font-semibold'
  return 'text-arena-500 font-medium'
}

function getSummaryRowBg(row) {
  if (row.type === 'total') return 'bg-arena-900'
  if (row.type === 'category') return 'bg-arena-100/50'
  if (row.type === 'off') return 'bg-arena-50/80'
  return ''
}

function getSummaryLeftAccent(row) {
  if (row.type === 'shift' && row.categoryCode) return CAT_ACCENT[row.categoryCode] || 'border-l-arena-200'
  if (row.type === 'category') return CAT_ACCENT[row.label] || 'border-l-arena-300'
  if (row.type === 'total') return 'border-l-caliente-500'
  if (row.type === 'off') return 'border-l-arena-300'
  return 'border-l-transparent'
}

// ── Data fetching ───────────────────────────────────────
function buildLookupMaps() {
  const empMap = {}
  rawEmployees.value.forEach(emp => { empMap[emp.dbId] = emp.uuid })
  empDbIdToUuid.value = empMap

  const catMap = {}
  shiftCategories.value.forEach(cat => { catMap[cat.id] = cat.code })
  catIdToCode.value = catMap

  apiShiftTypes.value.forEach(st => {
    if (!st.categoryCode && st.rawCategoryId) {
      st.categoryCode = catMap[st.rawCategoryId] || null
    }
  })

  const idToCode = {}, codeToId = {}
  apiShiftTypes.value.forEach(st => {
    idToCode[st.id] = st.code
    codeToId[st.code] = st.id
  })
  shiftTypeIdToCode.value = idToCode
  shiftTypeCodeToId.value = codeToId
}

async function fetchSchedules() {
  const start = weekStart.value
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const dtos = await scheduleRepo.getAll({ date_from: formatDate(start), date_to: formatDate(end) })
  const codeMap = {}
  const uuidMap = {}
  dtos.forEach(dto => {
    const empUuid = empDbIdToUuid.value[dto.employee]
    const shiftCode = shiftTypeIdToCode.value[dto.shift_type]
    if (!empUuid || !shiftCode) return
    if (!codeMap[empUuid]) codeMap[empUuid] = {}
    if (!uuidMap[empUuid]) uuidMap[empUuid] = {}
    codeMap[empUuid][dto.date] = shiftCode
    uuidMap[empUuid][dto.date] = dto.uuid
  })
  scheduleMap.value = codeMap
  scheduleUuidMap.value = uuidMap
}

watch(weekStart, () => { fetchSchedules() })

onMounted(async () => {
  document.addEventListener('click', onGlobalClick)
  document.addEventListener('keydown', onKeydown)
  try {
    isLoadingData.value = true
    await Promise.all([
      employeeRepo.getAll().then(r => { rawEmployees.value = r }),
      shiftRepo.getTypes().then(r => { apiShiftTypes.value = r }),
      shiftRepo.getCategories().then(r => { shiftCategories.value = r }),
      shiftRepo.getCycleConfigs().then(r => { cycleConfigs.value = r }).catch(() => { cycleConfigs.value = [] }),
    ])
    buildLookupMaps()
    await fetchSchedules()
  } catch (err) {
    loadError.value = err.message || 'Error cargando datos'
    console.error('Dashboard load error:', err)
  } finally {
    isLoadingData.value = false
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onGlobalClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div>
    <!-- ── LOADING STATE ── -->
    <div v-if="isLoadingData" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="relative w-12 h-12">
        <div class="absolute inset-0 rounded-full border-4 border-arena-100"></div>
        <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-caliente-600 animate-spin"></div>
      </div>
      <p class="text-sm text-arena-400 font-medium">Cargando horarios...</p>
    </div>

    <!-- ── ERROR STATE ── -->
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

    <!-- ================================================================ -->
    <!-- DASHBOARD UNIFICADO — Todos los roles                             -->
    <!-- Añadido para RBAC — Se eliminó la bifurcación por rol.            -->
    <!-- Ahora todos ven la misma estructura; canEdit controla la edición. -->
    <!-- ================================================================ -->
    <template v-else>

      <!-- Title row -->
      <div class="mb-6">
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-bold text-arena-900">
            {{ scopeMode === 'team' ? 'Horario del Equipo' : 'Mi Horario' }}
          </h2>
          <!-- Añadido para RBAC — Badge de solo lectura para no-editores -->
          <span
            v-if="!canEdit"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-arena-100 border border-arena-200/60 text-[11px] font-semibold text-arena-400 uppercase tracking-wide"
          >
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Solo lectura
          </span>
        </div>
        <p class="text-sm text-arena-400 mt-1">{{ weekLabel }}</p>
      </div>

      <!-- ── Toolbar ── -->
      <div class="flex flex-wrap items-center gap-3 mb-5">
        <!-- Añadido para RBAC — Solo Admin ve el botón de generar horario -->
        <button v-if="canEdit" @click="openGenerateModal" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-700 bg-white hover:bg-arena-50 transition-colors">
          <svg class="w-4 h-4 text-arena-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          Crear Horario Mensual
        </button>

        <div class="inline-flex items-center rounded-lg border border-arena-200 overflow-hidden">
          <button
            v-for="mode in [{ key: 'day', label: 'Día' }, { key: 'week', label: 'Semana' }, { key: 'month', label: 'Mes' }]"
            :key="mode.key"
            @click="viewMode = mode.key"
            class="px-4 py-2 text-sm font-medium transition-colors"
            :class="viewMode === mode.key ? 'bg-caliente-600 text-white' : 'bg-white text-arena-600 hover:bg-arena-50'"
          >{{ mode.label }}</button>
        </div>

        <div class="inline-flex items-center gap-1">
          <button
            @click="scopeMode = 'team'"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="scopeMode === 'team' ? 'bg-caliente-600 text-white' : 'bg-white border border-arena-200 text-arena-600 hover:bg-arena-50'"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
            Equipo
          </button>
          <button
            @click="scopeMode = 'my'"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="scopeMode === 'my' ? 'bg-caliente-600 text-white' : 'bg-white border border-arena-200 text-arena-600 hover:bg-arena-50'"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            Mi Horario
          </button>
        </div>

        <div class="flex-1"></div>

        <!-- Week navigation -->
        <div class="inline-flex items-center gap-2">
          <button @click="goToToday" class="px-3 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 bg-white hover:bg-arena-50 transition-colors">Hoy</button>
          <button @click="navigateWeek(-1)" class="p-2 rounded-lg border border-arena-200 text-arena-500 bg-white hover:bg-arena-50 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </button>
          <button @click="navigateWeek(1)" class="p-2 rounded-lg border border-arena-200 text-arena-500 bg-white hover:bg-arena-50 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      </div>

      <!-- ── TEAM GRID VIEW ── -->
      <template v-if="scopeMode === 'team'">
        <div class="bg-white border border-arena-200 rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[860px]">
              <thead>
                <tr class="border-b border-arena-200">
                  <th class="sticky left-0 z-10 bg-white w-[200px] min-w-[200px] px-5 py-4 text-left text-xs font-semibold text-arena-400 uppercase tracking-wider border-r border-arena-100">
                    Empleado
                  </th>
                  <th
                    v-for="(day, idx) in weekDays" :key="idx"
                    class="px-2 py-4 text-center min-w-[110px]"
                    :class="day.isWeekend ? 'bg-arena-50/50' : ''"
                  >
                    <div class="text-xs font-semibold text-arena-400 uppercase">{{ day.name }}</div>
                    <div
                      class="text-sm font-bold mt-1 inline-flex items-center justify-center"
                      :class="day.isToday ? 'w-7 h-7 rounded-full bg-caliente-600 text-white' : 'text-arena-700'"
                    >{{ day.date }}</div>
                    <div class="text-[10px] text-arena-400 capitalize mt-0.5">{{ day.month }}</div>
                  </th>
                </tr>
              </thead>

              <tbody class="divide-y divide-arena-100">
                <tr
                  v-for="employee in gridEmployees" :key="employee.uuid"
                  class="group hover:bg-arena-50/30 transition-colors"
                >
                  <td class="sticky left-0 z-10 bg-white group-hover:bg-arena-50/30 transition-colors px-5 py-3 border-r border-arena-100">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        :class="employee.isMonitorTrader ? 'bg-blue-50 text-blue-700' : employee.isInplayTrader ? 'bg-emerald-50 text-emerald-700' : 'bg-arena-100 text-arena-500'"
                      >{{ employee.initials }}</div>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-arena-900 truncate">{{ employee.fullName }}</p>
                        <p class="text-xs text-arena-400 mt-0.5">{{ employee.roleLabel }}</p>
                      </div>
                    </div>
                  </td>

                  <!-- Añadido para RBAC — cursor-pointer solo si canEdit -->
                  <td
                    v-for="(day, dayIdx) in weekDays" :key="dayIdx"
                    class="shift-cell px-1.5 py-1.5 text-center select-none transition-colors"
                    :class="[
                      canEdit ? 'cursor-pointer' : '',
                      day.isWeekend ? 'bg-arena-50/50' : '',
                      editingCell?.empUuid === employee.uuid && editingCell?.dayIndex === dayIdx ? 'ring-2 ring-caliente-400 ring-inset' : ''
                    ]"
                    @click="handleCellClick(employee, dayIdx, $event)"
                    @contextmenu="handleCellRightClick(employee, dayIdx, $event)"
                    @mouseenter="handleCellMouseEnter(employee, dayIdx, $event)"
                    @mouseleave="handleCellMouseLeave"
                  >
                    <div
                      v-if="getShift(employee.uuid, day.dateStr)"
                      class="rounded-lg border px-2 py-2.5 transition-all"
                      :class="[
                        getShiftInfo(getShift(employee.uuid, day.dateStr)).bg,
                        getShiftInfo(getShift(employee.uuid, day.dateStr)).text,
                        getShiftInfo(getShift(employee.uuid, day.dateStr)).border,
                        flashingCell === `${employee.uuid}-${dayIdx}` ? 'scale-105 shadow-md' : canEdit ? 'hover:scale-[1.02] hover:shadow-sm' : '',
                      ]"
                    >
                      <div class="text-xs font-bold leading-tight">{{ getShift(employee.uuid, day.dateStr) }}</div>
                      <div class="text-[10px] opacity-75 mt-0.5">{{ getShiftInfo(getShift(employee.uuid, day.dateStr)).time }}</div>
                    </div>

                    <!-- Añadido para RBAC — Celda vacía: "+" solo para editores, vacío para lectura -->
                    <div
                      v-else
                      class="rounded-lg border border-dashed h-[52px] flex items-center justify-center transition-all"
                      :class="canEdit
                        ? (flashingCell === `${employee.uuid}-${dayIdx}` ? 'border-caliente-300 bg-caliente-50/30' : 'border-transparent hover:border-arena-300')
                        : 'border-transparent'"
                    >
                      <svg v-if="canEdit" class="w-4 h-4 text-arena-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ── Summary panel ── -->
          <div class="border-t-2 border-arena-300">
            <!-- Toggle bar -->
            <button
              @click="showSummaryPanel = !showSummaryPanel"
              class="w-full flex items-center gap-2 px-5 py-2 bg-arena-100/80 hover:bg-arena-100 transition-colors text-left group"
            >
              <svg
                class="w-3.5 h-3.5 text-arena-400 transition-transform duration-200"
                :class="showSummaryPanel ? 'rotate-90' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              <span class="text-[11px] font-bold text-arena-500 uppercase tracking-wider">Sumatorias</span>
              <span class="text-[10px] text-arena-400 ml-1">{{ summaryRows.length }} filas</span>
            </button>

            <!-- Expandable summary table -->
            <div v-show="showSummaryPanel" class="overflow-x-auto">
              <table class="w-full min-w-[860px]">
                <tbody>
                  <template v-for="(row, rowIdx) in summaryRows" :key="row.key">
                    <!-- Separator before OFF row -->
                    <tr v-if="row.type === 'off'" class="h-0">
                      <td :colspan="weekDays.length + 1" class="p-0">
                        <div class="h-px bg-arena-300/60"></div>
                      </td>
                    </tr>
                    <!-- Separator before first category row -->
                    <tr v-if="row.type === 'category' && (rowIdx === 0 || summaryRows[rowIdx - 1]?.type !== 'category')" class="h-0">
                      <td :colspan="weekDays.length + 1" class="p-0">
                        <div class="h-px bg-arena-300/60"></div>
                      </td>
                    </tr>
                    <!-- Separator before total row -->
                    <tr v-if="row.type === 'total'" class="h-0">
                      <td :colspan="weekDays.length + 1" class="p-0">
                        <div class="h-0.5 bg-arena-400"></div>
                      </td>
                    </tr>

                    <!-- Data row -->
                    <tr :class="getSummaryRowBg(row)">
                      <!-- Label cell (sticky) -->
                      <td
                        class="sticky left-0 z-10 w-[200px] min-w-[200px] px-5 py-1.5 border-r border-arena-100 border-l-[3px]"
                        :class="[
                          getSummaryLabelClasses(row),
                          getSummaryLeftAccent(row),
                          row.type === 'total' ? 'bg-arena-900' : row.type === 'category' ? 'bg-arena-100/50' : row.type === 'off' ? 'bg-arena-50/80' : 'bg-white',
                        ]"
                      >
                        <div class="flex items-center gap-2">
                          <span class="text-[11px] tabular-nums">{{ row.label }}</span>
                          <span
                            v-if="row.type === 'category' && row.minRequired > 0"
                            class="text-[9px] px-1 py-0.5 rounded bg-arena-200/60 text-arena-400 font-medium"
                          >min {{ row.minRequired }}</span>
                        </div>
                      </td>

                      <!-- Day count cells -->
                      <td
                        v-for="(count, dayIdx) in row.counts" :key="dayIdx"
                        class="px-2 py-1.5 text-center min-w-[110px] tabular-nums text-xs"
                        :class="[
                          getSummaryCellClasses(row, count),
                          weekDays[dayIdx]?.isWeekend && row.type !== 'total' ? 'opacity-75' : '',
                        ]"
                      >
                        {{ count }}
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Shift legend -->
        <div class="mt-4 flex flex-wrap gap-3">
          <div v-for="shift in apiShiftTypes.filter(s => s.isActive)" :key="shift.code" class="flex items-center gap-1.5">
            <span
              class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border"
              :class="[getShiftInfo(shift.code).bg, getShiftInfo(shift.code).text, getShiftInfo(shift.code).border]"
            >{{ shift.code }}</span>
            <span class="text-[11px] text-arena-400">{{ shift.timeRange || shift.name }}</span>
          </div>
        </div>

        <!-- Añadido para RBAC — Atajos de teclado solo visibles para editores -->
        <div v-if="canEdit" class="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-arena-400">
          <span><kbd class="px-1 py-0.5 rounded border border-arena-200 bg-arena-50 font-mono text-arena-500">Clic</kbd> Ciclar turno</span>
          <span><kbd class="px-1 py-0.5 rounded border border-arena-200 bg-arena-50 font-mono text-arena-500">Shift+Clic</kbd> Ciclar inverso</span>
          <span><kbd class="px-1 py-0.5 rounded border border-arena-200 bg-arena-50 font-mono text-arena-500">Clic derecho</kbd> Menú de turnos</span>
          <span><kbd class="px-1 py-0.5 rounded border border-arena-200 bg-arena-50 font-mono text-arena-500">Ctrl+Z</kbd> Deshacer</span>
        </div>
      </template>

      <!-- ── MY SCHEDULE VIEW ── -->
      <template v-else>
        <!-- Añadido para RBAC — Saludo personal para traders en Mi Horario -->
        <p v-if="!canEdit" class="text-sm text-arena-500 mb-4">
          Hola, <span class="font-semibold text-arena-700">{{ authStore.fullName }}</span> — aquí tienes tu horario de la semana
        </p>

        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          <div
            v-for="day in mySchedule" :key="day.dateStr"
            class="bg-white border rounded-xl p-4 text-center transition-colors"
            :class="day.isToday ? 'border-caliente-200 ring-1 ring-caliente-100' : 'border-arena-200'"
          >
            <p class="text-xs font-medium text-arena-400">{{ day.name }}</p>
            <p class="text-lg font-bold mt-1" :class="day.isToday ? 'text-caliente-600' : 'text-arena-700'">{{ day.date }}</p>
            <p class="text-[11px] text-arena-400 mb-3">{{ day.month }}</p>
            <div class="inline-flex items-center px-3 py-1.5 rounded-md border text-xs font-bold" :class="[day.shiftInfo.bg, day.shiftInfo.text, day.shiftInfo.border]">
              {{ day.shiftCode }}
            </div>
            <p class="text-[10px] text-arena-400 mt-1.5">{{ day.shiftInfo.time }}</p>
          </div>
        </div>

        <!-- Añadido para RBAC — Quick action links para Traders en Mi Horario -->
        <div v-if="authStore.isTrader" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <router-link to="/swap-requests" class="flex items-center gap-4 bg-white border border-arena-200 rounded-xl px-5 py-4 hover:border-arena-300 transition-colors group">
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

          <router-link to="/vacations" class="flex items-center gap-4 bg-white border border-arena-200 rounded-xl px-5 py-4 hover:border-arena-300 transition-colors group">
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

      <!-- ── HOVER TOOLTIP (solo editores) ── -->
      <!-- Añadido para RBAC — Tooltip de preview solo para editores -->
      <Teleport to="body">
        <div
          v-if="tooltipCell && !editingCell && canEdit"
          class="fixed z-40 pointer-events-none"
          :style="{ top: tooltipPos.top + 'px', left: tooltipPos.left + 'px', transform: 'translateX(-50%)' }"
        >
          <div class="bg-arena-900 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-md shadow-lg whitespace-nowrap">
            <span>{{ getNextShiftPreview(tooltipCell.empUuid, tooltipCell.dayIndex).current || 'Vacío' }}</span>
            <span class="text-arena-400 mx-1">&rarr;</span>
            <span class="text-caliente-300">{{ getNextShiftPreview(tooltipCell.empUuid, tooltipCell.dayIndex).next || 'Vacío' }}</span>
            <span class="text-arena-500 ml-1.5">(clic)</span>
          </div>
        </div>
      </Teleport>

      <!-- ── SHIFT PICKER POPOVER (solo editores) ── -->
      <!-- Añadido para RBAC — Menú contextual solo para editores -->
      <Teleport to="body">
        <div v-if="editingCell && canEdit" class="shift-picker-popover fixed z-50" :style="{ top: pickerPos.top + 'px', left: pickerPos.left + 'px' }">
          <div class="w-[300px] bg-white rounded-xl border border-arena-200 shadow-lg overflow-hidden">
            <div class="px-4 py-3 border-b border-arena-100 bg-arena-50/50">
              <p class="text-xs font-semibold text-arena-700 uppercase tracking-wider">Asignar turno directo</p>
              <p class="text-[10px] text-arena-400 mt-0.5">Clic derecho — bypass del ciclo</p>
            </div>

            <div class="p-3 max-h-[320px] overflow-y-auto space-y-3">
              <div v-for="(group, catCode) in groupedShifts" :key="catCode">
                <p class="text-[10px] font-bold text-arena-400 uppercase tracking-wider mb-1.5 px-1">{{ group.label }}</p>
                <div class="grid grid-cols-2 gap-1.5">
                  <button
                    v-for="shift in group.shifts" :key="shift.code"
                    @click="selectShift(shift.code)"
                    class="flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-all hover:scale-[1.02] hover:shadow-sm"
                    :class="[getShiftInfo(shift.code).bg, getShiftInfo(shift.code).border]"
                  >
                    <span class="text-xs font-bold" :class="getShiftInfo(shift.code).text">{{ shift.code }}</span>
                    <span class="text-[10px] opacity-70" :class="getShiftInfo(shift.code).text">{{ getShiftInfo(shift.code).time }}</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="px-3 py-2.5 border-t border-arena-100 flex gap-2">
              <button @click="removeShift" class="flex-1 px-3 py-1.5 rounded-lg border border-caliente-200 text-xs font-semibold text-caliente-600 bg-caliente-50 hover:bg-caliente-100 transition-colors">
                Quitar turno
              </button>
              <button @click="closeShiftPicker" class="flex-1 px-3 py-1.5 rounded-lg border border-arena-200 text-xs font-semibold text-arena-500 hover:bg-arena-100 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ── GENERATE SCHEDULE MODAL ── -->
      <GenerateScheduleModal
        :visible="showGenerateModal"
        @close="closeGenerateModal"
        @generated="onScheduleGenerated"
      />
    </template>
  </div>
</template>
