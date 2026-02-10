export class ShiftType {
    constructor(
        public readonly id: number,
        public code: string,
        public name: string,
        public categoryCode: string | null,
        public startTime: string | null,
        public endTime: string | null,
        public isWorkingShift: boolean,
        public colorCode: string,
        public applicableToMonitor: boolean,
        public applicableToInplay: boolean,
        public isActive: boolean,
    ) {}

    get timeRange(): string {
        if (!this.startTime || !this.endTime) return '';
        return `${this.startTime.slice(0, 5)}-${this.endTime.slice(0, 5)}`;
    }

    get label(): string {
        const time = this.timeRange;
        return time ? `${this.code} (${time})` : this.code;
    }

    get isOff(): boolean {
        return this.code === 'OFF';
    }

    get isVacation(): boolean {
        return this.code === 'VAC';
    }
}
