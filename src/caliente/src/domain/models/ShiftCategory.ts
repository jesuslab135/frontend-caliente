export class ShiftCategory {
    constructor(
        public readonly id: number,
        public code: string,
        public name: string,
        public minTraders: number,
        public description: string,
        public typicalStartTime: string | null,
        public typicalEndTime: string | null,
        public displayOrder: number,
    ) {}

    get label(): string {
        return `${this.code} — ${this.name}`;
    }

    get timeRange(): string {
        if (!this.typicalStartTime || !this.typicalEndTime) return '';
        return `${this.typicalStartTime.slice(0, 5)}-${this.typicalEndTime.slice(0, 5)}`;
    }
}
