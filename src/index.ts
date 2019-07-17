try {
    dotenv.config();
} catch {
    console.warn('.env config failed.');
}
import { connect } from 'amqplib';
import dotenv from 'dotenv';
import { FileModel, FileModelType } from './model/FileModel';
import { VideoJob } from './VideoJob';

const incomingQueueName = 'media-conversion-tasks';
// const outgoingExchange = 'media-conversion-results';
const outgoingQueueName = 'media-conversion-results';

(async () => {
    const connection = await connect('amqp://guest:guest@rabbitmq');
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
                const job = await VideoJob.create(file, (videoJob) => {
                    console.log('job finished: ', videoJob);
                    const outgoing = Buffer.from(JSON.stringify({
                        outputs: videoJob.outputs,
                        parentFileId: file.id,
                    }));
                    console.log(outgoing.toString('utf8'));
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
