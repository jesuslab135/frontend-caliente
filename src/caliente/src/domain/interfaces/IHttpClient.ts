export interface RequestConfig {
    headers?: Record<string, string>;
    params?: Record<string, any>;
}

export interface IHttpClient {
    get<T>(url: string, config?: RequestConfig): Promise<T>;
    post<T>(url: string, body?: any, config?: RequestConfig): Promise<T>;
    put<T>(url: string, body?: any, config?: RequestConfig): Promise<T>;
    patch<T>(url: string, body?: any, config?: RequestConfig): Promise<T>;
    delete<T>(url: string, config?: RequestConfig): Promise<T>;

    setAuthToken(token: string | null): void;
}