import { Vacation } from '../models/Vacation';
import type { VacationDTO } from '../dtos/VacationDTO';

export class VacationAdapter {
    static fromDTO(dto: VacationDTO): Vacation {
        let employeeName = '';
        let employeeId: string | null = null;

        if (typeof dto.employee === 'object' && dto.employee !== null) {
            employeeName = `${dto.employee.user.first_name} ${dto.employee.user.last_name}`.trim();
            employeeId = dto.employee.employee_id;
        }

        return new Vacation(
            dto.id,
            dto.uuid,
            employeeName,
            employeeId,
            dto.start_date,
            dto.end_date,
            dto.status,
            dto.reason,
            dto.rejection_reason,
            dto.total_days,
            dto.created_at,
        );
    }

    static fromDTOList(dtos: VacationDTO[]): Vacation[] {
        return dtos.map(dto => VacationAdapter.fromDTO(dto));
    }
}
