import type { SwapRequestStatus } from '../types';

/** Contrato del modelo de dominio SwapRequest */
export interface ISwapRequest {
    readonly uuid: string;
    requesterUuid: string;
    requesterName: string;
    requesterScheduleUuid: string;
    requesterScheduleDate: string;
    targetEmployeeUuid: string;
    targetEmployeeName: string;
    targetScheduleUuid: string;
    targetScheduleDate: string;
    status: SwapRequestStatus;
    reason: string;
    peerResponseAt: string | null;
    peerResponseNote: string;
    adminResponseAt: string | null;
    adminResponderName: string | null;
    adminResponseNote: string;
    readonly createdAt: string;
}
