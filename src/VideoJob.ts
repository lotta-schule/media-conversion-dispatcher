import Coconut, { Job } from '@ptitmouton/coconutjs';
import uuid from 'uuid/v1';
import { FileModel, FileModelType } from './model/FileModel';

const coconut = new Coconut();

const s3Path = (objectPath: string) => [
    's3://',
    process.env.UGC_S3_COMPAT_ACCESS_KEY_ID,
    ':',
    process.env.UGC_S3_COMPAT_SECRET_ACCESS_KEY,
    '@',
    process.env.UGC_S3_COMPAT_BUCKET,
    '/',
    objectPath,
    `?host=https://${process.env.UGC_S3_COMPAT_ENDPOINT}`,
].join('');

interface VideoJobOutput {
    format: string;
    s3Path: string;
    remoteLocation: string;
    mimeType: string;
    fileType: FileModelType;
}

export class VideoJob {

    public static jobs: VideoJob[] = [];

    public static create(file: FileModel, onComplete?: (job: VideoJob) => void | Promise<void>): VideoJob {
        const job = new VideoJob(file, onComplete);
        this.jobs.push(job);
        return job;
    }

    public jobId: number;

    public parentFile: FileModel;

    public outputs: VideoJobOutput[];

    private onComplete?: (job: VideoJob) => void | Promise<void>;

    constructor(file: FileModel, onComplete?: (job: VideoJob) => void | Promise<void>) {
        this.parentFile = file;
        this.onComplete = onComplete;
    }

    public async startEncodingRequest(): Promise<Job> {
        this.outputs = [
            this.createOutput('mp4:1080p', '.mp4', 'video/mp4', FileModelType.Video),
            this.createOutput('mp4:480p', '.mp4', 'video/mp4', FileModelType.Video),
            this.createOutput('mp4:720p', '.mp4', 'video/mp4', FileModelType.Video),
            this.createOutput('webm:1080p', '.webm', 'video/webm', FileModelType.Video),
            this.createOutput('webm:480p', '.webm', 'video/webm', FileModelType.Video),
            this.createOutput('webm:720p', '.webm', 'video/webm', FileModelType.Video),
        ];
        const config = {
            api_key: process.env.COCONUT_API_KEY,
            outputs: this.outputs
                .map((o) => [o.format, o.s3Path])
                .reduce(((obj, nextVal) => ({ ...obj, [nextVal[0]]: nextVal[1] })), {}),
            source: this.parentFile.remote_location,
            webhook: 'https://app.coconut.co/tools/webhooks/58aee6d0/einsa',
        } as any;
        const job = await coconut.createJob(config);
        this.jobId = job.id;
        this.watch();
        return job;
    }

    public async watch(): Promise<void> {
        const job = await coconut.getJob(this.jobId);
        if (job.status === 'completed') {
            if (this.onComplete) {
                await this.onComplete(this);
                VideoJob.jobs = VideoJob.jobs.filter((j) => j.jobId !== job.id);
            }
        } else {
            setTimeout(this.watch.bind(this), 1000);
        }
    }

    private createOutput(format: string, extension: string, mimeType: string, fileType: FileModelType): VideoJobOutput {
        const path = `${this.parentFile.id}/${uuid()}${extension}`;
        return {
            fileType,
            format,
            mimeType,
            remoteLocation: `${process.env.UGC_S3_COMPAT_CDN_BASE_URL}/${process.env.UGC_S3_COMPAT_BUCKET}/${path}`,
            s3Path: s3Path(path),
        };
    }
}
