import { Employee } from '../models/Employee';
import type { EmployeeDTO } from '../dtos/EmployeeDTO';

export class EmployeeAdapter {
    static fromDTO(dto: EmployeeDTO): Employee {
        let email = '', firstName = '', lastName = '';
        if (typeof dto.user === 'object' && dto.user !== null) {
            email = dto.user.email;
            firstName = dto.user.first_name;
            lastName = dto.user.last_name;
        }

        let teamUuid: string | null = null;
        let teamName: string | null = null;
        if (typeof dto.team === 'object' && dto.team !== null) {
            teamUuid = dto.team.uuid;
            teamName = dto.team.name;
        }

        return new Employee(
            dto.uuid,
            dto.employee_id,
            email,
            firstName,
            lastName,
            dto.role,
            dto.phone,
            dto.is_active,
            dto.hire_date,
            teamUuid,
            teamName,
            dto.preferred_shift_category,
            dto.exclude_from_grid ?? false,
            dto.id,
        );
    }

    static fromDTOList(dtos: EmployeeDTO[]): Employee[] {
        return dtos.map(dto => EmployeeAdapter.fromDTO(dto));
    }
}
