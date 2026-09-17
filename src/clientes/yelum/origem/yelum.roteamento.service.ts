import { Message } from '@aws-sdk/client-sqs';
import { Demanda } from '../../../libs/entities/demanda';
import { EverestErrorServices } from '../../../libs/everest.error.services';
import { SqsServices } from '../../../libs/sqs.service';
import { AbstractRoteamentoService } from '../../abstract.roteamento.service';
import { ReturnDistribuidosService } from '../../return/origem/return.distribuidos.service';
import { ReturnPortalUploadsService } from '../../return/origem/return.portal_uploads.service';
import { YelumDistribuidosService } from './distribuidos/yelum.distribuidos.service';

export class YelumRoteamentoService extends AbstractRoteamentoService {
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
      await new YelumDistribuidosService({
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
