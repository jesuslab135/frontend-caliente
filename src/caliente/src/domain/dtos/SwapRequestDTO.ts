import type { SwapRequestStatus } from '../types';

/**
 * Re-export del tipo canónico para backward compatibility.
 * Fuente de verdad: types/statuses.ts
 */
export type SwapStatusDTO = SwapRequestStatus;

/** Resumen de empleado anidado en respuestas de swap requests */
export interface SwapEmployeeSummaryDTO {
    id: number;
    uuid: string;
    employee_id: string;
    user: {
        first_name: string;
        last_name: string;
        email: string;
    };
}

/** Resumen de schedule anidado en respuestas de swap requests */
export interface SwapScheduleSummaryDTO {
    id: number;
    uuid: string;
    date: string;
    shift_type: number;
}

/** GET /swaprequests/ */
export interface SwapRequestDTO {
    id: number;
    uuid: string;
    requester: SwapEmployeeSummaryDTO | number;
    target_employee: SwapEmployeeSummaryDTO | number;
    requester_schedule: SwapScheduleSummaryDTO | number;
    target_schedule: SwapScheduleSummaryDTO | number;
    status: SwapRequestStatus;
    reason: string;
    peer_response_at: string | null;
    peer_response_note: string;
    admin_response_at: string | null;
    admin_responder: number | null;
    admin_response_note: string;
    created_at: string;
    updated_at: string;
}

/** Payload para crear una solicitud de intercambio */
export interface SwapRequestWriteDTO {
    target_employee: number;
    requester_schedule: number;
    target_schedule: number;
    reason?: string;
}
