/** Contrato del modelo de dominio ShiftCategory */
export interface IShiftCategory {
    readonly id: number;
    code: string;
    name: string;
    minTraders: number;
    description: string;
    typicalStartTime: string | null;
    typicalEndTime: string | null;
    displayOrder: number;
}
