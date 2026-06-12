export interface SystemConfigEntryDto {
    key: string;
    value: string;
    description: string;
    updatedAt: string;
}

export interface UpdateSystemConfigDto {
    value: string;
}
