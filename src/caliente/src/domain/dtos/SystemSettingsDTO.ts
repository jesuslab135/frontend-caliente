/** GET /systemsettingss/ — configuración singleton del sistema */
export interface SystemSettingsDTO {
    id: number;
    weekend_scheduling: boolean;
    max_consecutive_days: number;
    min_rest_hours: number;
    auto_approval: boolean;
    notification_email_enabled: boolean;
    notification_whatsapp_enabled: boolean;
    default_algorithm_version: string;
    created_at: string;
    updated_at: string;
}

/** Payload para actualizar la configuración del sistema */
export type SystemSettingsWriteDTO = Partial<
    Omit<SystemSettingsDTO, 'id' | 'created_at' | 'updated_at'>
>;
