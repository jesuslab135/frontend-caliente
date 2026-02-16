import type { IHttpClient } from '../interfaces/IHttpClient';
import type { SwapRequestDTO, SwapRequestWriteDTO } from '../dtos/SwapRequestDTO';
import { API_ROUTES } from '../constants/endpoints';

export class SwapRequestRepository {
    private base = API_ROUTES.SWAP_REQUESTS.BASE;

    constructor(private http: IHttpClient) {}

    async getAll(filters?: Record<string, any>): Promise<SwapRequestDTO[]> {
        return this.http.get<SwapRequestDTO[]>(this.base, { params: filters });
    }

    async create(payload: SwapRequestWriteDTO): Promise<SwapRequestDTO> {
        return this.http.post<SwapRequestDTO>(this.base, payload);
    }

    /** Peer accept/reject (trader responding to incoming swap) */
    async respond(uuid: string, payload: { action: 'accept' | 'reject'; peer_response_note?: string }): Promise<SwapRequestDTO> {
        return this.http.put<SwapRequestDTO>(`${this.base}${uuid}/respond/`, payload);
    }

    /** Admin approve/reject (final approval after peer acceptance) */
    async approve(uuid: string, payload: { action: 'approve' | 'reject'; admin_response_note?: string }): Promise<SwapRequestDTO> {
        return this.http.put<SwapRequestDTO>(`${this.base}${uuid}/approve/`, payload);
    }

    async cancel(uuid: string): Promise<SwapRequestDTO> {
        return this.http.patch<SwapRequestDTO>(`${this.base}${uuid}/`, { status: 'CANCELLED' });
    }
}
