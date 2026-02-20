<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { httpClient } from '@/di/http'
import { SystemSettingsRepository } from '@/domain/repositories/SystemSettingsRepository'

const authStore = useAuthStore()
// Añadido para RBAC — Vista exclusiva de administrador
const isAdmin = computed(() => authStore.isAdmin)

const settingsRepo = new SystemSettingsRepository(httpClient)

// ── Tab state ─────────────────────────────────────────
const activeTab = ref('system')
const tabs = [
  { key: 'system', label: 'Sistema' },
  { key: 'profile', label: 'Perfil' },
]

// ── System settings state ─────────────────────────────
const settings = ref(null)
const settingsLoading = ref(false)
const settingsError = ref(null)
const saveSuccess = ref(false)
const initialLoading = ref(false)
const initialError = ref(null)

const settingsForm = reactive({
  max_consecutive_days: 5,
  min_rest_hours: 11,
  weekend_scheduling: true,
  auto_approval: false,
  notification_email_enabled: true,
  notification_whatsapp_enabled: false,
  default_algorithm_version: '1.0',
})

// ── Profile state ─────────────────────────────────────
const profilePhone = ref('')
const profileSaving = ref(false)
const profileSuccess = ref(false)
const profileError = ref(null)

const userInfo = computed(() => ({
  name: authStore.fullName,
  email: authStore.user?.email || '',
  role: authStore.user?.role || '',
  roleLabel: authStore.user?.roleLabel || '',
  phone: authStore.user?.phone || '',
  employeeId: authStore.user?.employeeId || '',
  teamId: authStore.user?.teamId || null,
}))

// ── Role badge colors (same as EmployeesView) ────────
function getRoleInfo(role) {
  const map = {
    MONITOR_TRADER: { label: 'Monitor Trader', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    INPLAY_TRADER: { label: 'In-Play Trader', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    MANAGER: { label: 'Manager', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
    ADMIN: { label: 'Administrador', bg: 'bg-caliente-50', text: 'text-caliente-700', border: 'border-caliente-100', dot: 'bg-caliente-500' },
  }
  return map[role] || { label: role, bg: 'bg-arena-100', text: 'text-arena-600', border: 'border-arena-200', dot: 'bg-arena-400' }
}

// ── Data fetching ─────────────────────────────────────
async function fetchSettings() {
  initialLoading.value = true
  initialError.value = null
  try {
    const data = await settingsRepo.get()
    settings.value = data
    if (data) {
      settingsForm.max_consecutive_days = data.max_consecutive_days ?? 5
      settingsForm.min_rest_hours = data.min_rest_hours ?? 11
      settingsForm.weekend_scheduling = data.weekend_scheduling ?? true
      settingsForm.auto_approval = data.auto_approval ?? false
      settingsForm.notification_email_enabled = data.notification_email_enabled ?? true
      settingsForm.notification_whatsapp_enabled = data.notification_whatsapp_enabled ?? false
      settingsForm.default_algorithm_version = data.default_algorithm_version ?? '1.0'
    }
  } catch (err) {
    initialError.value = err.response?.data?.detail || err.message || 'Error al cargar configuración'
    console.error('Settings load error:', err)
  } finally {
    initialLoading.value = false
  }
}

async function saveSettings() {
  settingsLoading.value = true
  settingsError.value = null
  saveSuccess.value = false
  try {
    const payload = {
      max_consecutive_days: settingsForm.max_consecutive_days,
      min_rest_hours: settingsForm.min_rest_hours,
      weekend_scheduling: settingsForm.weekend_scheduling,
      auto_approval: settingsForm.auto_approval,
      notification_email_enabled: settingsForm.notification_email_enabled,
      notification_whatsapp_enabled: settingsForm.notification_whatsapp_enabled,
      default_algorithm_version: settingsForm.default_algorithm_version,
    }
    await settingsRepo.update(payload)
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (err) {
    const data = err.response?.data
    if (data && typeof data === 'object' && !data.detail) {
      const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      settingsError.value = msgs.join(' | ')
    } else {
      settingsError.value = data?.detail || err.message || 'Error al guardar'
    }
  } finally {
    settingsLoading.value = false
  }
}

async function saveProfile() {
  profileSaving.value = true
  profileError.value = null
  profileSuccess.value = false
  try {
    await httpClient.patch('auth/me/', { phone: profilePhone.value })
    if (authStore.user) {
      authStore.user.phone = profilePhone.value
      localStorage.setItem('user', JSON.stringify(authStore.user))
    }
    profileSuccess.value = true
    setTimeout(() => { profileSuccess.value = false }, 3000)
  } catch (err) {
    profileError.value = err.response?.data?.detail || err.message || 'Error al actualizar perfil'
  } finally {
    profileSaving.value = false
  }
}

// ── Lifecycle ─────────────────────────────────────────
onMounted(() => {
  if (isAdmin.value) {
    fetchSettings()
  }
  profilePhone.value = userInfo.value.phone
})

watch(() => userInfo.value.phone, (newVal) => {
  profilePhone.value = newVal
})
</script>

<template>
  <div>
    <!-- ═══════ ZONA ADMIN EXCLUSIVA ═══════ -->

    <!-- ── ACCESS DENIED (non-admin safety net) ── -->
    <div v-if="!isAdmin" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="w-16 h-16 rounded-full bg-caliente-50 flex items-center justify-center">
        <svg class="w-8 h-8 text-caliente-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
      </div>
      <h3 class="text-lg font-bold text-arena-900">Acceso Restringido</h3>
      <p class="text-sm text-arena-400 text-center max-w-sm">Solo los administradores pueden acceder a esta sección</p>
      <router-link
        to="/dashboard"
        class="mt-2 px-5 py-2.5 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700 active:scale-[0.98] transition-all shadow-sm"
      >
        Ir al Dashboard
      </router-link>
    </div>

    <!-- ── ADMIN CONTENT ── -->
    <template v-else>

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-arena-900">Configuración</h2>
          <p class="text-sm text-arena-400 mt-1">Ajustes del sistema y perfil de usuario</p>
        </div>
      </div>

      <!-- Tab switcher (pill group) -->
      <div class="inline-flex items-center rounded-lg border border-arena-200 overflow-hidden mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="px-5 py-2 text-sm font-medium transition-colors"
          :class="activeTab === tab.key
            ? 'bg-caliente-600 text-white'
            : 'bg-white text-arena-600 hover:bg-arena-50'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- ══════════════════════════════════════════════════ -->
      <!-- SISTEMA TAB                                        -->
      <!-- ══════════════════════════════════════════════════ -->
      <template v-if="activeTab === 'system'">

        <!-- Loading -->
        <div v-if="initialLoading" class="flex flex-col items-center justify-center py-24 gap-4">
          <div class="relative w-12 h-12">
            <div class="absolute inset-0 rounded-full border-4 border-arena-100"></div>
            <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-caliente-600 animate-spin"></div>
          </div>
          <p class="text-sm text-arena-400 font-medium">Cargando configuración...</p>
        </div>

        <!-- Load error -->
        <div v-else-if="initialError" class="flex flex-col items-center justify-center py-24 gap-4">
          <div class="w-12 h-12 rounded-full bg-caliente-50 flex items-center justify-center">
            <svg class="w-6 h-6 text-caliente-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <p class="text-sm text-arena-600 font-medium">{{ initialError }}</p>
          <button
            @click="fetchSettings"
            class="px-4 py-2 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors"
          >
            Reintentar
          </button>
        </div>

        <!-- Settings form -->
        <template v-else>

          <!-- Success banner -->
          <div
            v-if="saveSuccess"
            class="mb-5 bg-success-50 border border-success-200 text-success-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Configuración guardada correctamente
          </div>

          <!-- Error banner -->
          <div
            v-if="settingsError"
            class="mb-5 bg-caliente-50 border border-caliente-200 text-caliente-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {{ settingsError }}
          </div>

          <div class="space-y-5">

            <!-- ── Section 1: Reglas de Horario ── -->
            <div class="bg-white border border-arena-200 rounded-xl p-6">
              <div class="mb-5">
                <h3 class="text-sm font-bold text-arena-900">Reglas de Horario</h3>
                <p class="text-xs text-arena-400 mt-0.5">Parámetros que rigen la generación y validación de turnos</p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <!-- max_consecutive_days -->
                <div>
                  <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">
                    Máx. días consecutivos
                  </label>
                  <input
                    v-model.number="settingsForm.max_consecutive_days"
                    type="number"
                    min="1"
                    max="30"
                    class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                           focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                  />
                  <p class="text-[11px] text-arena-400 mt-1">Máximo de días seguidos que un empleado puede trabajar</p>
                </div>

                <!-- min_rest_hours -->
                <div>
                  <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">
                    Horas mínimas de descanso
                  </label>
                  <input
                    v-model.number="settingsForm.min_rest_hours"
                    type="number"
                    min="1"
                    max="48"
                    class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                           focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                  />
                  <p class="text-[11px] text-arena-400 mt-1">Horas de descanso entre turnos</p>
                </div>
              </div>
            </div>

            <!-- ── Section 2: Políticas ── -->
            <div class="bg-white border border-arena-200 rounded-xl p-6">
              <div class="mb-5">
                <h3 class="text-sm font-bold text-arena-900">Políticas</h3>
                <p class="text-xs text-arena-400 mt-0.5">Reglas de negocio para programación y aprobaciones</p>
              </div>

              <div class="space-y-5">
                <!-- weekend_scheduling -->
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-arena-900">Programación de fin de semana</p>
                    <p class="text-xs text-arena-400 mt-0.5">Permitir asignación de turnos en sábado y domingo</p>
                  </div>
                  <button
                    @click="settingsForm.weekend_scheduling = !settingsForm.weekend_scheduling"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4"
                    :class="settingsForm.weekend_scheduling ? 'bg-caliente-600' : 'bg-arena-300'"
                    role="switch"
                    :aria-checked="settingsForm.weekend_scheduling"
                  >
                    <span
                      class="inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm"
                      :class="settingsForm.weekend_scheduling ? 'translate-x-6' : 'translate-x-1'"
                    />
                  </button>
                </div>

                <div class="border-t border-arena-100"></div>

                <!-- auto_approval -->
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-arena-900">Aprobación automática</p>
                    <p class="text-xs text-arena-400 mt-0.5">Aprobar automáticamente intercambios y vacaciones</p>
                  </div>
                  <button
                    @click="settingsForm.auto_approval = !settingsForm.auto_approval"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4"
                    :class="settingsForm.auto_approval ? 'bg-caliente-600' : 'bg-arena-300'"
                    role="switch"
                    :aria-checked="settingsForm.auto_approval"
                  >
                    <span
                      class="inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm"
                      :class="settingsForm.auto_approval ? 'translate-x-6' : 'translate-x-1'"
                    />
                  </button>
                </div>
              </div>
            </div>

            <!-- ── Section: Algoritmo ── -->
            <div class="bg-white border border-arena-200 rounded-xl p-6">
              <div class="mb-5">
                <h3 class="text-sm font-bold text-arena-900">Algoritmo</h3>
                <p class="text-xs text-arena-400 mt-0.5">Versión del motor de generación de horarios</p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <!-- default_algorithm_version -->
                <div>
                  <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">
                    Versión del algoritmo
                  </label>
                  <input
                    v-model="settingsForm.default_algorithm_version"
                    type="text"
                    class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                           focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                  />
                  <p class="text-[11px] text-arena-400 mt-1">Identificador de versión del motor de generación automática</p>
                </div>
              </div>
            </div>

            <!-- ── Section 4: Notificaciones ── -->
            <div class="bg-white border border-arena-200 rounded-xl p-6">
              <div class="mb-5">
                <h3 class="text-sm font-bold text-arena-900">Notificaciones</h3>
                <p class="text-xs text-arena-400 mt-0.5">Canales de comunicación para alertas del sistema</p>
              </div>

              <div class="space-y-5">
                <!-- notification_email -->
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-arena-900">Notificaciones por email</p>
                    <p class="text-xs text-arena-400 mt-0.5">Enviar alertas de cambios de turno, aprobaciones y recordatorios por correo</p>
                  </div>
                  <button
                    @click="settingsForm.notification_email_enabled = !settingsForm.notification_email_enabled"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4"
                    :class="settingsForm.notification_email_enabled ? 'bg-caliente-600' : 'bg-arena-300'"
                    role="switch"
                    :aria-checked="settingsForm.notification_email_enabled"
                  >
                    <span
                      class="inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm"
                      :class="settingsForm.notification_email_enabled ? 'translate-x-6' : 'translate-x-1'"
                    />
                  </button>
                </div>

                <div class="border-t border-arena-100"></div>

                <!-- notification_whatsapp -->
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-arena-900">Notificaciones por WhatsApp</p>
                    <p class="text-xs text-arena-400 mt-0.5">Enviar alertas importantes a través de WhatsApp Business</p>
                  </div>
                  <button
                    @click="settingsForm.notification_whatsapp_enabled = !settingsForm.notification_whatsapp_enabled"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4"
                    :class="settingsForm.notification_whatsapp_enabled ? 'bg-caliente-600' : 'bg-arena-300'"
                    role="switch"
                    :aria-checked="settingsForm.notification_whatsapp_enabled"
                  >
                    <span
                      class="inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm"
                      :class="settingsForm.notification_whatsapp_enabled ? 'translate-x-6' : 'translate-x-1'"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Save footer -->
          <div class="mt-6 flex items-center justify-end gap-3">
            <button
              @click="fetchSettings"
              :disabled="settingsLoading"
              class="px-4 py-2.5 rounded-lg border border-arena-200 text-sm font-medium text-arena-600 hover:bg-arena-50 transition-colors disabled:opacity-50"
            >
              Restablecer
            </button>
            <button
              @click="saveSettings"
              :disabled="settingsLoading"
              class="px-5 py-2.5 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700
                     active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="settingsLoading" class="inline-flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando...
              </span>
              <span v-else>Guardar Configuración</span>
            </button>
          </div>

        </template>
      </template>

      <!-- ══════════════════════════════════════════════════ -->
      <!-- PERFIL TAB                                         -->
      <!-- ══════════════════════════════════════════════════ -->
      <template v-if="activeTab === 'profile'">

        <!-- Success banner -->
        <div
          v-if="profileSuccess"
          class="mb-5 bg-success-50 border border-success-200 text-success-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Perfil actualizado correctamente
        </div>

        <!-- Error banner -->
        <div
          v-if="profileError"
          class="mb-5 bg-caliente-50 border border-caliente-200 text-caliente-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {{ profileError }}
        </div>

        <div class="space-y-5">

          <!-- Profile info card -->
          <div class="bg-white border border-arena-200 rounded-xl p-6">
            <div class="mb-5">
              <h3 class="text-sm font-bold text-arena-900">Información Personal</h3>
              <p class="text-xs text-arena-400 mt-0.5">Datos de tu cuenta y perfil de empleado</p>
            </div>

            <!-- Avatar + name header -->
            <div class="flex items-center gap-4 mb-6 pb-6 border-b border-arena-100">
              <div
                class="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                :class="[getRoleInfo(userInfo.role).bg, getRoleInfo(userInfo.role).text]"
              >
                {{ userInfo.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() }}
              </div>
              <div>
                <p class="text-base font-bold text-arena-900">{{ userInfo.name }}</p>
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold mt-1"
                  :class="[getRoleInfo(userInfo.role).bg, getRoleInfo(userInfo.role).text, getRoleInfo(userInfo.role).border]"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="getRoleInfo(userInfo.role).dot"></span>
                  {{ userInfo.roleLabel }}
                </span>
              </div>
            </div>

            <!-- Readonly fields -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <!-- Name (readonly) -->
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Nombre completo</label>
                <input
                  :value="userInfo.name"
                  type="text"
                  disabled
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900 bg-arena-50 disabled:text-arena-400 transition-all"
                />
              </div>

              <!-- Email (readonly) -->
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  :value="userInfo.email"
                  type="email"
                  disabled
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900 bg-arena-50 disabled:text-arena-400 transition-all"
                />
              </div>

              <!-- Employee ID (readonly) -->
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Código de empleado</label>
                <input
                  :value="userInfo.employeeId || '—'"
                  type="text"
                  disabled
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900 font-mono bg-arena-50 disabled:text-arena-400 transition-all"
                />
              </div>

              <!-- Phone (editable) -->
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                <input
                  v-model="profilePhone"
                  type="text"
                  placeholder="+52 55 1234 5678"
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900
                         focus:outline-none focus:ring-2 focus:ring-caliente-600/20 focus:border-caliente-500 transition-all"
                />
                <p class="text-[11px] text-arena-400 mt-1">Campo editable — se guardará al presionar el botón</p>
              </div>

              <!-- Role (readonly) -->
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Rol</label>
                <input
                  :value="userInfo.roleLabel"
                  type="text"
                  disabled
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900 bg-arena-50 disabled:text-arena-400 transition-all"
                />
              </div>

              <!-- Team (readonly) -->
              <div>
                <label class="block text-[11px] font-semibold text-arena-500 uppercase tracking-wider mb-1.5">Equipo</label>
                <input
                  :value="userInfo.teamId ? `Equipo #${userInfo.teamId}` : 'Sin equipo asignado'"
                  type="text"
                  disabled
                  class="w-full px-3 py-2 rounded-lg border border-arena-200 text-sm text-arena-900 bg-arena-50 disabled:text-arena-400 transition-all"
                />
              </div>
            </div>
          </div>

          <!-- Save profile footer -->
          <div class="flex items-center justify-end">
            <button
              @click="saveProfile"
              :disabled="profileSaving"
              class="px-5 py-2.5 rounded-lg bg-caliente-600 text-white text-sm font-medium hover:bg-caliente-700
                     active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="profileSaving" class="inline-flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando...
              </span>
              <span v-else>Actualizar Perfil</span>
            </button>
          </div>
        </div>

      </template>

    </template>
  </div>
</template>
