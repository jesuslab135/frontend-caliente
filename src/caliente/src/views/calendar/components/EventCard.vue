<script setup>
defineProps({
    event: { type: Object, required: true },
    sportColor: { type: String, default: '#3b82f6' },
})
</script>

<template>
    <div class="flex items-center gap-3 px-3 py-2 rounded-md bg-white border border-arena-200 hover:border-arena-300 transition-colors">
        <span
            class="w-1 h-8 rounded-full shrink-0"
            :style="{ backgroundColor: sportColor }"
        ></span>
        <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-arena-900 truncate">
                {{ event.display_name }}
            </p>
            <p class="text-xs text-arena-500">
                {{ event.league }}
            </p>
        </div>
        <div class="text-right shrink-0">
            <p class="text-sm font-semibold text-arena-700 tabular-nums">
                {{ event.time }}
            </p>
            <p class="text-xs text-arena-400">
                P{{ event.priority }}
            </p>
        </div>
    </div>
</template>
