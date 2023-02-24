import Coconut, { Job as CoconutJob } from '@ptitmouton/coconutjs';
import { v1 as uuid } from 'uuid';
import { FileModel, FileModelType } from './model/FileModel';

const coconut = new Coconut();

const s3Path = (objectPath: string) =>
  [
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

export interface TranscodingJobOutput {
  format: string;
  s3Path: string;
  remoteStorage: { endpoint: string; bucket: string; path: string };
  mimeType: string;
  fileType: FileModelType;
  metadata?: any;
}

export class TranscodingJob {
  public static jobs: TranscodingJob[] = [];

  public static create(
    file: FileModel,
    prefix: string,
    onComplete?: (job: TranscodingJob) => void | Promise<void>
  ): TranscodingJob {
    const job = new TranscodingJob(file, prefix, onComplete);
    this.jobs.push(job);
    return job;
  }

  public prefix: string;

  public jobId: number;

  public parentFile: FileModel;

  public outputs: TranscodingJobOutput[];

  public metadata: any;

  private onComplete?: (job: TranscodingJob) => void | Promise<void>;

  constructor(
    file: FileModel,
    prefix: string,
    onComplete?: (job: TranscodingJob) => void | Promise<void>
  ) {
    this.parentFile = file;
    this.prefix = prefix;
    this.onComplete = onComplete;
  }

  public async startEncodingRequest(): Promise<CoconutJob> {
    this.outputs = this.createOutputs();
    const config = {
      api_key: process.env.COCONUT_API_KEY,
      outputs: this.outputs
        .map((o) => [o.format, o.s3Path])
        .reduce((obj, nextVal) => ({ ...obj, [nextVal[0]]: nextVal[1] }), {}),
      source: this.parentFile.remote_location,
      webhook: 'https://app.coconut.co/tools/webhooks/58aee6d0/einsa',
    } as any;
    console.log('config created:');
    console.log(config);
    const job = await coconut.createJob(config);
    this.jobId = job.id;
    this.watch();
    return job;
  }

  public addMetadata(metadata: { [format: string]: any }): void {
    (this.outputs = this.outputs.map((output) => ({
      ...output,
      metadata:
        output.metadata || metadata[output.format]
          ? { ...output.metadata, ...metadata[output.format] }
          : undefined,
    }))),
      (this.metadata = metadata.source);
  }

  public async watch(): Promise<void> {
    let job: CoconutJob | null = null;
    try {
      job = await coconut.getJob(this.jobId);
    } catch (e) {
      console.error('Error getting job status for job ', this.jobId, ': ', e);
    }
    if (job?.status === 'completed') {
      console.log('job completed: ', job);
      console.log('will fetch job infos now');
      setTimeout(async () => {
        try {
          const { metadata } = (await coconut.getAllMetadata(
            this.jobId
          )) as any;
          console.log('got metadata: ', metadata);
          this.addMetadata(metadata);
        } catch (e) {
          console.error(e);
        }
        if (this.onComplete) {
          await this.onComplete(this);
          TranscodingJob.jobs = TranscodingJob.jobs.filter(
            (j) => j.jobId !== job.id
          );
        }
      }, 3000);
    } else {
      setTimeout(this.watch.bind(this), 30000);
    }
  }

  protected createOutput(
    format: string,
    extension: string,
    mimeType: string,
    fileType: FileModelType
  ): TranscodingJobOutput {
    const path = `${this.prefix}/${this.parentFile.id}/${uuid()}${extension}`;
    const bucket = process.env.UGC_S3_COMPAT_BUCKET;
    return {
      fileType,
      format,
      mimeType,
      remoteStorage: {
        endpoint: process.env.UGC_S3_COMPAT_ENDPOINT,
        bucket,
        path,
      },
      s3Path: s3Path(path),
    };
  }

  protected createOutputs(): TranscodingJobOutput[] {
    return [];
  }
}
