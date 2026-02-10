import type { UserRoleDTO } from './AuthDTO';
import type { TeamSummaryDTO } from './TeamDTO';

/** Nested Django User fields inside Employee serializer */
export interface EmployeeUserDTO {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
}

/** Full Employee as returned by GET /employees/ and /employees/:uuid/ */
export interface EmployeeDTO {
    uuid: string;
    employee_id: string;
    user: EmployeeUserDTO;
    role: UserRoleDTO;
    team: TeamSummaryDTO | null;
    phone: string;
    is_active: boolean;
    hire_date: string | null;
    preferred_shift_category: number | null;
    created_at: string;
    updated_at: string;
}

/** Payload for creating/updating an employee */
export interface EmployeeWriteDTO {
    email: string;
    first_name: string;
    last_name: string;
    password?: string;
    employee_id: string;
    role: UserRoleDTO;
    team_uuid?: string | null;
    phone?: string;
    is_active?: boolean;
    hire_date?: string | null;
    preferred_shift_category?: number | null;
}
