import type { UserRoleDTO } from './AuthDTO';
import type { TeamSummaryDTO } from './TeamDTO';

/** Nested Django User fields inside Employee serializer (when backend nests them) */
export interface EmployeeUserDTO {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
}

/** Full Employee as returned by GET /employees/ and /employees/:uuid/ */
export interface EmployeeDTO {
    id: number;
    uuid: string;
    employee_id: string;
    user: EmployeeUserDTO | number;
    role: UserRoleDTO;
    team: TeamSummaryDTO | number | null;
    phone: string;
    is_active: boolean;
    exclude_from_grid: boolean;
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
