import type { GenerationLogStatus } from '../types';

/** GET /schedulegenerationlogs/ */
export interface ScheduleGenerationLogDTO {
    id: number;
    month: number;
    year: number;
    generated_by: number | null;
    status: GenerationLogStatus;
    total_assignments: number;
    events_considered: number;
    traders_scheduled: number;
    warnings: string[];
    errors: string[];
    algorithm_decisions: unknown[];
    execution_time_seconds: number;
    algorithm_version: string;
    parameters_snapshot: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

/** Query params para filtrar logs de generación */
export interface ScheduleGenerationFilterParams {
    month?: number;
    year?: number;
    status?: GenerationLogStatus;
}
