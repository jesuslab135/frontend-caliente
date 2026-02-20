import { SystemSettings } from '../models/SystemSettings';
import type { SystemSettingsDTO } from '../dtos/SystemSettingsDTO';

export class SystemSettingsAdapter {
    static fromDTO(dto: SystemSettingsDTO): SystemSettings {
        return new SystemSettings(
            dto.id,
            dto.weekend_scheduling,
            dto.max_consecutive_days,
            dto.min_rest_hours,
            dto.auto_approval,
            dto.notification_email_enabled,
            dto.notification_whatsapp_enabled,
            dto.default_algorithm_version,
        );
    }
}
