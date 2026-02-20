export class SystemSettings {
    constructor(
        public readonly id: number,
        public weekendScheduling: boolean,
        public maxConsecutiveDays: number,
        public minRestHours: number,
        public autoApproval: boolean,
        public notificationEmailEnabled: boolean,
        public notificationWhatsappEnabled: boolean,
        public defaultAlgorithmVersion: string,
    ) {}

    get restHoursLabel(): string {
        return `${this.minRestHours}h`;
    }

    get consecutiveDaysLabel(): string {
        return `${this.maxConsecutiveDays} días`;
    }
}
