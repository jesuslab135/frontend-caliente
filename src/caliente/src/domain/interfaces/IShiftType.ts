/** Contrato del modelo de dominio ShiftType */
export interface IShiftType {
    readonly id: number;
    code: string;
    name: string;
    categoryCode: string | null;
    startTime: string | null;
    endTime: string | null;
    isWorkingShift: boolean;
    colorCode: string;
    applicableToMonitor: boolean;
    applicableToInplay: boolean;
    isActive: boolean;
    rawCategoryId: number | null;
}
