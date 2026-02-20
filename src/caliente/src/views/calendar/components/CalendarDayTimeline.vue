<script setup>
import { ref, computed } from 'vue'
import EventCard from './EventCard.vue'

const props = defineProps({
    date: { type: String, required: true },
    dayData: { type: Object, default: () => ({}) },
    sportColorFn: { type: Function, required: true },
    isLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['back'])

const expandedHours = ref(new Set())

const hours = computed(() => {
    const result = []
    for (let h = 0; h < 24; h++) {
        const key = String(h).padStart(2, '0')
        const events = props.dayData[key] ?? []
        result.push({ key, label: `${key}:00`, events, hasEvents: events.length > 0 })
    }
    return result
})

const dateLabel = computed(() => {
    const d = new Date(props.date + 'T00:00:00')
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
})

const totalEvents = computed(() => {
    return hours.value.reduce((sum, h) => sum + h.events.length, 0)
})

function toggleHour(hourKey) {
    if (expandedHours.value.has(hourKey)) {
        expandedHours.value.delete(hourKey)
    } else {
        expandedHours.value.add(hourKey)
    }
    expandedHours.value = new Set(expandedHours.value)
}

function groupByLeague(events) {
    const groups = {}
    for (const event of events) {
        const key = event.league
        if (!groups[key]) groups[key] = { league: key, sport: event.sport, events: [] }
        groups[key].events.push(event)
    }
    return Object.values(groups)
}
</script>

<template>
    <div class="space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <button
                    class="p-1.5 rounded-md border border-arena-200 text-arena-500 hover:bg-arena-50 transition-colors"
                    @click="emit('back')"
                >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h2 class="text-lg font-semibold text-arena-900 capitalize">{{ dateLabel }}</h2>
                    <p class="text-xs text-arena-500">{{ totalEvents }} eventos</p>
                </div>
            </div>
        </div>

        <!-- Timeline -->
        <div class="bg-white rounded-lg border border-arena-200 overflow-hidden">
            <div v-for="hour in hours" :key="hour.key">
                <div
                    class="flex items-center border-b border-arena-100 transition-colors"
                    :class="hour.hasEvents
                        ? 'cursor-pointer hover:bg-arena-50'
                        : 'opacity-40'"
                    @click="hour.hasEvents && toggleHour(hour.key)"
                >
                    <!-- Hour label -->
                    <div class="w-16 shrink-0 px-3 py-2.5 text-xs font-mono font-medium text-arena-500 border-r border-arena-100">
                        {{ hour.label }}
                    </div>

                    <!-- Activity bar -->
                    <div class="flex-1 px-3 py-2.5 flex items-center gap-2">
                        <div v-if="hour.hasEvents" class="flex-1">
                            <div
                                class="h-2 rounded-full"
                                :style="{
                                    width: Math.min(100, hour.events.length * 15) + '%',
                                    background: `linear-gradient(90deg, ${hour.events.map(e => sportColorFn(e.sport)).filter((v, i, a) => a.indexOf(v) === i).join(', ')})`
                                }"
                            ></div>
                        </div>
                        <span v-if="hour.hasEvents" class="text-xs font-medium text-arena-600 tabular-nums shrink-0">
                            {{ hour.events.length }}
                        </span>
                        <!-- Expand arrow -->
                        <svg
                            v-if="hour.hasEvents"
                            class="w-4 h-4 text-arena-400 transition-transform shrink-0"
                            :class="{ 'rotate-180': expandedHours.has(hour.key) }"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                        >
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                <!-- Expanded events grouped by league -->
                <div
                    v-if="expandedHours.has(hour.key)"
                    class="bg-arena-50 border-b border-arena-200 px-4 py-3 space-y-3"
                >
                    <div
                        v-for="group in groupByLeague(hour.events)"
                        :key="group.league"
                    >
                        <p class="text-xs font-semibold text-arena-600 mb-1.5 flex items-center gap-1.5">
                            <span
                                class="w-2 h-2 rounded-full"
                                :style="{ backgroundColor: sportColorFn(group.sport) }"
                            ></span>
                            {{ group.league }} ({{ group.sport }})
                        </p>
                        <div class="space-y-1">
                            <EventCard
                                v-for="event in group.events"
                                :key="event.uuid"
                                :event="event"
                                :sport-color="sportColorFn(event.sport)"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
