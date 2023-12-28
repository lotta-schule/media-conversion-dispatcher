import { FileModel, FileModelType } from './model/FileModel';
import { TranscodingJob } from './TranscodingJob';

export class AudioJob extends TranscodingJob {
  public static create(
    file: FileModel,
    prefix: string,
    onComplete?: (job: TranscodingJob) => void | Promise<void>
  ): TranscodingJob {
    const job = new AudioJob(file, prefix, onComplete);
    this.jobs.push(job);
    return job;
  }

  protected createOutputs(): any[] {
    return [
      this.createOutput('mp3', '.mp3', 'audio/mp3', FileModelType.Audio),
      this.createOutput('aac', '.aac', 'audio/aac', FileModelType.Audio),
      this.createOutput('wav', '.wav', 'audio/wav', FileModelType.Audio),
    ];
  }
}
