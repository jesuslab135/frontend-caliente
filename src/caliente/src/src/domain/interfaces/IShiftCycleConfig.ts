import type { EmployeeRole } from '../types';

/** Contrato del modelo de dominio ShiftCycleConfig */
export interface IShiftCycleConfig {
    readonly id: number;
    name: string;
    traderRole: EmployeeRole;
    shiftOrder: string[];
    isDefault: boolean;
    includeOff: boolean;
    includeVac: boolean;
}
