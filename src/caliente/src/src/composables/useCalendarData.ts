import { ref, watch, type Ref } from 'vue'
import { httpClient } from '@/di/http'
import { SportEventRepository } from '@/domain/repositories/SportEventRepository'
import { LeagueRepository } from '@/domain/repositories/LeagueRepository'
import type { CalendarMonthResponse, CalendarDayResponse, CalendarMonthSportSummary } from '@/domain/dtos/SportEventDTO'

const SPORT_COLORS: Record<string, string> = {
    'Football': '#3b82f6',
    'Basketball': '#22c55e',
    'Tennis': '#14b8a6',
    'Baseball': '#ef4444',
    'Ice Hockey': '#8b5cf6',
    'American Football': '#f97316',
}

const FALLBACK_COLORS = ['#6366f1', '#ec4899', '#84cc16', '#06b6d4', '#f59e0b', '#10b981']

export function useCalendarData(
    year: Ref<number>,
    month: Ref<number>,
) {
    const sportEventRepo = new SportEventRepository(httpClient)
    const leagueRepo = new LeagueRepository(httpClient)

    const monthData = ref<CalendarMonthResponse>({})
    const dayData = ref<CalendarDayResponse>({})
    const availableSports = ref<string[]>([])
    const availableLeagues = ref<Array<{ name: string; sport: string }>>([])
    const isLoadingMonth = ref(false)
    const isLoadingDay = ref(false)

    const sportFilter = ref<string | null>(null)
    const leagueFilter = ref<string | null>(null)

    const sportColorMap = ref<Record<string, string>>({})

    function getSportColor(sport: string): string {
        if (!sportColorMap.value[sport]) {
            const color = SPORT_COLORS[sport]
                ?? FALLBACK_COLORS[Object.keys(sportColorMap.value).length % FALLBACK_COLORS.length]
            sportColorMap.value[sport] = color
        }
        return sportColorMap.value[sport]
    }

    async function fetchMonthData() {
        isLoadingMonth.value = true
        try {
            const filters: Record<string, string> = {}
            if (sportFilter.value) filters.sport = sportFilter.value
            if (leagueFilter.value) filters.league = leagueFilter.value
            monthData.value = await sportEventRepo.getCalendarMonth(year.value, month.value, filters)
        } catch (e) {
            console.error('Error loading calendar month:', e)
            monthData.value = {}
        } finally {
            isLoadingMonth.value = false
        }
    }

    async function fetchDayData(date: string) {
        isLoadingDay.value = true
        try {
            const filters: Record<string, string> = {}
            if (sportFilter.value) filters.sport = sportFilter.value
            if (leagueFilter.value) filters.league = leagueFilter.value
            dayData.value = await sportEventRepo.getCalendarDay(date, filters)
        } catch (e) {
            console.error('Error loading calendar day:', e)
            dayData.value = {}
        } finally {
            isLoadingDay.value = false
        }
    }

    async function fetchFilters() {
        try {
            const [sports, leagues] = await Promise.all([
                sportEventRepo.getAvailableSports(),
                leagueRepo.getAll(),
            ])
            availableSports.value = sports.filter(s => s)
            availableLeagues.value = leagues
                .filter(l => l.sport)
                .map(l => ({ name: l.name, sport: l.sport }))
        } catch (e) {
            console.error('Error loading filters:', e)
        }
    }

    function getDayEvents(dateKey: string): CalendarMonthSportSummary[] {
        return monthData.value[dateKey] ?? []
    }

    function getTotalEventsForDay(dateKey: string): number {
        return getDayEvents(dateKey).reduce((sum, s) => sum + s.count, 0)
    }

    watch([year, month, sportFilter, leagueFilter], () => {
        fetchMonthData()
    })

    return {
        monthData,
        dayData,
        availableSports,
        availableLeagues,
        isLoadingMonth,
        isLoadingDay,
        sportFilter,
        leagueFilter,
        sportColorMap,
        getSportColor,
        fetchMonthData,
        fetchDayData,
        fetchFilters,
        getDayEvents,
        getTotalEventsForDay,
    }
}
