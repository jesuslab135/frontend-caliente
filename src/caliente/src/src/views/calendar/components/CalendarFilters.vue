<script setup>
import { computed } from 'vue'

const props = defineProps({
    sports: { type: Array, default: () => [] },
    leagues: { type: Array, default: () => [] },
    activeSport: { type: String, default: null },
    activeLeague: { type: String, default: null },
    totalVisible: { type: Number, default: 0 },
    sportColorFn: { type: Function, required: true },
})

const emit = defineEmits(['update:activeSport', 'update:activeLeague'])

const filteredLeagues = computed(() => {
    if (!props.activeSport) return props.leagues
    return props.leagues.filter(l => l.sport === props.activeSport)
})

function toggleSport(sport) {
    if (props.activeSport === sport) {
        emit('update:activeSport', null)
    } else {
        emit('update:activeSport', sport)
        emit('update:activeLeague', null)
    }
}

function toggleLeague(league) {
    if (props.activeLeague === league) {
        emit('update:activeLeague', null)
    } else {
        emit('update:activeLeague', league)
    }
}
</script>

<template>
    <div class="bg-white rounded-lg border border-arena-200 p-4 space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-arena-900">Filtros</h3>
            <span class="text-xs text-arena-400 tabular-nums">{{ totalVisible }} visibles</span>
        </div>

        <!-- Sports -->
        <div>
            <p class="text-xs font-medium text-arena-500 mb-2">Deportes</p>
            <div class="flex flex-wrap gap-1.5">
                <button
                    v-for="sport in sports"
                    :key="sport"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                    :class="activeSport === sport
                        ? 'bg-arena-900 text-white border-arena-900'
                        : 'bg-white text-arena-700 border-arena-200 hover:border-arena-300'"
                    @click="toggleSport(sport)"
                >
                    <span
                        class="w-2 h-2 rounded-full"
                        :style="{ backgroundColor: sportColorFn(sport) }"
                    ></span>
                    {{ sport }}
                </button>
            </div>
        </div>

        <!-- Leagues -->
        <div v-if="filteredLeagues.length > 0">
            <p class="text-xs font-medium text-arena-500 mb-2">Ligas</p>
            <div class="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                <button
                    v-for="league in filteredLeagues"
                    :key="league.name"
                    class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                    :class="activeLeague === league.name
                        ? 'bg-arena-900 text-white border-arena-900'
                        : 'bg-white text-arena-600 border-arena-200 hover:border-arena-300'"
                    @click="toggleLeague(league.name)"
                >
                    {{ league.name }}
                </button>
            </div>
        </div>
    </div>
</template>
