import type { EmployeeRole } from '../types';

/**
 * Re-export del tipo canónico para backward compatibility.
 * Fuente de verdad: types/roles.ts
 */
export type UserRoleDTO = EmployeeRole;

/** Nested employee profile inside the auth user response */
export interface EmployeeProfileDTO {
    uuid: string;
    employee_id: string;
    phone: string;
    role: UserRoleDTO;
    role_display: string;
    team: { uuid: string; name: string; is_active: boolean } | null;
    is_active: boolean;
    hire_date: string | null;
    created_at: string;
}

/** User as returned by /api/auth/me/ and inside login response */
export interface UserDTO {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    is_active: boolean;
    is_staff: boolean;
    date_joined: string;
    last_login: string | null;
    employee_profile: EmployeeProfileDTO;
}

export interface LoginResponseDTO {
    access: string;
    refresh: string;
    user: UserDTO;
}

export interface LoginCredentials {
    email: string;
    password: string;
}
