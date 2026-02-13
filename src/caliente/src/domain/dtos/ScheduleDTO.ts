export type EditSourceDTO = 'ALGORITHM' | 'GRID_EDIT' | 'BULK_IMPORT' | 'SWAP' | 'MANUAL';

/** GET /schedules/ — each cell in the schedule grid */
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
    edit_source: EditSourceDTO;
    edit_history: any[];
    last_edited_by: number | null;
    last_edited_at: string | null;
    created_by: number | null;
    created_at: string;
    updated_at: string;
}

/** Payload for creating/updating a schedule entry */
export interface ScheduleWriteDTO {
    employee: number;
    shift_type: number;
    date: string;
    title?: string;
    description?: string;
    edit_source?: EditSourceDTO;
}

/** Query params for filtering schedules */
export interface ScheduleFilterParams {
    date_from?: string;
    date_to?: string;
    employee?: number;
    team?: number;
    shift_type?: number;
}
