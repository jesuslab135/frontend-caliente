export interface TeamDTO {
    uuid: string;
    name: string;
    description: string;
    is_active: boolean;
    manager: TeamManagerDTO | null;
    created_at: string;
    updated_at: string;
}

/** Inline manager reference to avoid circular nesting */
export interface TeamManagerDTO {
    uuid: string;
    employee_id: string;
    full_name: string;
    role: string;
}

/** Lightweight team reference nested inside Employee responses */
export interface TeamSummaryDTO {
    uuid: string;
    name: string;
    is_active: boolean;
}
