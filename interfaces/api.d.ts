export interface ApiSuccessResponse<T> {
    statusCode: number;
    data: T;
    message: string;
    success: true;
}

export interface ApiErrorResponse {
    success: false;
    message: string;
    details: { field: string; message: string }[] | null;
}