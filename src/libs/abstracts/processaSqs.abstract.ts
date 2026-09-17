import { EverestLogService } from '../everest.log.services';
import { Message } from '@aws-sdk/client-sqs';
import { getStatusFila } from '../repos/infraestrutura.repo';
import { SqsServices } from '../sqs.service';
import { S3Service } from '../s3.service';
import { EverestErrorServices } from '../everest.error.services';

export abstract class ProcessaSqsAbstract {
  readonly logService: EverestLogService = new EverestLogService();
  readonly className: string = this.constructor.name;
  readonly s3BucketPortalUploads: string = `everest.${process.env.ENVIRONMENT}.portaluploads`;
  constructor() {}

  abstract processaFila(): Promise<void>;
  abstract processaFilaDql(): Promise<void>;
  abstract processaMensagem(mensagemEmProcessamento: Message, queueUrl: string): Promise<void>;

  async obtemMensagensDaFila(queueName: string): Promise<void> {
    const methodName = `${this.className}.obtemMensagensDaFila`;
    const queueUrl = `https://sqs.us-east-1.amazonaws.com/028901343047/${queueName}`;

    do {
      const statusFila = await getStatusFila(queueName);
      if (!statusFila || statusFila?.ativo === false) return;
      const msg = (await SqsServices.getMessagesFromQueue({
        queueUrl,
        visibilityTimeout: (statusFila?.visibility_timeout as number) ?? 60,
        maxNumberOfMessages: statusFila?.max_number_of_messages ?? 1,
      })) as Message[];

      if (msg?.length === 0) break;

      await Promise.allSettled(
        msg.map(async (element) => {
          // Define um timeout máximo para a execução de processaMensagem (exemplo: 60 segundos)
          const timeoutMs = 60000; // 60.000 ms = 60 segundos
          await Promise.race([
            this.processaMensagem(element, queueUrl),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout ao processar mensagem da fila')), timeoutMs)
            ),
          ]);
        })
      );
    } while (true);
  }
  catch(error: any) {
    console.error(error);
  }

  async validacaoInicial(sqsMessage: Message): Promise<{
    origem: string;
    pk: string;
    cliente: string;
    codNup: string;
    body: Record<string, any>;
    createdBy: string;
  }> {
    const methodName = `${this.className}.validacaoInicial`;
    try {
      const body = JSON.parse(sqsMessage.Body as string);
      const pk = body?.pk || '';
      if (!pk) throw new Error('Pk not found');
      const origem = body?.origem as string;
      if (!origem) throw new Error('Origem not found');
      const cliente = body?.cliente as string;
      const codNup =
        body?.cod_nup ||
        body?.cod_citacao_dado ||
        body?.cod_regulatorio_dado ||
        body.cod_proconsumidor_dado ||
        body?.cod_movimentacao_digesto_publicacao;
      if (!codNup) throw new Error('Cod Nup not found');
      const createdBy = body?.created_by as string;
      if (!createdBy) throw new Error('Created By not found');
      return { origem, cliente, pk, codNup, body, createdBy };
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }
}
