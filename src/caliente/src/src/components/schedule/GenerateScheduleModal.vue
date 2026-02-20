<script setup>
import { ref, computed } from 'vue'
import { httpClient } from '@/di/http'
import { ScheduleRepository } from '@/domain/repositories/ScheduleRepository'

const props = defineProps({
  visible: Boolean,
})
const emit = defineEmits(['close', 'generated'])

const scheduleRepo = new ScheduleRepository(httpClient)

// ── State machine: form → generating → results | error ──
const step = ref('form')
const apiError = ref(null)
const generationResult = ref(null)

// ── Form state ──
const now = new Date()
const defaultMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2
const defaultYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()

const selectedMonth = ref(defaultMonth)
const selectedYear = ref(defaultYear)

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const years = computed(() => {
  const cur = new Date().getFullYear()
  return [cur - 1, cur, cur + 1, cur + 2]
})

// ── Computed display helpers ──
const statusConfig = computed(() => {
  const s = generationResult.value?.status
  if (s === 'SUCCESS') return { label: 'Completado', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'check' }
  if (s === 'PARTIAL') return { label: 'Parcial', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'warning' }
  return { label: 'Fallido', bg: 'bg-caliente-50', text: 'text-caliente-700', border: 'border-caliente-200', icon: 'error' }
})

// ── Actions ──
async function generate() {
  step.value = 'generating'
  apiError.value = null
  try {
    const result = await scheduleRepo.generate({
      month: selectedMonth.value,
      year: selectedYear.value,
    })
    generationResult.value = result
    step.value = 'results'
    emit('generated', result)
  } catch (err) {
    apiError.value = err.response?.data?.detail || err.message || 'Error al generar horario'
    step.value = 'error'
  }
}

function reset() {
  step.value = 'form'
  apiError.value = null
  generationResult.value = null
}

function close() {
  reset()
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-arena-900/40 backdrop-blur-sm" @click="close"></div>

      <!-- Panel -->
      <div class="relative w-full max-w-md bg-white rounded-xl border border-arena-200 shadow-xl overflow-hidden">

        <!-- Header -->
        <div class="px-6 py-4 border-b border-arena-100">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-caliente-50 border border-caliente-100 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-caliente-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-arena-900">Crear Horario Mensual</h3>
              <p class="text-xs text-arena-400 mt-0.5">Generacion automatica de turnos</p>
            </div>
          </div>
        </div>

        <!-- ── FORM STATE ── -->
        <div v-if="step === 'form'" class="px-6 py-5 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Mes</label>
              <select
                v-model="selectedMonth"
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-700
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
              >
                <option v-for="(name, idx) in monthNames" :key="idx" :value="idx + 1">{{ name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Ano</label>
              <select
                v-model="selectedYear"
                class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-700
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
              >
                <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
          </div>

          <div class="px-4 py-3 rounded-lg bg-arena-50 border border-arena-200">
            <div class="flex items-start gap-2.5">
              <svg class="w-4 h-4 text-arena-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              <div>
                <p class="text-xs text-arena-600 leading-relaxed">
                  Se generaran los turnos para <strong class="text-arena-800">{{ monthNames[selectedMonth - 1] }} {{ selectedYear }}</strong> usando el algoritmo de asignacion.
                </p>
                <p class="text-[11px] text-arena-400 mt-1.5">Las vacaciones aprobadas y dias festivos se respetaran como restricciones fijas.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── GENERATING STATE ── -->
        <div v-else-if="step === 'generating'" class="px-6 py-14 flex flex-col items-center gap-4">
          <div class="relative w-12 h-12">
            <div class="absolute inset-0 rounded-full border-4 border-arena-100"></div>
            <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-caliente-600 animate-spin"></div>
          </div>
          <div class="text-center">
            <p class="text-sm text-arena-600 font-medium">Generando horario...</p>
            <p class="text-xs text-arena-400 mt-1">{{ monthNames[selectedMonth - 1] }} {{ selectedYear }}</p>
          </div>
        </div>

        <!-- ── RESULTS STATE ── -->
        <div v-else-if="step === 'results'" class="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <!-- Status badge -->
          <div class="flex items-center gap-2.5 px-4 py-3 rounded-lg border" :class="[statusConfig.bg, statusConfig.border]">
            <svg v-if="statusConfig.icon === 'check'" class="w-5 h-5" :class="statusConfig.text" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <svg v-else-if="statusConfig.icon === 'warning'" class="w-5 h-5" :class="statusConfig.text" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <svg v-else class="w-5 h-5" :class="statusConfig.text" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <p class="text-sm font-bold" :class="statusConfig.text">{{ statusConfig.label }}</p>
              <p class="text-[11px] opacity-75" :class="statusConfig.text">{{ monthNames[selectedMonth - 1] }} {{ selectedYear }}</p>
            </div>
          </div>

          <!-- Stats grid -->
          <div class="grid grid-cols-2 gap-2.5">
            <div class="px-3 py-2.5 rounded-lg bg-arena-50 border border-arena-100">
              <p class="text-[10px] font-semibold text-arena-400 uppercase tracking-wider">Asignaciones</p>
              <p class="text-lg font-bold text-arena-900 mt-0.5">{{ generationResult.total_assignments }}</p>
            </div>
            <div class="px-3 py-2.5 rounded-lg bg-arena-50 border border-arena-100">
              <p class="text-[10px] font-semibold text-arena-400 uppercase tracking-wider">Traders</p>
              <p class="text-lg font-bold text-arena-900 mt-0.5">{{ generationResult.traders_scheduled }}</p>
            </div>
            <div class="px-3 py-2.5 rounded-lg bg-arena-50 border border-arena-100">
              <p class="text-[10px] font-semibold text-arena-400 uppercase tracking-wider">Eventos</p>
              <p class="text-lg font-bold text-arena-900 mt-0.5">{{ generationResult.events_considered }}</p>
            </div>
            <div class="px-3 py-2.5 rounded-lg bg-arena-50 border border-arena-100">
              <p class="text-[10px] font-semibold text-arena-400 uppercase tracking-wider">Tiempo</p>
              <p class="text-lg font-bold text-arena-900 mt-0.5">{{ generationResult.execution_time_seconds?.toFixed(1) }}s</p>
            </div>
          </div>

          <!-- Warnings (scrollable) -->
          <div v-if="generationResult.warnings?.length" class="space-y-1.5">
            <p class="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Advertencias ({{ generationResult.warnings.length }})</p>
            <div class="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-amber-200 p-2 bg-amber-50/50">
              <div v-for="(w, i) in generationResult.warnings" :key="i" class="px-2.5 py-1.5 rounded bg-amber-50 border border-amber-100">
                <p class="text-xs text-amber-700">{{ w }}</p>
              </div>
            </div>
          </div>

          <!-- Errors (scrollable) -->
          <div v-if="generationResult.errors?.length" class="space-y-1.5">
            <p class="text-[10px] font-semibold text-caliente-600 uppercase tracking-wider">Errores ({{ generationResult.errors.length }})</p>
            <div class="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-caliente-200 p-2 bg-caliente-50/50">
              <div v-for="(e, i) in generationResult.errors" :key="i" class="px-2.5 py-1.5 rounded bg-caliente-50 border border-caliente-100">
                <p class="text-xs text-caliente-700">{{ e }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── ERROR STATE ── -->
        <div v-else-if="step === 'error'" class="px-6 py-5">
          <div class="flex items-start gap-3 px-4 py-3 rounded-lg bg-caliente-50 border border-caliente-200">
            <svg class="w-5 h-5 text-caliente-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <div>
              <p class="text-sm font-semibold text-caliente-700">Error al generar</p>
              <p class="text-xs text-caliente-600 mt-1">{{ apiError }}</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-arena-100 flex gap-3 justify-end">
          <template v-if="step === 'form'">
            <button
              @click="close"
              class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-500 hover:bg-arena-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              @click="generate"
              class="px-4 py-2 rounded-lg bg-caliente-600 text-sm font-bold text-white hover:bg-caliente-700 transition-colors shadow-sm"
            >
              Generar Horario
            </button>
          </template>
          <template v-else-if="step === 'results' || step === 'error'">
            <button
              v-if="step === 'error'"
              @click="reset"
              class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-500 hover:bg-arena-50 transition-colors"
            >
              Reintentar
            </button>
            <button
              @click="close"
              class="px-4 py-2 rounded-lg bg-caliente-600 text-sm font-bold text-white hover:bg-caliente-700 transition-colors shadow-sm"
            >
              Cerrar
            </button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
