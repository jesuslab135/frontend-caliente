import { User } from '../models/User';
import type { UserDTO } from '../dtos/AuthDTO';

export class UserAdapter {
    static fromDTO(dto: UserDTO): User {
        return new User(
            dto.id,
            dto.email,
            dto.first_name,
            dto.last_name,
            dto.employee_id,
            dto.role,
            dto.phone,
            dto.team_id,
            dto.is_active
        );
    }
}