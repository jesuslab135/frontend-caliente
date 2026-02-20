/** GET /leagues/ */
export interface LeagueDTO {
    id: number;
    uuid: string;
    name: string;
    sport: string;
    country: string;
    is_active: boolean;
    base_priority: number;
    created_at: string;
    updated_at: string;
}

/** Payload para crear/actualizar una liga */
export interface LeagueWriteDTO {
    name: string;
    sport?: string;
    country?: string;
    is_active?: boolean;
    base_priority?: number;
}
