import { User } from '../models/User';
import type { UserDTO } from '../dtos/AuthDTO';

export class UserAdapter {
    static fromDTO(dto: UserDTO): User {
        const profile = dto.employee_profile;
        return new User(
            String(dto.id),
            dto.email,
            dto.first_name,
            dto.last_name,
            profile?.employee_id ?? '',
            profile?.role ?? 'MONITOR_TRADER',
            profile?.phone ?? '',
            null,
            profile?.is_active ?? dto.is_active ?? true,
            profile?.uuid ?? ''
        );
    }
}
