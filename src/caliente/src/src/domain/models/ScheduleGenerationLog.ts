import type { GenerationLogStatus } from '../types';

export class ScheduleGenerationLog {
    constructor(
        public readonly id: number,
        public month: number,
        public year: number,
        private _status: GenerationLogStatus,
        public totalAssignments: number,
        public eventsConsidered: number,
        public tradersScheduled: number,
        public warnings: unknown[],
        public errors: unknown[],
        public executionTimeSeconds: number | null,
        public algorithmVersion: string,
        public readonly createdAt: string,
    ) {}

    get status(): GenerationLogStatus {
        return this._status;
    }

    get isSuccess(): boolean {
        return this._status === 'SUCCESS';
    }

    get isFailed(): boolean {
        return this._status === 'FAILED';
    }

    get periodLabel(): string {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${months[this.month - 1]} ${this.year}`;
    }

    get statusLabel(): string {
        const labels: Record<GenerationLogStatus, string> = {
            'SUCCESS': 'Exitoso',
            'PARTIAL': 'Parcial',
            'FAILED': 'Fallido',
            'CANCELLED': 'Cancelado',
        };
        return labels[this._status] || this._status;
    }

    get hasWarnings(): boolean {
        return this.warnings.length > 0;
    }

    get hasErrors(): boolean {
        return this.errors.length > 0;
    }
}
