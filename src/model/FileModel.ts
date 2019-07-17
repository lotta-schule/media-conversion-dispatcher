export enum FileModelType {
    Image = 'image',
    Video = 'video',
    Audio = 'audio',
    Misc = 'misc',
    Directory = 'directory',
}

export interface FileModel {
    id: number;
    inserted_at: Date;
    updated_at: Date;
    user_id: number;
    tenant_id: number;
    remote_location: string;
    path: string;
    mime_type: string;
    filesize: number;
    filename: string;
    file_type: FileModelType;
}
