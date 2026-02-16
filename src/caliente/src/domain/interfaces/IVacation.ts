import type { VacationStatus } from '../types';

/** Contrato del modelo de dominio Vacation */
export interface IVacation {
    readonly uuid: string;
    employeeUuid: string;
    employeeName: string;
    startDate: string;
    endDate: string;
    status: VacationStatus;
    reason: string;
    approvedBy: string | null;
    approvedAt: string | null;
    rejectionReason: string;
    readonly totalDays: number;
    readonly createdAt: string;
}
