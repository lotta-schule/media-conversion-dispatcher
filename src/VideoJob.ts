import { FileModel, FileModelType } from './model/FileModel';
import { TranscodingJob, TranscodingJobOutput } from './TranscodingJob';

export class VideoJob extends TranscodingJob {

    public static create(file: FileModel, prefix: string, onComplete?: (job: TranscodingJob) => void | Promise<void>): TranscodingJob {
        const job = new VideoJob(file, prefix, onComplete);
        this.jobs.push(job);
        return job;
    }

    protected createOutputs(): TranscodingJobOutput[] {
        return [
            this.createOutput('mp4:1080p', '.mp4', 'video/mp4', FileModelType.Video),
            this.createOutput('mp4:480p', '.mp4', 'video/mp4', FileModelType.Video),
            this.createOutput('mp4:720p', '.mp4', 'video/mp4', FileModelType.Video),
            this.createOutput('webm:1080p', '.webm', 'video/webm', FileModelType.Video),
            this.createOutput('webm:480p', '.webm', 'video/webm', FileModelType.Video),
            this.createOutput('webm:720p', '.webm', 'video/webm', FileModelType.Video),
            this.createOutput('gif:500px', '.gif', 'image/gif', FileModelType.Image),
            this.createOutput('storyboard:1200px', '.png', 'image/png', FileModelType.Image),
        ];
    }

}
