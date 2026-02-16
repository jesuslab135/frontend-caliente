import type { VacationStatus } from '../types';

export class Vacation {
    constructor(
        public readonly id: number,
        public readonly uuid: string,
        public employeeName: string,
        public employeeId: string | null,
        public startDate: string,
        public endDate: string,
        private _status: VacationStatus,
        public reason: string,
        public rejectionReason: string,
        public totalDays: number,
        public readonly createdAt: string,
    ) {}

    get status(): VacationStatus {
        return this._status;
    }

    get isPending(): boolean {
        return this._status === 'PENDING';
    }

    get isApproved(): boolean {
        return this._status === 'APPROVED';
    }

    get isRejected(): boolean {
        return this._status === 'REJECTED';
    }

    get isCancelled(): boolean {
        return this._status === 'CANCELLED';
    }

    get isFinal(): boolean {
        return this.isApproved || this.isRejected || this.isCancelled;
    }

    get statusLabel(): string {
        const labels: Record<VacationStatus, string> = {
            'PENDING': 'Pendiente',
            'APPROVED': 'Aprobada',
            'REJECTED': 'Rechazada',
            'CANCELLED': 'Cancelada',
        };
        return labels[this._status] || this._status;
    }

    get dateRange(): string {
        return `${this.startDate} — ${this.endDate}`;
    }
}
