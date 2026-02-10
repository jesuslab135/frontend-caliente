import { Employee } from '../models/Employee';
import type { EmployeeDTO } from '../dtos/EmployeeDTO';

export class EmployeeAdapter {
    static fromDTO(dto: EmployeeDTO): Employee {
        return new Employee(
            dto.uuid,
            dto.employee_id,
            dto.user.email,
            dto.user.first_name,
            dto.user.last_name,
            dto.role,
            dto.phone,
            dto.is_active,
            dto.hire_date,
            dto.team?.uuid ?? null,
            dto.team?.name ?? null,
            dto.preferred_shift_category,
        );
    }

    static fromDTOList(dtos: EmployeeDTO[]): Employee[] {
        return dtos.map(dto => EmployeeAdapter.fromDTO(dto));
    }
}
