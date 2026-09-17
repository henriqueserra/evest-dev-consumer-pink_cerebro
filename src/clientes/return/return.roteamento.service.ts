import { AbstractRoteamentoService } from '../abstract.roteamento.service';
import { Demanda } from '../../libs/entities/demanda';
import { Message } from '@aws-sdk/client-sqs';
import { EverestErrorServices } from '../../libs/everest.error.services';
import { ReturnDistribuidosService } from './origem/return.distribuidos.service';
import { SqsServices } from '../../libs/sqs.service';
import { ReturnPortalUploadsService } from './origem/return.portal_uploads.service';

export class ReturnRoteamentoService extends AbstractRoteamentoService {
  constructor({
    demandaEntity,
    sqsMessage,
    queueUrl,
  }: {
    demandaEntity: Demanda;
    sqsMessage: Message;
    queueUrl: string;
  }) {
    super({ demandaEntity, sqsMessage, queueUrl });
  }

  async distribuidos(): Promise<void> {
    const methodName = `${this.className}.distribuidos`;
    try {
      const textosExtraidos = await this.textExtraction();
      if (!textosExtraidos) return;
      await new ReturnDistribuidosService({
        demandaEntity: this.demandaEntity,
        sqsMessage: this.sqsMessage,
        queueUrl: this.queueUrl,
      }).extrairDados(textosExtraidos);

      await SqsServices.removeMessageFromQueue({
        queueUrl: this.queueUrl,
        receiptHandle: this.sqsMessage.ReceiptHandle as string,
      });
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        pk: this.demandaEntity.pk,
        persist: false,
      });
    }
  }

  async portalUploads(): Promise<void> {
    const methodName = `${this.className}.portalUploads`;
    try {
      const textosExtraidos = await this.textExtraction();
      if (!textosExtraidos) return;
      await new ReturnPortalUploadsService({
        demandaEntity: this.demandaEntity,
        sqsMessage: this.sqsMessage,
        queueUrl: this.queueUrl,
      }).extrairDados(textosExtraidos);

      await SqsServices.removeMessageFromQueue({
        queueUrl: this.queueUrl,
        receiptHandle: this.sqsMessage.ReceiptHandle as string,
      });
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        pk: this.demandaEntity.pk,
        persist: false,
      });
    }
  }
}
