import { SwapRequest } from '../models/SwapRequest';
import type { SwapRequestDTO } from '../dtos/SwapRequestDTO';

export class SwapRequestAdapter {
    static fromDTO(dto: SwapRequestDTO): SwapRequest {
        let requesterName = '';
        let requesterEmployeeId: string | null = null;
        if (typeof dto.requester === 'object' && dto.requester !== null) {
            requesterName = `${dto.requester.user.first_name} ${dto.requester.user.last_name}`.trim();
            requesterEmployeeId = dto.requester.employee_id;
        }

        let targetName = '';
        let targetEmployeeId: string | null = null;
        if (typeof dto.target_employee === 'object' && dto.target_employee !== null) {
            targetName = `${dto.target_employee.user.first_name} ${dto.target_employee.user.last_name}`.trim();
            targetEmployeeId = dto.target_employee.employee_id;
        }

        let requesterScheduleDate: string | null = null;
        if (typeof dto.requester_schedule === 'object' && dto.requester_schedule !== null) {
            requesterScheduleDate = dto.requester_schedule.date;
        }

        let targetScheduleDate: string | null = null;
        if (typeof dto.target_schedule === 'object' && dto.target_schedule !== null) {
            targetScheduleDate = dto.target_schedule.date;
        }

        return new SwapRequest(
            dto.id,
            dto.uuid,
            requesterName,
            requesterEmployeeId,
            targetName,
            targetEmployeeId,
            requesterScheduleDate,
            targetScheduleDate,
            dto.status,
            dto.reason,
            dto.peer_response_note,
            dto.admin_response_note,
            dto.created_at,
        );
    }

    static fromDTOList(dtos: SwapRequestDTO[]): SwapRequest[] {
        return dtos.map(dto => SwapRequestAdapter.fromDTO(dto));
    }
}
