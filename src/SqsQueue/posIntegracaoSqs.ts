import { Message } from '@aws-sdk/client-sqs';
import { ProcessaSqsAbstract } from '../libs/abstracts/processaSqs.abstract';
import { EverestErrorServices } from '../libs/everest.error.services';
import { DemandaRepo } from '../libs/repos/demanda.repo';
import { ReturnRoteamentoService } from '../clientes/return/return.roteamento.service';
import { Demanda } from '../libs/entities/demanda';
import { YelumRoteamentoService } from '../clientes/yelum/origem/yelum.roteamento.service';
import { SqsServices } from '../libs/sqs.service';

export class PosIntegracaoSqs extends ProcessaSqsAbstract {
  constructor() {
    super();
  }

  async processaFila(): Promise<void> {
    const methodName = `${this.className}.processaFila`;
    try {
      const queueName = `Everest${process.env.ENVIRONMENT}PosIntegracaoSqs.fifo`;
      await this.obtemMensagensDaFila(queueName);
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      debugger;
    }
  }

  async processaFilaDql(): Promise<void> {
    const methodName = `${this.className}.processaFila`;
    try {
      const queueName = `Everest${process.env.ENVIRONMENT}PosIntegracaoSqsDql.fifo`;
      await this.obtemMensagensDaFila(queueName);
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      debugger;
    }
  }

  async processaMensagem(sqsMessage: Message, queueUrl: string): Promise<void> {
    const methodName = `${this.className}.processaMensagem`;
    let demandaEntity: Demanda = {} as Demanda;
    try {
      const body = JSON.parse(sqsMessage.Body as string);
      const pk = body.pk;
      if (!pk) throw new Error('PK não encontrado no body');
      demandaEntity = await new DemandaRepo().getDemanda(pk as string);
      if (!demandaEntity) throw new Error('Demanda não encontrada');
      this.logService.info({
        message: `
        
        
Demanda ${demandaEntity.pk} iniciada...`,
        method: methodName,
      });

      switch (demandaEntity?.cliente?.cliente) {
        case 'ReturnCadastro':
          demandaEntity.usuario_atuando = 'pink_e_cerebro@oito.srv.br';
          demandaEntity = await new DemandaRepo().updateStatus(demandaEntity);
          await new ReturnRoteamentoService({ demandaEntity, sqsMessage, queueUrl }).roteamento();
          break;
        case 'Yelum':
          demandaEntity.usuario_atuando = 'pink_e_cerebro@oito.srv.br';
          demandaEntity = await new DemandaRepo().updateStatus(demandaEntity);
          await new YelumRoteamentoService({ demandaEntity, sqsMessage, queueUrl }).roteamento();
          break;
        default:
          this.logService.error({
            message: `Cliente ${demandaEntity?.cliente?.cliente} não implementado`,
            method: methodName,
            persist: false,
            payload: { sqsMessage },
          });
          await SqsServices.removeMessageFromQueue({
            queueUrl: queueUrl,
            receiptHandle: sqsMessage.ReceiptHandle as string,
          });
          break;
      }
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      this.logService.error({ message: errorMessage, method: methodName, persist: true, payload: { sqsMessage } });
    } finally {
      demandaEntity.usuario_atuando = null;
      demandaEntity = await new DemandaRepo().updateStatus(demandaEntity);
      this.logService.info({
        message: `Demanda ${demandaEntity.pk} finalizada...`,
        method: methodName,
      });
    }
  }
}
