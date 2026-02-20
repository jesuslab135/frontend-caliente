/**
 * useGridSummary — Reactive computation of daily shift totals for the schedule grid.
 *
 * Produces rows matching the Excel reference layout:
 *   [Individual Shifts] → [OFF] → [Category Blocks] → [Grand Total]
 *
 * Each row contains one count per visible day (7 for weekly view).
 * Alert levels drive conditional formatting (red/yellow/ok).
 */
import { computed, type Ref, type ComputedRef } from 'vue'

// ── Types ──────────────────────────────────────────────────────
export type CellAlert = 'danger' | 'warning' | 'low' | 'ok'

export interface SummaryRow {
    key: string
    label: string
    type: 'shift' | 'off' | 'category' | 'total'
    categoryCode?: string
    counts: number[]
    minRequired?: number
}

// ── Composable ─────────────────────────────────────────────────
export function useGridSummary(
    gridEmployees: ComputedRef<any[]>,
    scheduleMap: Ref<Record<string, Record<string, string>>>,
    weekDays: ComputedRef<any[]>,
    apiShiftTypes: Ref<any[]>,
    shiftCategories: Ref<any[]>,
) {
    // Map shift code → category code
    const shiftToCat = computed<Record<string, string>>(() => {
        const map: Record<string, string> = {}
        apiShiftTypes.value.forEach((st: any) => {
            if (st.categoryCode) map[st.code] = st.categoryCode
        })
        return map
    })

    // Active working shifts sorted by category order then code
    const trackedShifts = computed(() => {
        const catOrder = ['AM', 'INS', 'MID', 'NS', 'HO']
        return apiShiftTypes.value
            .filter((st: any) => st.isActive && st.isWorkingShift)
            .sort((a: any, b: any) => {
                const ai = catOrder.indexOf(a.categoryCode || '')
                const bi = catOrder.indexOf(b.categoryCode || '')
                const aOrd = ai === -1 ? 99 : ai
                const bOrd = bi === -1 ? 99 : bi
                if (aOrd !== bOrd) return aOrd - bOrd
                return a.code.localeCompare(b.code)
            })
    })

    // Categories excluding STATUS (non-operational)
    const trackedCategories = computed(() => {
        return shiftCategories.value
            .filter((c: any) => c.code !== 'STATUS')
            .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
    })

    // Core: per-day aggregation
    const dailyCounts = computed(() => {
        return weekDays.value.map((day: any) => {
            const shifts: Record<string, number> = {}
            let off = 0
            let total = 0

            gridEmployees.value.forEach((emp: any) => {
                const code = scheduleMap.value[emp.uuid]?.[day.dateStr]
                if (!code) return
                shifts[code] = (shifts[code] || 0) + 1
                if (code === 'OFF') off++
                total++
            })

            const categories: Record<string, number> = {}
            trackedCategories.value.forEach((cat: any) => { categories[cat.code] = 0 })
            Object.entries(shifts).forEach(([code, count]) => {
                const cat = shiftToCat.value[code]
                if (cat && categories[cat] !== undefined) categories[cat] += count
            })

            return { shifts, categories, off, total }
        })
    })

    // Flat row list for rendering
    const summaryRows = computed<SummaryRow[]>(() => {
        const rows: SummaryRow[] = []

        // 1. Individual working shifts
        trackedShifts.value.forEach((st: any) => {
            rows.push({
                key: `shift-${st.code}`,
                label: st.code,
                type: 'shift',
                categoryCode: st.categoryCode || undefined,
                counts: dailyCounts.value.map(d => d.shifts[st.code] || 0),
            })
        })

        // 2. OFF
        rows.push({
            key: 'off',
            label: 'OFF',
            type: 'off',
            counts: dailyCounts.value.map(d => d.off),
        })

        // 3. Category blocks
        trackedCategories.value.forEach((cat: any) => {
            rows.push({
                key: `cat-${cat.code}`,
                label: cat.code,
                type: 'category',
                counts: dailyCounts.value.map(d => d.categories[cat.code] || 0),
                minRequired: cat.minTraders,
            })
        })

        // 4. Grand total
        rows.push({
            key: 'total',
            label: 'TOTAL',
            type: 'total',
            counts: dailyCounts.value.map(d => d.total),
        })

        return rows
    })

    // Determine alert level for conditional formatting
    function getCellAlert(row: SummaryRow, count: number): CellAlert {
        if (row.type === 'category' && (row.minRequired ?? 0) > 0) {
            if (count === 0) return 'danger'
            if (count < (row.minRequired ?? 0)) return 'warning'
        }
        if (row.type === 'shift' && count === 0) return 'low'
        return 'ok'
    }

    // Index where individual shifts end and OFF begins
    const shiftRowCount = computed(() => trackedShifts.value.length)

    return {
        summaryRows,
        dailyCounts,
        trackedShifts,
        trackedCategories,
        getCellAlert,
        shiftRowCount,
    }
}
