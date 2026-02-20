/** Resumen de liga anidado en respuestas de eventos deportivos */
export interface LeagueSummaryDTO {
    id: number;
    uuid: string;
    name: string;
}

/** GET /sportevents/ */
export interface SportEventDTO {
    id: number;
    uuid: string;
    league: LeagueSummaryDTO | number;
    name: string;
    date_start: string;
    date_end: string | null;
    priority: number;
    description: string;
    external_id: string | null;
    home_team: string;
    away_team: string;
    display_name: string;
    league_name: string;
    sport: string;
    created_at: string;
    updated_at: string;
}

/** Payload para crear/actualizar un evento deportivo */
export interface SportEventWriteDTO {
    league: number;
    name: string;
    date_start: string;
    date_end?: string | null;
    priority: number;
    description?: string;
    external_id?: string | null;
    home_team?: string;
    away_team?: string;
}

/** Query params para filtrar eventos deportivos */
export interface SportEventFilterParams {
    date_from?: string;
    date_to?: string;
    league?: number;
    priority_min?: number;
    priority_max?: number;
}

/** Calendar month summary response */
export interface CalendarMonthSportSummary {
    sport: string;
    count: number;
}

export type CalendarMonthResponse = Record<string, CalendarMonthSportSummary[]>;

/** Calendar day detail response */
export interface CalendarDayEvent {
    uuid: string;
    name: string;
    display_name: string;
    league: string;
    sport: string;
    home_team: string;
    away_team: string;
    time: string;
    priority: number;
}

export type CalendarDayResponse = Record<string, CalendarDayEvent[]>;
