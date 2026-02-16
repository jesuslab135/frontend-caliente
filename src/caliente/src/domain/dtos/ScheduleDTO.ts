import type { EditSource } from '../types';

/**
 * Re-export del tipo canónico para backward compatibility.
 * Fuente de verdad: types/statuses.ts
 */
export type EditSourceDTO = EditSource;

/** GET /schedules/ — cada celda en la grilla de horarios */
export interface ScheduleDTO {
    id: number;
    uuid: string;
    employee: number;
    shift_type: number;
    date: string;
    start_datetime: string | null;
    end_datetime: string | null;
    title: string;
    description: string;
    edit_source: EditSource;
    edit_history: unknown[];
    last_edited_by: number | null;
    last_edited_at: string | null;
    created_by: number | null;
    created_at: string;
    updated_at: string;
}

/** Payload para crear/actualizar una asignación de turno */
export interface ScheduleWriteDTO {
    employee: number;
    shift_type: number;
    date: string;
    title?: string;
    description?: string;
    edit_source?: EditSource;
}

/** Query params para filtrar schedules */
export interface ScheduleFilterParams {
    date_from?: string;
    date_to?: string;
    employee?: number;
    team?: number;
    shift_type?: number;
}
