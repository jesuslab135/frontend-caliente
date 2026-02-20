import { ScheduleGenerationLog } from '../models/ScheduleGenerationLog';
import type { ScheduleGenerationLogDTO } from '../dtos/ScheduleGenerationLogDTO';

export class ScheduleGenerationLogAdapter {
    static fromDTO(dto: ScheduleGenerationLogDTO): ScheduleGenerationLog {
        return new ScheduleGenerationLog(
            dto.id,
            dto.month,
            dto.year,
            dto.status,
            dto.total_assignments,
            dto.events_considered,
            dto.traders_scheduled,
            dto.warnings,
            dto.errors,
            dto.execution_time_seconds,
            dto.algorithm_version,
            dto.created_at,
        );
    }

    static fromDTOList(dtos: ScheduleGenerationLogDTO[]): ScheduleGenerationLog[] {
        return dtos.map(dto => ScheduleGenerationLogAdapter.fromDTO(dto));
    }
}
