try {
    dotenv.config();
} catch {
    console.warn('.env config failed.');
}
import { connect } from 'amqplib';
import dotenv from 'dotenv';
import { AudioJob } from './AudioJob';
import { FileModel, FileModelType } from './model/FileModel';
import { VideoJob } from './VideoJob';

const incomingQueueName = 'media-conversion-tasks';
// const outgoingExchange = 'media-conversion-results';
const outgoingQueueName = 'media-conversion-results';

(async () => {
    const connection = await connect(process.env.RABBITMQ_URL);
    console.log('created connection to rabbitMQ');

    const channel = await connection.createChannel();

    await channel.assertQueue(incomingQueueName);
    await channel.assertQueue(outgoingQueueName, { durable: true });

    await channel.consume(
        incomingQueueName,
        async (incoming) => {
            console.log('got incoming: ', incoming);
            const file: FileModel = JSON.parse(incoming.content.toString('utf8'));
            if (file.file_type === FileModelType.Video) {
                /**
                 * VIDEO JOB
                 */
                const job = await VideoJob.create(file, (videoJob) => {
                    console.log('job finished: ', videoJob);
                    const outgoing = Buffer.from(JSON.stringify({
                        outputs: videoJob.outputs,
                        parentFileId: file.id,
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
