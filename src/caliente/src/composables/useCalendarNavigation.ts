import { ref, computed } from 'vue'

export function useCalendarNavigation() {
    const currentDate = ref(new Date())

    const currentYear = computed(() => currentDate.value.getFullYear())
    const currentMonth = computed(() => currentDate.value.getMonth() + 1)
    const currentMonthLabel = computed(() => {
        return currentDate.value.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    })

    function navigateMonth(direction: 1 | -1) {
        const d = new Date(currentDate.value)
        d.setMonth(d.getMonth() + direction)
        currentDate.value = d
    }

    function goToToday() {
        currentDate.value = new Date()
    }

    const calendarDays = computed(() => {
        const year = currentYear.value
        const month = currentMonth.value - 1

        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)

        let startOffset = firstDay.getDay() - 1
        if (startOffset < 0) startOffset = 6

        const days: Array<{
            date: string
            dayNumber: number
            isCurrentMonth: boolean
            isToday: boolean
            isWeekend: boolean
        }> = []

        const prevMonthEnd = new Date(year, month, 0)
        for (let i = startOffset - 1; i >= 0; i--) {
            const d = new Date(prevMonthEnd)
            d.setDate(prevMonthEnd.getDate() - i)
            days.push(buildDay(d, false))
        }

        for (let day = 1; day <= lastDay.getDate(); day++) {
            days.push(buildDay(new Date(year, month, day), true))
        }

        const targetLength = days.length > 35 ? 42 : 35
        let nextDay = 1
        while (days.length < targetLength) {
            days.push(buildDay(new Date(year, month + 1, nextDay++), false))
        }

        return days
    })

    function buildDay(d: Date, isCurrentMonth: boolean) {
        const today = new Date()
        const dayOfWeek = d.getDay()
        return {
            date: formatDate(d),
            dayNumber: d.getDate(),
            isCurrentMonth,
            isToday:
                d.getDate() === today.getDate() &&
                d.getMonth() === today.getMonth() &&
                d.getFullYear() === today.getFullYear(),
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        }
    }

    function formatDate(d: Date): string {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
    }

    return {
        currentDate,
        currentYear,
        currentMonth,
        currentMonthLabel,
        calendarDays,
        navigateMonth,
        goToToday,
    }
}
