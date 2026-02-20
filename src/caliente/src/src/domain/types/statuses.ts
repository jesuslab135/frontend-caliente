/**
 * Estados de solicitud de intercambio de turno.
 * Flujo: PENDING → ACCEPTED_BY_PEER / REJECTED_BY_PEER → APPROVED / REJECTED_BY_ADMIN
 * Cancelable en: PENDING, ACCEPTED_BY_PEER
 */
export type SwapRequestStatus =
    | 'PENDING'
    | 'ACCEPTED_BY_PEER'
    | 'REJECTED_BY_PEER'
    | 'APPROVED'
    | 'REJECTED_BY_ADMIN'
    | 'CANCELLED';

/**
 * Estados de solicitud de vacaciones.
 * Flujo: PENDING → APPROVED / REJECTED
 * Cancelable en: PENDING
 */
export type VacationStatus =
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'CANCELLED';

/**
 * Estados del log de generación automática de horarios.
 */
export type GenerationLogStatus =
    | 'SUCCESS'
    | 'PARTIAL'
    | 'FAILED'
    | 'CANCELLED';

/**
 * Origen de edición de una asignación en el schedule grid.
 */
export type EditSource =
    | 'ALGORITHM'
    | 'GRID_EDIT'
    | 'BULK_IMPORT'
    | 'SWAP'
    | 'MANUAL';
