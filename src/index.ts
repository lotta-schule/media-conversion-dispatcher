try {
    // tslint:disable-next-line:no-var-requires
    require('dotenv').config();
} catch {
    console.warn('.env config failed.');
}
import { init } from '@sentry/node';
if (process.env.SENTRY_DSN) {
    init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.APP_ENVIRONMENT,
    });
}
import { connect } from 'amqplib';
import { AudioJob } from './AudioJob';
import { FileModel, FileModelType } from './model/FileModel';
import { VideoJob } from './VideoJob';

const incomingQueueName = 'media-conversion-tasks';
const outgoingQueueName = 'media-conversion-results';

(async () => {
    const connection = await connect(process.env.RABBITMQ_URL);
    console.log('created connection to rabbitMQ');

    const channel = await connection.createChannel();

    await channel.checkQueue(incomingQueueName);

    await channel.consume(
        incomingQueueName,
        async (incoming) => {
            console.log('got incoming: ', incoming);
            console.log(
                'incoming content: ',
                incoming.content.toString('utf8')
            );
            const prefix = incoming.properties.headers.prefix;

            const file: FileModel = JSON.parse(
                incoming.content.toString('utf8')
            );
            if (file.file_type === FileModelType.Video) {
                /**
                 * VIDEO JOB
                 */
                const startJobDate = new Date();
                const job = VideoJob.create(file, prefix, (videoJob) => {
                    const finishJobDate = new Date();
                    console.log('job finished: ', videoJob);
                    const outgoing = Buffer.from(
                        JSON.stringify({
                            outputs: videoJob.outputs,
                            parentFileId: file.id,
                            metadata: job.metadata,
                            processingDuration:
                                (finishJobDate.getTime() -
                                    startJobDate.getTime()) /
                                1000,
                        })
                    );
                    channel.sendToQueue(outgoingQueueName, outgoing, {
                        persistent: true,
                        headers: {
                            prefix,
                        },
                    });
                    channel.ack(incoming);
                });
                job.startEncodingRequest();
            } else if (file.file_type === FileModelType.Audio) {
                /**
                 * AUDIO JOB
                 */
                const job = AudioJob.create(file, prefix, (audioJob) => {
                    console.log('job finished: ', audioJob);
                    const outgoing = Buffer.from(
                        JSON.stringify({
                            outputs: audioJob.outputs,
                            parentFileId: file.id,
                        })
                    );
                    channel.sendToQueue(outgoingQueueName, outgoing, {
                        persistent: true,
                        headers: {
                            prefix,
                        },
                    });
                    channel.ack(incoming);
                });
                job.startEncodingRequest();
            } else {
                channel.ack(incoming);
            }
        },
        {
            // manual acknowledgment mode,
            // see https://www.rabbitmq.com/confirms.html for details
            noAck: false,
        }
    );
})();
