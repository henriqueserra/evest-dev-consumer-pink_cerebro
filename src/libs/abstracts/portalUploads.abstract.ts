import { Message } from '@aws-sdk/client-sqs';
import { Demanda } from '../entities/demanda';
import { EverestApoioService } from '../everest.apoio.service';
import { EverestDueDateService } from '../everest.dueDate.service';
import { EverestErrorServices } from '../everest.error.services';
import { EverestLogService } from '../everest.log.services';
import { ClienteRepo } from '../repos/cliente.repo';
import { ConfigRepo } from '../repos/config.repo';
import { DemandaRepo } from '../repos/demanda.repo';
import { DemandaObservacoesRepo } from '../repos/demanda_observacoes.repo';
import { PortalUploadsRepo } from '../repos/portal_uploads.repo';
import { UsersRepo } from '../repos/users.repo';
import { S3Service } from '../s3.service';
import { TipoDemanda } from '../entities/config_entities';

export abstract class PortalUploadsAbstract {
  readonly s3Key: string;
  readonly s3Bucket: string;
  readonly sqsMessage: Message;
  readonly queueUrl: string;
  readonly logService: EverestLogService = new EverestLogService();
  readonly className: string = this.constructor.name;
  constructor({
    s3Key,
    s3Bucket,
    sqsMessage,
    queueUrl,
  }: {
    s3Key: string;
    s3Bucket: string;
    sqsMessage: Message;
    queueUrl: string;
  }) {
    this.s3Key = s3Key;
    this.s3Bucket = s3Bucket;
    this.sqsMessage = sqsMessage;
    this.queueUrl = queueUrl;
  }

  abstract businessLogic(demandaEntity: Demanda): Promise<void>;

  async getMetadata(): Promise<{
    pk: string;
    created_by: string;
    createdAt: Date;
    dueDate: Date;
    dataCarimbo: Date;
    cliente: string;
    fileName: string;
    identificacao: string;
    processo: string;
    observacao: string;
    tipoDemanda: string;
  }> {
    const methodName = `${this.className}.getMetadata`;
    try {
      const attributes = (await S3Service.s3GetObjectAttributes({
        s3Bucket: this.s3Bucket,
        s3Key: this.s3Key,
      })) as any;

      const attributesUtf = Buffer.from(attributes?.metadata?.data as string, 'base64').toString('utf-8');
      const metadata = JSON.parse(attributesUtf);

      const pk = metadata.pk;
      if (!pk) throw new Error('PK not found');
      const created_by = metadata.created_by;
      const createdAt = new Date();
      const cliente = metadata.cliente;
      if (!cliente) throw new Error('Cliente not found');
      const clienteEntity = await new ClienteRepo().getCliente(cliente);
      if (!clienteEntity) throw new Error('Cliente not found');
      const dataCarimbo = await new EverestDueDateService().getDataCarimbo(createdAt.toISOString());
      const dueDate = await new EverestDueDateService().adicionaHoraUtil(
        dataCarimbo.toISOString(),
        clienteEntity.sla_horas || 9
      );
      const fileName = attributes?.fileName || this.s3Key.split('/').pop();
      const identificacao = metadata.identificacao || 'n/a';
      const processo = metadata.processo || 'n/a';
      const observacao = metadata.observacao || '';
      const tipoDemanda = metadata?.tipo || '';
      return {
        pk,
        created_by,
        createdAt,
        dueDate,
        dataCarimbo,
        cliente,
        fileName,
        identificacao,
        processo,
        observacao,
        tipoDemanda,
      };
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { s3Key: this.s3Key, s3Bucket: this.s3Bucket },
        persist: false,
      });
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  async copyFileToBucketDemanda(): Promise<void> {
    try {
      await S3Service.s3ObjectCopyUs({
        s3BucketOrigem: this.s3Bucket,
        s3KeyOrgiem: this.s3Key,
        s3BucketDestino: `everest.${(process.env.ENVIRONMENT as string).toLowerCase()}.demanda`,
        s3KeyDestino: this.s3Key,
      });
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`Erro ao copiar o arquivo: ${this.s3Key} para a pasta de demandas: ${errorMessage}`);
    }
  }

  async createDemanda({
    pk,
    created_by,
    createdAt,
    dueDate,
    dataCarimbo,
    cliente,
    fileName,
    identificacao,
    processo,
    observacao,
    tipoDemanda,
  }: {
    pk: string;
    created_by: string;
    createdAt: Date;
    dueDate: Date;
    dataCarimbo: Date;
    cliente: string;
    fileName: string;
    identificacao: string;
    processo: string;
    observacao: string;
    tipoDemanda: string;
  }): Promise<Demanda> {
    try {
      let tipoDemandaEntity: TipoDemanda = {} as TipoDemanda;
      if (tipoDemanda) {
        tipoDemandaEntity = await new ConfigRepo().getTipoDemanda(tipoDemanda);
      } else {
        tipoDemandaEntity = await new ConfigRepo().getTipoDemanda('TipificacaoOito');
      }
      const usersRepo = new UsersRepo();
      const userEntity = await usersRepo.getUser(created_by as string);
      const demandaRepo = new DemandaRepo();
      const statusDemandaEntity = await new ConfigRepo().getStatusDemanda('StatusCriado');
      const origemEntity = await new ConfigRepo().getOrigem('Portal Uploads');
      const clienteEntity = await new ClienteRepo().getCliente(cliente);
      const perfilDemandaEntity = await new ConfigRepo().getPerfilDemanda('TipificacaoOito');

      const payload = {
        created_by: userEntity,
        cliente: clienteEntity,
        data_carimbo: dataCarimbo.toISOString(),
        due_date: dueDate.toISOString(),
        origem: origemEntity,
        pk: pk,
        status_demanda: statusDemandaEntity,
        sla_horas: clienteEntity.sla_horas,
        identificacao: identificacao || 'n/a',
        processo: EverestApoioService.apenasNumeros(processo as string) || 'n/a',
        prioridade: false,
        tipo_demanda: tipoDemandaEntity,
        is_active: true,
        perfil_demanda: perfilDemandaEntity,
        usuario_atuando: null,
        cod_nup: null,
        updated_by: userEntity.email,
      } as Demanda;

      const demanda = await demandaRepo.saveDemanda(payload);
      const demandaObservacoesRepo = new DemandaObservacoesRepo(demanda);
      await demandaObservacoesRepo.create(observacao, userEntity);
      return demanda;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`Erro ao criar a demanda: ${errorMessage}`);
    }
  }

  async updatePortalUploads(pk: string): Promise<void> {
    try {
      const portalUploadsRepo = new PortalUploadsRepo();
      await portalUploadsRepo.updateMigrado(pk, true);
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`Erro ao atualizar o portal uploads: ${errorMessage}`);
    }
  }
}
