/** Contrato del modelo de dominio SystemSettings (singleton) */
export interface ISystemSettings {
    readonly id: number;
    weekendScheduling: boolean;
    maxConsecutiveDays: number;
    minRestHours: number;
    autoApproval: boolean;
    notificationEmailEnabled: boolean;
    notificationWhatsappEnabled: boolean;
    defaultAlgorithmVersion: string;
}
