<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { httpClient } from '@/di/http'
import { SportEventRepository } from '@/domain/repositories/SportEventRepository'
import { useCalendarNavigation } from '@/composables/useCalendarNavigation'
import { useCalendarData } from '@/composables/useCalendarData'
import CalendarMonthGrid from './components/CalendarMonthGrid.vue'
import CalendarDayTimeline from './components/CalendarDayTimeline.vue'
import CalendarFilters from './components/CalendarFilters.vue'

const authStore = useAuthStore()
const canEdit = computed(() => !!authStore.user)

const sportEventRepo = new SportEventRepository(httpClient)

const { currentYear, currentMonth, currentMonthLabel, calendarDays, navigateMonth, goToToday } = useCalendarNavigation()

const {
    isLoadingMonth,
    isLoadingDay,
    dayData,
    availableSports,
    availableLeagues,
    sportFilter,
    leagueFilter,
    getSportColor,
    fetchMonthData,
    fetchDayData,
    fetchFilters,
    getDayEvents,
    getTotalEventsForDay,
} = useCalendarData(currentYear, currentMonth)

const activeView = ref('month')
const selectedDate = ref('')

// ── Import state ────────────────────────────────────
const fileInputRef = ref(null)
const importLoading = ref(false)
const importMessage = ref(null)
const importIsError = ref(false)
const importErrors = ref([])

// ── Scraper state ───────────────────────────────────
const scrapeLoading = ref(false)

function triggerImport() {
    fileInputRef.value?.click()
}

async function handleFileImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    importLoading.value = true
    importMessage.value = null
    importIsError.value = false
    importErrors.value = []

    try {
        const formData = new FormData()
        formData.append('file', file)
        const result = await sportEventRepo.importFile(formData)
        importMessage.value = `${result.imported} eventos importados correctamente.`
        importIsError.value = false
        importErrors.value = result.errors || []
        await refreshData()
    } catch (err) {
        importIsError.value = true
        if (err?.response?.data) {
            const d = err.response.data
            importMessage.value = d.detail || 'Error al importar el archivo.'
            importErrors.value = d.errors || []
        } else {
            importMessage.value = 'Error de red al importar.'
        }
    } finally {
        importLoading.value = false
        e.target.value = ''
    }
}

async function handleScrape() {
    scrapeLoading.value = true
    importMessage.value = null
    importIsError.value = false
    importErrors.value = []

    try {
        const result = await sportEventRepo.scrapeFlashscore()
        const skipped = result.skipped || 0
        const parts = [`${result.imported} nuevos importados`]
        if (skipped > 0) parts.push(`${skipped} duplicados omitidos`)
        importMessage.value = `Scraping completado: ${parts.join(', ')}.`
        importIsError.value = false
        importErrors.value = result.errors || []
        await refreshData()
    } catch (err) {
        importIsError.value = true
        if (err?.response?.data) {
            const d = err.response.data
            importMessage.value = d.detail || d.errors?.[0] || 'Error al ejecutar el scraper.'
            importErrors.value = d.errors || []
        } else {
            importMessage.value = 'Error de red al ejecutar el scraper.'
        }
    } finally {
        scrapeLoading.value = false
    }
}

function dismissImportMessage() {
    importMessage.value = null
    importErrors.value = []
}

function handleDayClick(dateStr) {
    selectedDate.value = dateStr
    activeView.value = 'day'
    fetchDayData(dateStr)
}

function handleBackToMonth() {
    activeView.value = 'month'
}

const totalVisible = ref(0)

async function loadInitialData() {
    await Promise.all([fetchMonthData(), fetchFilters()])
    updateTotalVisible()
}

async function refreshData() {
    await Promise.all([fetchMonthData(), fetchFilters()])
    updateTotalVisible()
}

function updateTotalVisible() {
    let total = 0
    for (const day of calendarDays.value) {
        total += getTotalEventsForDay(day.date)
    }
    totalVisible.value = total
}

onMounted(loadInitialData)
</script>

<template>
    <div class="space-y-4">
        <!-- Page header -->
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-xl font-bold text-arena-900">Calendario Deportivo</h1>
                <p class="text-sm text-arena-500">Eventos deportivos por deporte, liga y horario</p>
            </div>
            <div v-if="canEdit" class="flex items-center gap-2">
                <!-- Hidden file input -->
                <input
                    ref="fileInputRef"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    class="hidden"
                    @change="handleFileImport"
                />
                <!-- Scrape button -->
                <button
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-arena-200 text-arena-700 bg-white hover:bg-arena-50 transition-colors disabled:opacity-50"
                    :disabled="scrapeLoading"
                    @click="handleScrape"
                >
                    <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': scrapeLoading }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path v-if="!scrapeLoading" stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                        <path v-else stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                    </svg>
                    {{ scrapeLoading ? 'Scraping...' : 'Flashscore Auto' }}
                </button>
                <!-- Import button -->
                <button
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-arena-200 text-arena-700 bg-white hover:bg-arena-50 transition-colors disabled:opacity-50"
                    :disabled="importLoading"
                    @click="triggerImport"
                >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    {{ importLoading ? 'Importando...' : 'Importar Excel' }}
                </button>
            </div>
        </div>

        <!-- Import message banner -->
        <div
            v-if="importMessage"
            class="flex items-start gap-3 px-4 py-3 rounded-lg border text-sm"
            :class="importIsError
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'"
        >
            <svg v-if="importIsError" class="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <svg v-else class="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div class="flex-1">
                <p>{{ importMessage }}</p>
                <ul v-if="importErrors.length" class="mt-1 space-y-0.5 text-xs opacity-80">
                    <li v-for="(err, i) in importErrors" :key="i">{{ err }}</li>
                </ul>
            </div>
            <button class="shrink-0 p-0.5 hover:opacity-70" @click="dismissImportMessage">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <div class="flex gap-4">
            <!-- Main content -->
            <div class="flex-1 min-w-0">
                <!-- Navigation bar -->
                <div
                    v-if="activeView === 'month'"
                    class="flex items-center justify-between mb-4"
                >
                    <div class="flex items-center gap-2">
                        <button
                            class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                            :class="activeView === 'month'
                                ? 'bg-caliente-600 text-white'
                                : 'bg-white text-arena-600 border border-arena-200 hover:bg-arena-50'"
                        >
                            Mes
                        </button>
                    </div>

                    <div class="flex items-center gap-2">
                        <button
                            class="p-1.5 rounded-md border border-arena-200 text-arena-500 hover:bg-arena-50 transition-colors"
                            @click="navigateMonth(-1)"
                        >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            class="px-3 py-1.5 text-sm font-medium text-arena-700 bg-white border border-arena-200 rounded-md hover:bg-arena-50 transition-colors"
                            @click="goToToday"
                        >
                            Hoy
                        </button>
                        <button
                            class="p-1.5 rounded-md border border-arena-200 text-arena-500 hover:bg-arena-50 transition-colors"
                            @click="navigateMonth(1)"
                        >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <p class="text-sm font-semibold text-arena-900 capitalize min-w-[160px] text-right">
                        {{ currentMonthLabel }}
                    </p>
                </div>

                <!-- Month view -->
                <CalendarMonthGrid
                    v-if="activeView === 'month'"
                    :days="calendarDays"
                    :get-day-events="getDayEvents"
                    :sport-color-fn="getSportColor"
                    :is-loading="isLoadingMonth"
                    @day-click="handleDayClick"
                />

                <!-- Day view -->
                <CalendarDayTimeline
                    v-if="activeView === 'day'"
                    :date="selectedDate"
                    :day-data="dayData"
                    :sport-color-fn="getSportColor"
                    :is-loading="isLoadingDay"
                    @back="handleBackToMonth"
                />
            </div>

            <!-- Sidebar filters -->
            <div class="w-64 shrink-0">
                <CalendarFilters
                    :sports="availableSports"
                    :leagues="availableLeagues"
                    :active-sport="sportFilter"
                    :active-league="leagueFilter"
                    :total-visible="totalVisible"
                    :sport-color-fn="getSportColor"
                    @update:active-sport="sportFilter = $event; updateTotalVisible()"
                    @update:active-league="leagueFilter = $event; updateTotalVisible()"
                />
            </div>
        </div>
    </div>
</template>
