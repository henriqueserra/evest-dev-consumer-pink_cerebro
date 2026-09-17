import {
  DeleteMessageCommand,
  DeleteMessageCommandInput,
  GetQueueAttributesCommand,
  GetQueueAttributesCommandInput,
  GetQueueAttributesCommandOutput,
  GetQueueAttributesRequest,
  GetQueueUrlRequest,
  PurgeQueueCommandInput,
  ReceiveMessageCommandInput,
  SendMessageCommand,
  SendMessageCommandOutput,
  SendMessageRequest,
  SQS,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { SQSRecord } from 'aws-lambda';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { EverestLogService } from './everest.log.services';
dotenv.config();

const region = process.env.AWSREGION;
const accessKeyId = process.env.AWSACESSKEYID;
const secretAccessKey = process.env.AWSSECRETACCESSKEY;

if (!region || !accessKeyId || !secretAccessKey) {
  throw new Error('AWS configuration environment variables are not set properly.');
}

const routeName = 'SQSClient';
const logService = new EverestLogService();

const sqsClient = new SQSClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const sqs = new SQS({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export class SqsServices {
  static async listQueues() {
    const methodName = `${routeName}.listQueues`;
    try {
      let listQueues = await sqs.listQueues();
      const step_01 = listQueues.QueueUrls?.filter((queue) => queue.includes(process.env.ENVIRONMENT as string));
      return step_01;
    } catch (error: any) {
      logService.error({ message: error.message, method: methodName });
      throw new Error(`listQueues - ${error.message}`);
    }
  }

  static async listDqlQueues() {
    const methodName = `${routeName}.listDqlQueues`;
    try {
      let listQueues = await sqs.listQueues();
      const step_01 = listQueues.QueueUrls?.filter((queue) => queue.includes(process.env.ENVIRONMENT as string));
      const step_02 = step_01?.filter((queue) => queue.includes('Dql'));
      return step_02;
    } catch (error: any) {
      logService.error({ message: error.message, method: methodName });
      throw new Error(`listDqlQueues - ${error.message}`);
    }
  }

  static async messagesOnQueue(queueUrl: string): Promise<{
    QueueName: string;
    QueueArn: string;
    ApproximateNumberOfMessages: number;
  }> {
    const methodName = `${routeName}.messagesOnQueue`;
    try {
      const params: GetQueueAttributesCommandInput = {
        QueueUrl: queueUrl,
        AttributeNames: ['All'],
      };
      const response: GetQueueAttributesCommandOutput = await sqsClient.send(new GetQueueAttributesCommand(params));
      const QueueName = queueUrl.split('/').pop();
      const resposta: {
        QueueName: string;
        QueueArn: string;
        ApproximateNumberOfMessages: number;
      } = {
        QueueName: QueueName || '',
        QueueArn: response.Attributes?.QueueArn || '',
        ApproximateNumberOfMessages: parseInt(response.Attributes?.ApproximateNumberOfMessages || '0'),
      };
      return resposta;
    } catch (error: any) {
      logService.error({ message: error.message, method: methodName, payload: { queueUrl } });
      throw new Error(`messagesOnQueue - ${error.message}`);
    }
  }

  static async deleteMessageFromQueue({
    Record,
    metodo_final,
    observacao,
  }: {
    Record: SQSRecord;
    metodo_final: string;
    observacao: string;
  }) {
    const methodName = `${routeName}.deleteMessageFromQueue`;
    try {
      // Get QueueUrl from QueueArn
      const queueName = Record.eventSourceARN.split(':').pop();
      const queueParams: GetQueueUrlRequest = {
        QueueName: queueName,
      };
      const queueAttributes = await sqs.getQueueUrl(queueParams);

      const deletParams: DeleteMessageCommandInput = {
        QueueUrl: queueAttributes.QueueUrl,
        ReceiptHandle: Record.receiptHandle,
      };
      try {
        await sqsClient.send(new DeleteMessageCommand(deletParams));
      } catch (error: any) {
        logService.error({ message: error.message, method: methodName });
      }
    } catch (error: any) {
      logService.error({ message: error.message, method: methodName, payload: { Record } });
    }
  }

  static async removeMessageFromQueue({ queueUrl, receiptHandle }: { queueUrl: string; receiptHandle: string }) {
    const methodName = `${routeName}.removeMessageFromQueue`;
    try {
      const params = {
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      };

      await sqs.deleteMessage(params);

      logService.info({ message: `Message deleted from the queue ${queueUrl}`, method: methodName });
    } catch (error: any) {
      throw error;
    }
  }

  static async getNumberOfMessages({ queueName }: { queueName: string }) {
    const methodName = `${routeName}.getNumberOfMessages`;
    try {
      const queueParams: GetQueueUrlRequest = {
        QueueName: queueName,
      };
      const { QueueUrl } = await sqs.getQueueUrl(queueParams);

      // Get the approximate number of messages in the queue
      const queueAttributesParams: GetQueueAttributesRequest = {
        QueueUrl,
        AttributeNames: ['ApproximateNumberOfMessages'],
      };
      const queueAttributes = await sqsClient.send(new GetQueueAttributesCommand(queueAttributesParams));
      const numberOfMessages = queueAttributes.Attributes?.ApproximateNumberOfMessages;

      return numberOfMessages;
    } catch (error: any) {
      logService.error({ message: error.message, method: methodName, payload: { queueName } });
      throw new Error(`getNumberOfMessages - ${error.message}`);
    }
  }

  static async sqsSendMessageNoFifo({
    queueName,
    messageBody,
    delaySeconds = 1,
  }: {
    queueName: string;
    messageBody: string;
    delaySeconds: number;
  }) {
    const methodName = `${routeName}.sqsSendMessageNoFifo`;
    try {
      logService.info({ message: `Sending message to the queue no FIFO ${queueName}`, method: methodName });

      const queueParams: GetQueueUrlRequest = {
        QueueName: queueName,
      };
      const { QueueUrl } = await sqs.getQueueUrl(queueParams);

      const sendMessageParams: SendMessageRequest = {
        QueueUrl,
        MessageBody: messageBody,
        DelaySeconds: delaySeconds,
      };
      return await sqsClient.send(new SendMessageCommand(sendMessageParams));
    } catch (error: any) {
      logService.error({
        message: error.message,
        method: methodName,
        payload: { queueName, messageBody, delaySeconds },
      });
      throw new Error(`sqsSendMessageNoFifo - ${error.message}`);
    }
  }

  static async sqsSendMessageFifo({
    queueName,
    messageBody,
    messageGroupId,
  }: {
    queueName: string;
    messageBody: string;
    messageGroupId?: string;
  }) {
    const methodName = `${routeName}.sqsSendMessageFifo`;
    try {
      const methodName = `${routeName}.sqsSendMessageFifo`;
      logService.info({ message: `Sending message to the queue FIFO ${queueName}`, method: methodName });
      const queueParams: GetQueueUrlRequest = {
        QueueName: queueName,
      };
      const { QueueUrl } = await sqs.getQueueUrl(queueParams);

      const sendMessageParams: SendMessageRequest = {
        QueueUrl,
        MessageBody: messageBody,
        MessageGroupId: messageGroupId || randomUUID(),
      };
      const result: SendMessageCommandOutput = await sqsClient.send(new SendMessageCommand(sendMessageParams));

      if (!result.MessageId) throw new Error('MessageId não foi gerada');

      logService.info({ message: `Message sent to the queue ${queueName} - ${result.MessageId}`, method: methodName });

      return result;
    } catch (error: any) {
      logService.error({
        message: error.message,
        method: methodName,
        payload: { queueName, messageBody, messageGroupId },
      });
      throw new Error(`sqsSendMessageFifo - ${error.message}`);
    }
  }

  static async getMessagesFromQueue({
    queueUrl,
    visibilityTimeout,
    maxNumberOfMessages = 1,
  }: {
    queueUrl: string;
    visibilityTimeout?: number;
    maxNumberOfMessages?: number;
  }) {
    const methodName = `${routeName}.getMessagesFromQueue`;
    try {
      const params: ReceiveMessageCommandInput = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: maxNumberOfMessages, // Adjust the number of messages to retrieve
        WaitTimeSeconds: 0,
        MessageSystemAttributeNames: ['All'],
      };

      if (visibilityTimeout) {
        params['VisibilityTimeout'] = visibilityTimeout;
      }
      const response = await sqs.receiveMessage(params);
      return response.Messages || [];
    } catch (error: any) {
      logService.error({
        message: error.message,
        method: methodName,
        payload: { queueUrl, visibilityTimeout, maxNumberOfMessages },
      });
      throw new Error(`getMessagesFromQueue - ${error.message}`);
    }
  }

  static async getQueueAttributes({ queueUrl }: { queueUrl: string }) {
    const methodName = `${routeName}.getQueueAttributes`;
    try {
      const params: GetQueueAttributesCommandInput = {
        QueueUrl: queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
      };
      const response = await sqs.getQueueAttributes(params);
      return {
        availableMessages: response?.Attributes?.ApproximateNumberOfMessages,
        inFlightMessages: response?.Attributes?.ApproximateNumberOfMessagesNotVisible,
      };
    } catch (error: any) {
      logService.error({ message: error.message, method: methodName });
      throw new Error(`getQueueAttributes - ${error.message}`);
    }
  }

  static async purgeQueue({ queueName }: { queueName: string }) {
    try {
      const queueParams: GetQueueUrlRequest = {
        QueueName: queueName,
      };
      const { QueueUrl } = await sqs.getQueueUrl(queueParams);

      const params: PurgeQueueCommandInput = {
        QueueUrl: QueueUrl,
      };
      return await sqs.purgeQueue(params);
    } catch (error: any) {
      throw new Error(`purgeQueue - ${error.message}`);
    }
  }
}
