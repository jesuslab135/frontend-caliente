import type { EditSource } from '../types';

/** Entrada individual del historial de ediciones de un schedule */
export interface IScheduleEditHistoryEntry {
    readonly timestamp: string;
    readonly userId: number | null;
    readonly userName: string;
    readonly fromCode: string;
    readonly toCode: string;
}

/** Contrato del modelo de dominio Schedule */
export interface ISchedule {
    readonly id: number;
    readonly uuid: string;
    employeeId: number;
    shiftTypeId: number;
    date: string;
    startDatetime: string | null;
    endDatetime: string | null;
    title: string;
    description: string;
    editSource: EditSource;
    editHistory: IScheduleEditHistoryEntry[];
    lastEditedBy: number | null;
    lastEditedAt: string | null;
    createdBy: number | null;
}
