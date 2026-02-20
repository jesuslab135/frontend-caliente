import type { UserRoleDTO } from './AuthDTO';

/** GET /shiftcategories/ */
export interface ShiftCategoryDTO {
    id: number;
    code: string;
    name: string;
    min_traders: number;
    description: string;
    typical_start_time: string | null;
    typical_end_time: string | null;
    display_order: number;
    created_at: string;
    updated_at: string;
}

/** GET /shifttypes/ — category puede ser objeto anidado o FK numérico */
export interface ShiftTypeDTO {
    id: number;
    code: string;
    name: string;
    category: ShiftCategoryDTO | number | null;
    start_time: string | null;
    end_time: string | null;
    is_working_shift: boolean;
    color_code: string;
    applicable_to_monitor: boolean;
    applicable_to_inplay: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/** GET /shiftcycleconfigs/ */
export interface ShiftCycleConfigDTO {
    id: number;
    name: string;
    trader_role: UserRoleDTO;
    shift_order: string[];
    is_default: boolean;
    include_off: boolean;
    include_vac: boolean;
    created_at: string;
    updated_at: string;
}
