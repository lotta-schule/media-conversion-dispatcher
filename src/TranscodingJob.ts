import Coconut from 'coconutjs';
import { v1 as uuid } from 'uuid';
import { FileModel, FileModelType } from './model/FileModel';

const coconut = new Coconut.Client(process.env.COCONUT_API_KEY);

coconut.notification = {
  type: 'http',
  url: 'https://app.coconut.co/tools/webhooks/58aee6d0/einsa',
};

coconut.storage = {
  service: 's3other',
  region: process.env.AWS_S3_REGION,
  bucket: process.env.AWS_S3_BUCKET,
  endpoint: process.env.AWS_S3_ENDPOINT,
  credentials: {
    access_key_id: process.env.AWS_ACCESS_KEY_ID,
    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

export type TranscodingJobOutput = Record<
  string,
  {
    path: string;
    mimeType: string;
    fileType: FileModelType;
    metadata?: any;
  }
>;

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

  public prefix = '';

  public jobId: number;

  public parentFile: FileModel;

  public outputs: Record<string, any>;

  public metadata: any;

  private onComplete?: (job: TranscodingJob) => void | Promise<void>;

  constructor(
    file: FileModel,
    prefix: string,
    onComplete?: (job: TranscodingJob) => void | Promise<void>
  ) {
    this.parentFile = file;
    this.prefix = prefix ?? '';
    this.onComplete = onComplete;
  }

  public async startEncodingRequest(): Promise<any> {
    this.outputs = Object.fromEntries(this.createOutputs());
    const log = <T>(value: T): T => {
      console.log('THIS IS WHAT WE PASS: ', value);
      return value;
    };
    const job = await new Promise<any>((resolve, reject) => {
      coconut.Job.create(
        log({
          input: {
            url: this.parentFile.remote_location,
          },
          outputs: Object.fromEntries(
            Object.entries(this.outputs).map(([format, output]) => [
              format,
              { path: output.path },
            ])
          ),
        }),
        (job: any, err: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve(job);
          }
        }
      );
    });
    console.log('job created:');
    console.log(job);
    this.jobId = job.id;
    this.watch();
    return job;
  }

  public addMetadata(metadata: { [format: string]: any }): void {
    this.outputs = Object.fromEntries(
      Object.entries(this.outputs).map(([format, output]) => ({
        ...output,
        metadata:
          output.metadata || metadata[format]
            ? { ...output.metadata, ...metadata[format] }
            : undefined,
      }))
    );
    this.metadata = metadata.source;
  }

  public async watch(): Promise<void> {
    let job: any | null = null;
    try {
      job = await new Promise((resolve, reject) => {
        coconut.Job.retrieve(this.jobId, (job: any, err: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve(job);
          }
        });
      });
    } catch (e) {
      console.error('Error getting job status for job ', this.jobId, ': ', e);
    }
    console.log(job);
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
  ): any {
    const path = `${this.prefix}/${this.parentFile.id}/${uuid()}${extension}`;

    return [
      format,
      {
        fileType,
        mimeType,
        path,
      },
    ];
  }

  protected createOutputs(): [format: string, config: any][] {
    return [];
  }
}
