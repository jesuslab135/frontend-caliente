import type { GenerationLogStatus } from '../types';

/** Contrato del modelo de dominio ScheduleGenerationLog */
export interface IScheduleGenerationLog {
    readonly id: number;
    month: number;
    year: number;
    generatedByName: string | null;
    status: GenerationLogStatus;
    totalAssignments: number;
    eventsConsidered: number;
    tradersScheduled: number;
    warnings: string[];
    errors: string[];
    algorithmDecisions: unknown[];
    executionTimeSeconds: number;
    algorithmVersion: string;
    parametersSnapshot: Record<string, unknown>;
    readonly createdAt: string;
}
