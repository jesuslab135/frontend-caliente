import type { EmployeeRole } from '../types';

export class ShiftCycleConfig {
    constructor(
        public readonly id: number,
        public name: string,
        public traderRole: EmployeeRole,
        public shiftOrder: string[],
        public isDefault: boolean,
        public includeOff: boolean,
        public includeVac: boolean,
    ) {}

    get cycleLength(): number {
        return this.shiftOrder.length;
    }

    get cyclePreview(): string {
        return this.shiftOrder.join(' → ');
    }

    get label(): string {
        const def = this.isDefault ? ' (Default)' : '';
        return `${this.name}${def}`;
    }
}
