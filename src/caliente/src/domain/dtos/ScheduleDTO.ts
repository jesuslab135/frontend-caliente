export type EditSourceDTO = 'ALGORITHM' | 'GRID_EDIT' | 'BULK_IMPORT' | 'SWAP' | 'MANUAL';

/** GET /schedules/ — each cell in the schedule grid */
export interface ScheduleDTO {
    uuid: string;
    employee_uuid: string;
    shift_type_code: string;
    date: string;
    start_datetime: string | null;
    end_datetime: string | null;
    title: string;
    description: string;
    edit_source: EditSourceDTO;
    last_edited_by: number | null;
    last_edited_at: string | null;
    created_at: string;
    updated_at: string;
}

/** Payload for creating/updating a schedule entry */
export interface ScheduleWriteDTO {
    employee_uuid: string;
    shift_type_code: string;
    date: string;
    title?: string;
    description?: string;
    edit_source?: EditSourceDTO;
}

/** Payload for the quick grid-edit (shift cycling) */
export interface ScheduleGridEditDTO {
    employee_uuid: string;
    date: string;
    new_shift_type_code: string;
}

/** Query params for filtering schedules */
export interface ScheduleFilterParams {
    date_from?: string;
    date_to?: string;
    employee_uuid?: string;
    team_uuid?: string;
    shift_type_code?: string;
}
