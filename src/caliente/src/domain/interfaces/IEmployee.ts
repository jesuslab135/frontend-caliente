import type { EmployeeRole } from '../types';

/** Contrato del modelo de dominio Employee */
export interface IEmployee {
    readonly uuid: string;
    readonly employeeId: string;
    readonly email: string;
    firstName: string;
    lastName: string;
    role: EmployeeRole;
    phone: string;
    isActive: boolean;
    excludeFromGrid: boolean;
    hireDate: string | null;
    teamUuid: string | null;
    teamName: string | null;
    preferredShiftCategory: number | null;
    readonly dbId: number;
}
