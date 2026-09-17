import { Message } from '@aws-sdk/client-sqs';
import { Dado, Demanda } from '../libs/entities/demanda';
import { EverestLogService } from '../libs/everest.log.services';
import { ConfigRepo } from '../libs/repos/config.repo';
import { DemandaDadosRepo } from '../libs/repos/demanda_dados.repo';
import { DemandaRepo } from '../libs/repos/demanda.repo';

export abstract class AbstractPortalUploadsService {
  readonly logService: EverestLogService = new EverestLogService();
  readonly className: string = this.constructor.name;
  demandaEntity!: Demanda;
  readonly sqsMessage!: Message;
  readonly queueUrl: string;
  constructor({
    demandaEntity,
    sqsMessage,
    queueUrl,
  }: {
    demandaEntity: Demanda;
    sqsMessage: Message;
    queueUrl: string;
  }) {
    this.demandaEntity = demandaEntity;
    this.sqsMessage = sqsMessage;
    this.queueUrl = queueUrl;
  }

  abstract extrairDados(textosExtraidos: string): Promise<void>;

  async criaDado({ demanda, tipoDado, value }: { demanda: Demanda; tipoDado: string; value: any }): Promise<void> {
    const methodName = `${this.className}.criaDado`;
    const dado = new Dado();
    const tipoDadoEntity = await new ConfigRepo().getTipoDado(tipoDado);
    dado.pk = demanda;
    dado.tipo_dado = tipoDadoEntity;
    dado.value = { value: value };
    dado.created_by = 'pink_e_cerebro@oito.srv.br';
    dado.updated_by = 'pink_e_cerebro@oito.srv.br';
    dado.is_active = true;
    dado.is_ai_created = true;
    dado.ai_value = { value: value };
    await new DemandaDadosRepo(demanda).createDemandaDado(dado);
    this.logService.info({
      message: `Dado ${tipoDado} - ${JSON.stringify(value)} criado com sucesso`,
      method: methodName,
    });
  }

  async setUsuarioAtuando(usuario: string): Promise<Demanda> {
    const methodName = `${this.className}.setUsuarioAtuando`;
    if (usuario === 'pink_e_cerebro@oito.srv.br') this.demandaEntity.was_pec = true;
    this.demandaEntity.usuario_atuando = usuario;
    const demandaEntity = await new DemandaRepo().updateStatus(this.demandaEntity);
    this.logService.info({
      message: `Usuario atuando ${usuario} setado com sucesso`,
      method: methodName,
    });
    return demandaEntity;
  }
}
