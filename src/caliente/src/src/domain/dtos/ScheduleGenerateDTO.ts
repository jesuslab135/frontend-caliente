import type { ScheduleGenerationLogDTO } from './ScheduleGenerationLogDTO';

/** POST /schedules/generate/ request body */
export interface ScheduleGenerateRequestDTO {
    month: number;
    year: number;
}

/** POST /schedules/generate/ response — returns a generation log */
export type ScheduleGenerateResponseDTO = ScheduleGenerationLogDTO;
