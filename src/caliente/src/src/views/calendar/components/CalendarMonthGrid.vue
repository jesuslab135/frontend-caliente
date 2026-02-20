<script setup>
import SportBadge from './SportBadge.vue'

const props = defineProps({
    days: { type: Array, required: true },
    getDayEvents: { type: Function, required: true },
    sportColorFn: { type: Function, required: true },
    isLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['dayClick'])

const weekDayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
</script>

<template>
    <div class="bg-white rounded-lg border border-arena-200 overflow-hidden">
        <!-- Week day headers -->
        <div class="grid grid-cols-7 border-b border-arena-200">
            <div
                v-for="label in weekDayLabels"
                :key="label"
                class="px-2 py-2 text-center text-xs font-semibold text-arena-500 uppercase tracking-wider"
            >
                {{ label }}
            </div>
        </div>

        <!-- Calendar grid -->
        <div class="grid grid-cols-7">
            <div
                v-for="(day, index) in days"
                :key="day.date"
                class="min-h-[100px] border-b border-r border-arena-100 p-1.5 cursor-pointer transition-colors hover:bg-arena-50"
                :class="{
                    'bg-arena-50/50': !day.isCurrentMonth,
                    'bg-caliente-50/30': day.isToday,
                    'bg-white': day.isCurrentMonth && !day.isToday,
                }"
                @click="emit('dayClick', day.date)"
            >
                <!-- Day number -->
                <div class="flex items-center justify-end mb-1">
                    <span
                        class="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full"
                        :class="{
                            'text-arena-300': !day.isCurrentMonth,
                            'bg-caliente-600 text-white': day.isToday,
                            'text-arena-700': day.isCurrentMonth && !day.isToday && !day.isWeekend,
                            'text-caliente-400': day.isCurrentMonth && day.isWeekend && !day.isToday,
                        }"
                    >
                        {{ day.dayNumber }}
                    </span>
                </div>

                <!-- Sport badges -->
                <div class="space-y-0.5">
                    <SportBadge
                        v-for="sportSummary in getDayEvents(day.date).slice(0, 3)"
                        :key="sportSummary.sport"
                        :sport="sportSummary.sport"
                        :count="sportSummary.count"
                        :color="sportColorFn(sportSummary.sport)"
                    />
                    <span
                        v-if="getDayEvents(day.date).length > 3"
                        class="block text-[10px] text-arena-400 pl-1"
                    >
                        +{{ getDayEvents(day.date).length - 3 }} deportes
                    </span>
                </div>
            </div>
        </div>

        <!-- Loading overlay -->
        <div
            v-if="isLoading"
            class="absolute inset-0 bg-white/60 flex items-center justify-center"
        >
            <div class="w-6 h-6 border-2 border-caliente-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    </div>
</template>
