import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { IHttpClient, RequestConfig } from '../interfaces/IHttpClient';

export class AxiosHttpClient implements IHttpClient {
    private client: AxiosInstance;

    constructor(baseURL: string) {
        this.client = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    setAuthToken(token: string | null): void {
        if (token) {
            this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.client.defaults.headers.common['Authorization'];
        }
    }

    private mapConfig(config?: RequestConfig): AxiosRequestConfig {
        return {
            headers: config?.headers,
            params: config?.params
        };
    }

    async get<T>(url: string, config?: RequestConfig): Promise<T> {
        const response = await this.client.get<T>(url, this.mapConfig(config));
        return response.data;
    }

    async post<T>(url: string, body: any, config?: RequestConfig): Promise<T> {
        const response = await this.client.post<T>(url, body, this.mapConfig(config));
        return response.data;
    }

    async put<T>(url: string, body: any, config?: RequestConfig): Promise<T> {
        const response = await this.client.put<T>(url, body, this.mapConfig(config));
        return response.data;
    }

    async patch<T>(url: string, body: any, config?: RequestConfig): Promise<T> {
        const response = await this.client.patch<T>(url, body, this.mapConfig(config));
        return response.data;
    }

    async delete<T>(url: string, config?: RequestConfig): Promise<T> {
        const response = await this.client.delete<T>(url, this.mapConfig(config));
        return response.data;
    }

}