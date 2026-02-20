<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const canSubmit = computed(() => email.value.trim() && password.value)

async function handleLogin() {
  const success = await authStore.login({
    email: email.value.trim(),
    password: password.value,
  })
  if (success) {
    router.push('/dashboard')
  }
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
        <!-- Pulse line -->
        <div class="mx-auto w-16 h-[2px] bg-caliente-600 rounded-full"></div>
        <p class="mt-4 text-sm text-arena-400 tracking-wide uppercase">Enterprise Scheduler System</p>
      </div>

      <!-- Form Card -->
      <div class="bg-white border border-arena-200 rounded-lg p-8 shadow-sm">
        <h1 class="text-xl font-semibold text-arena-900 mb-1">Iniciar Sesión</h1>
        <p class="text-sm text-arena-500 mb-8">Ingresa tus credenciales corporativas</p>

        <!-- Error feedback -->
        <div
          v-if="authStore.error"
          class="mb-6 flex items-start gap-3 rounded-md bg-caliente-50 border border-caliente-100 px-4 py-3"
        >
          <svg class="w-5 h-5 text-caliente-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <p class="text-sm text-caliente-700">{{ authStore.error }}</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-arena-700 mb-1.5">
              Correo electrónico
            </label>
            <input
              id="email"
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

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-arena-700 mb-1.5">
              Contraseña
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                placeholder="••••••••"
                class="block w-full rounded-md bg-white border border-arena-300 text-arena-900 placeholder-arena-400
                       px-3.5 py-2.5 pr-10 text-sm
                       focus:outline-none focus:ring-2 focus:ring-caliente-600/30 focus:border-caliente-600
                       transition-colors duration-150"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-arena-400 hover:text-arena-600 transition-colors"
              >
                <svg v-if="!showPassword" class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                <svg v-else class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Forgot password link -->
          <div class="flex justify-end">
            <router-link
              to="/forgot-password"
              class="text-sm text-caliente-600 hover:text-caliente-700 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </router-link>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="!canSubmit || authStore.isLoading"
            class="w-full flex items-center justify-center gap-2 rounded-md bg-caliente-600 px-4 py-2.5 text-sm font-semibold text-white
                   hover:bg-caliente-700 active:bg-caliente-800
                   focus:outline-none focus:ring-2 focus:ring-caliente-600/50 focus:ring-offset-2 focus:ring-offset-white
                   disabled:opacity-40 disabled:cursor-not-allowed
                   transition-colors duration-150"
          >
            <svg
              v-if="authStore.isLoading"
              class="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ authStore.isLoading ? 'Verificando...' : 'Iniciar Sesión' }}
          </button>
        </form>
      </div>

      <!-- Footer -->
      <p class="mt-8 text-center text-xs text-arena-400">
        &copy; {{ new Date().getFullYear() }} Caliente.mx — Todos los derechos reservados
      </p>
    </div>
  </div>
</template>
