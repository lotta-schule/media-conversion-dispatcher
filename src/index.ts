try {
    // tslint:disable-next-line:no-var-requires
    require('dotenv').config();
} catch {
    console.warn('.env config failed.');
}
if (process.env.HONEYBADGER_API_KEY) {
    // tslint:disable-next-line:no-var-requires
    const Honeybadger = require('honeybadger').configure({
        apiKey: process.env.HONEYBADGER_API_KEY,
        environment: process.env.APP_ENVIRONMENT
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
    await channel.checkQueue(outgoingQueueName);

    await channel.consume(
        incomingQueueName,
        async (incoming) => {
            console.log('got incoming: ', incoming);
            console.log('incoming content: ', incoming.content.toString('utf8'));
            const file: FileModel = JSON.parse(incoming.content.toString('utf8'));
            if (file.file_type === FileModelType.Video) {
                /**
                 * VIDEO JOB
                 */
                const startJobDate = new Date();
                const job = await VideoJob.create(file, videoJob => {
                    const finishJobDate = new Date();
                    console.log('job finished: ', videoJob);
                    const outgoing = Buffer.from(JSON.stringify({
                        outputs: videoJob.outputs,
                        parentFileId: file.id,
                        metadata: job.metadata,
                        processingDuration: (finishJobDate.getTime() - startJobDate.getTime()) / 1000
                    }));
                    channel.sendToQueue(outgoingQueueName, outgoing, { persistent: true });
                    channel.ack(incoming);
                });
                job.startEncodingRequest();
            } else if (file.file_type === FileModelType.Audio) {
                /**
                 * AUDIO JOB
                 */
                const job = await AudioJob.create(file, (audioJob) => {
                    console.log('job finished: ', audioJob);
                    const outgoing = Buffer.from(JSON.stringify({
                        outputs: audioJob.outputs,
                        parentFileId: file.id,
                    }));
                    channel.sendToQueue(outgoingQueueName, outgoing, { persistent: true });
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
            noAck: false
        }
    );
})();
