<script setup>
import { ref, computed } from 'vue'
import { httpClient } from '@/di/http'
import { API_ROUTES } from '@/domain/constants/endpoints'

const email = ref('')
const isLoading = ref(false)
const error = ref(null)
const sent = ref(false)

const canSubmit = computed(() => email.value.trim().length > 0)

async function handleSubmit() {
  isLoading.value = true
  error.value = null

  try {
    const url = `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.PASSWORD_RESET}`
    await httpClient.post(url, { email: email.value.trim() })
    sent.value = true
  } catch (err) {
    error.value = err.response?.data?.detail || 'Error al enviar las instrucciones'
  } finally {
    isLoading.value = false
  }
}

function resetForm() {
  sent.value = false
  email.value = ''
  error.value = null
}
</script>

<template>
  <div class="min-h-screen bg-arena-50 flex flex-col items-center justify-center px-4 sm:px-6">
    <div class="relative w-full max-w-[420px]">
      <!-- Logo & Brand -->
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center mb-4">
          <div class="text-4xl font-extrabold tracking-tight">
            <span class="text-caliente-600">CALIENTE</span><span class="text-arena-400">.mx</span>
          </div>
        </div>
        <div class="mx-auto w-16 h-[2px] bg-caliente-600 rounded-full"></div>
        <p class="mt-4 text-sm text-arena-400 tracking-wide uppercase">Enterprise Scheduler System</p>
      </div>

      <!-- Success State -->
      <div v-if="sent" class="bg-white border border-arena-200 rounded-lg p-8 shadow-sm text-center">
        <div class="mx-auto w-12 h-12 rounded-full bg-success-50 flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-arena-900 mb-2">Instrucciones enviadas</h2>
        <p class="text-sm text-arena-500 mb-2">
          Si existe una cuenta asociada a
        </p>
        <p class="text-sm text-arena-900 font-medium mb-4">{{ email }}</p>
        <p class="text-sm text-arena-500 mb-6">
          recibirás un correo con instrucciones para restablecer tu contraseña.
        </p>

        <div class="flex flex-col gap-3">
          <router-link
            to="/login"
            class="inline-flex items-center justify-center gap-1.5 text-sm text-caliente-600 hover:text-caliente-700 font-medium transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver al inicio de sesión
          </router-link>
          <button
            @click="resetForm"
            class="text-sm text-arena-500 hover:text-arena-700 transition-colors"
          >
            Intentar con otro correo
          </button>
        </div>
      </div>

      <!-- Form -->
      <div v-else class="bg-white border border-arena-200 rounded-lg p-8 shadow-sm">
        <h1 class="text-xl font-semibold text-arena-900 mb-1">Restablecer contraseña</h1>
        <p class="text-sm text-arena-500 mb-8">
          Ingresa tu correo corporativo y te enviaremos instrucciones para recuperar el acceso
        </p>

        <!-- Error feedback -->
        <div
          v-if="error"
          class="mb-6 flex items-start gap-3 rounded-md bg-caliente-50 border border-caliente-100 px-4 py-3"
        >
          <svg class="w-5 h-5 text-caliente-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <p class="text-sm text-caliente-700">{{ error }}</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Email -->
          <div>
            <label for="resetEmail" class="block text-sm font-medium text-arena-700 mb-1.5">
              Correo electrónico
            </label>
            <input
              id="resetEmail"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              placeholder="nombre@caliente.mx"
              class="block w-full rounded-md bg-white border border-arena-300 text-arena-900 placeholder-arena-400
                     px-3.5 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-caliente-600/30 focus:border-caliente-600
                     transition-colors duration-150"
            />
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="!canSubmit || isLoading"
            class="w-full flex items-center justify-center gap-2 rounded-md bg-caliente-600 px-4 py-2.5 text-sm font-semibold text-white
                   hover:bg-caliente-700 active:bg-caliente-800
                   focus:outline-none focus:ring-2 focus:ring-caliente-600/50 focus:ring-offset-2 focus:ring-offset-white
                   disabled:opacity-40 disabled:cursor-not-allowed
                   transition-colors duration-150"
          >
            <svg
              v-if="isLoading"
              class="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ isLoading ? 'Enviando...' : 'Enviar instrucciones' }}
          </button>
        </form>

        <!-- Back to login -->
        <div class="mt-6 pt-5 border-t border-arena-200">
          <router-link
            to="/login"
            class="flex items-center justify-center gap-1.5 text-sm text-arena-500 hover:text-arena-700 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver al inicio de sesión
          </router-link>
        </div>
      </div>

      <p class="mt-8 text-center text-xs text-arena-400">
        &copy; {{ new Date().getFullYear() }} Caliente.mx — Todos los derechos reservados
      </p>
    </div>
  </div>
</template>
