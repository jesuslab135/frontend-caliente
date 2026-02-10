export type UserRoleDTO = 'MONITOR_TRADER' | 'INPLAY_TRADER' | 'MANAGER' | 'ADMIN';

export interface UserDTO {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    employee_id: string;
    role: UserRoleDTO;
    phone: string;
    team_id: number | null;
    is_active: boolean;
    preferred_shift_category?: number | null;
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