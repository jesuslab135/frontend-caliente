import type { SwapRequestStatus } from '../types';

export class SwapRequest {
    constructor(
        public readonly id: number,
        public readonly uuid: string,
        public requesterName: string,
        public requesterEmployeeId: string | null,
        public targetName: string,
        public targetEmployeeId: string | null,
        public requesterScheduleDate: string | null,
        public targetScheduleDate: string | null,
        private _status: SwapRequestStatus,
        public reason: string,
        public peerResponseNote: string,
        public adminResponseNote: string,
        public readonly createdAt: string,
    ) {}

    get status(): SwapRequestStatus {
        return this._status;
    }

    get isPending(): boolean {
        return this._status === 'PENDING';
    }

    get isAcceptedByPeer(): boolean {
        return this._status === 'ACCEPTED_BY_PEER';
    }

    get isApproved(): boolean {
        return this._status === 'APPROVED';
    }

    get isRejected(): boolean {
        return this._status === 'REJECTED_BY_PEER' || this._status === 'REJECTED_BY_ADMIN';
    }

    get isCancelled(): boolean {
        return this._status === 'CANCELLED';
    }

    get isFinal(): boolean {
        return this.isApproved || this.isRejected || this.isCancelled;
    }

    get statusLabel(): string {
        const labels: Record<SwapRequestStatus, string> = {
            'PENDING': 'Pendiente',
            'ACCEPTED_BY_PEER': 'Aceptado (Peer)',
            'REJECTED_BY_PEER': 'Rechazado (Peer)',
            'APPROVED': 'Aprobado',
            'REJECTED_BY_ADMIN': 'Rechazado (Admin)',
            'CANCELLED': 'Cancelado',
        };
        return labels[this._status] || this._status;
    }
}
