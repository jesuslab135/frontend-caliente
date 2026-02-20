<script setup>
defineProps({
    sport: { type: String, required: true },
    count: { type: Number, required: true },
    color: { type: String, default: '#3b82f6' },
})
</script>

<template>
    <div
        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-white border border-arena-200 whitespace-nowrap"
    >
        <span
            class="w-2 h-2 rounded-full shrink-0"
            :style="{ backgroundColor: color }"
        ></span>
        <span class="text-arena-700 truncate max-w-[80px]">{{ sport }}</span>
        <span class="text-arena-500 font-semibold tabular-nums">{{ count }}</span>
    </div>
</template>
