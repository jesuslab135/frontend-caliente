import type { VacationStatus } from '../types';

/**
 * Re-export del tipo canónico para backward compatibility.
 * Fuente de verdad: types/statuses.ts
 */
export type VacationStatusDTO = VacationStatus;

/** Resumen de empleado anidado en respuestas de vacaciones */
export interface VacationEmployeeSummaryDTO {
    id: number;
    uuid: string;
    employee_id: string;
    user: {
        first_name: string;
        last_name: string;
        email: string;
    };
}

/** GET /vacations/ */
export interface VacationDTO {
    id: number;
    uuid: string;
    employee: VacationEmployeeSummaryDTO | number;
    start_date: string;
    end_date: string;
    reason: string;
    status: VacationStatus;
    approved_by: number | null;
    approved_at: string | null;
    rejection_reason: string;
    total_days: number;
    created_at: string;
    updated_at: string;
}

/** Payload para crear una solicitud de vacaciones */
export interface VacationWriteDTO {
    start_date: string;
    end_date: string;
    reason?: string;
}
