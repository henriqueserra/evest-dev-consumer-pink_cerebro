import { Message } from '@aws-sdk/client-sqs';
import { Demanda } from '../../../libs/entities/demanda';
import { EverestLogService } from '../../../libs/everest.log.services';
import { EverestErrorServices } from '../../../libs/everest.error.services';
import { OpenAIService } from '../../../openai/openai.service';
import z from 'zod';
import { AbstractPortalUploadsService } from '../../abstract.portal_uploads.service';
import { ConfigRepo } from '../../../libs/repos/config.repo';
import { DemandaRepo } from '../../../libs/repos/demanda.repo';
import { EverestDueDateService } from '../../../libs/everest.dueDate.service';

const dadosEstruturadosZod = z.object({
  // número do processo padrão CNJ
  processo: z.string().describe('número do processo padrão CNJ ou processo Procon'),
  tipo: z.enum([
    'Citação/Intimação',
    'Processo trabalhista',
    'Ofício',
    'Procon',
    'Notificação extrajudicial',
    'Outros',
  ]),
});

export class ReturnPortalUploadsService extends AbstractPortalUploadsService {
  readonly logService: EverestLogService = new EverestLogService();
  readonly className: string = this.constructor.name;
  readonly;
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

  async extrairDados(textosExtraidos: string): Promise<void> {
    const methodName = `${this.className}.extrairDados`;
    try {
      const resumoBruto = await this.campoResumoBruto(textosExtraidos);

      if (resumoBruto?.tipo === 'Procon') {
        this.demandaEntity.identificacao = resumoBruto?.processo;
        this.demandaEntity.processo = 'n/a';
        const dataCarimbo = await new EverestDueDateService().getDataCarimbo(
          this.demandaEntity.created_at?.toISOString() as string
        );
        const dueDate = await new EverestDueDateService().adicionaHoraUtil(
          dataCarimbo.toISOString(),
          this.demandaEntity.cliente.sla_horas || 9
        );
        this.demandaEntity.data_carimbo = dataCarimbo.toISOString();
        this.demandaEntity.due_date = dueDate.toISOString();
        this.demandaEntity.tipo_demanda = await new ConfigRepo().getTipoDemanda('Cadastro Procon');
        this.demandaEntity.perfil_demanda = await new ConfigRepo().getPerfilDemanda('Cadastro Procon');
        this.demandaEntity.status_demanda = await new ConfigRepo().getStatusDemanda('EsteiraOito');
        this.demandaEntity = await new DemandaRepo().updateStatus(this.demandaEntity);
        this.logService.info({
          message: `Demanda ${this.demandaEntity.pk} atualizada para Procon com sucesso`,
          method: methodName,
        });
      } else if (resumoBruto?.tipo === 'Citação/Intimação') {
        let processo = resumoBruto?.processo?.replace(/\D/g, '');
        if (processo.length !== 20) throw new Error('Processo inválido');
        const dataCarimbo = await new EverestDueDateService().getDataCarimbo(
          this.demandaEntity.created_at?.toISOString() as string
        );
        const dueDate = await new EverestDueDateService().adicionaHoraUtil(
          dataCarimbo.toISOString(),
          this.demandaEntity.cliente.sla_horas || 9
        );
        this.demandaEntity.data_carimbo = dataCarimbo.toISOString();
        this.demandaEntity.due_date = dueDate.toISOString();
        this.demandaEntity.identificacao = 'n/a';
        this.demandaEntity.processo = processo;
        this.demandaEntity.tipo_demanda = await new ConfigRepo().getTipoDemanda('Cadastro Jurídico');
        this.demandaEntity.perfil_demanda = await new ConfigRepo().getPerfilDemanda('Cadastro Jurídico');
        this.demandaEntity.status_demanda = await new ConfigRepo().getStatusDemanda('EsteiraOito');
        this.demandaEntity.tipificacao_oito_usuario = 'pink_e_cerebro@oito.srv.br';
        this.demandaEntity = await new DemandaRepo().updateStatus(this.demandaEntity);
        this.logService.info({
          message: `Demanda ${this.demandaEntity.pk} atualizada para Cadastro Jurídico com sucesso`,
          method: methodName,
        });
      } else if (resumoBruto?.tipo === 'Ofício') {
        let processo = resumoBruto?.processo?.replace(/\D/g, '');
        if (processo.length !== 20) throw new Error('Processo inválido');
        const dataCarimbo = await new EverestDueDateService().getDataCarimbo(
          this.demandaEntity.created_at?.toISOString() as string
        );
        const dueDate = await new EverestDueDateService().adicionaHoraUtil(
          dataCarimbo.toISOString(),
          this.demandaEntity.cliente.sla_horas || 9
        );
        this.demandaEntity.data_carimbo = dataCarimbo.toISOString();
        this.demandaEntity.due_date = dueDate.toISOString();
        this.demandaEntity.identificacao = 'n/a';
        this.demandaEntity.processo = processo;
        this.demandaEntity.tipo_demanda = await new ConfigRepo().getTipoDemanda('Cadastro Jurídico');
        this.demandaEntity.perfil_demanda = await new ConfigRepo().getPerfilDemanda('Cadastro Jurídico');
        this.demandaEntity.status_demanda = await new ConfigRepo().getStatusDemanda('EsteiraOito');
        this.demandaEntity.tipificacao_oito_usuario = 'pink_e_cerebro@oito.srv.br';
        this.demandaEntity = await new DemandaRepo().updateStatus(this.demandaEntity);
        this.logService.info({
          message: `Demanda ${this.demandaEntity.pk} atualizada para Cadastro Jurídico com sucesso`,
          method: methodName,
        });
      }
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({ message: errorMessage, method: methodName, persist: false });
      // debugger;
    } finally {
    }
  }

  private async campoResumoBruto(textosExtraidos: string): Promise<any> {
    const methodName = `${this.className}.campoResumo`;
    try {
      const openaiService = new OpenAIService({
        openAiApiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openaiService.askAIZod({
        instructions:
          'Você é um advogado brasileiro que tem a responsabilidade de extrair dados importantes de documentos jurídicos.',
        textoExtraido: textosExtraidos,
        prompt: `Faça uma análise deste documento e identifique o "tipo" deste documento. Os tipos possíveis são:
        Citação/Intimação;
        Processo trabalhista;
        Ofício;
        Procon;
        Notificação extrajudicial;
        Outros;
        
        Se o tipo for "Citação/Intimação", "Processo trabalhista" ou "Ofício" , processo = número do processo no padrão CNJ.
        Se o tipo for "Procon", processo = número Procon.
        Se o tipo for "Notificação extrajudicial" ou "Outros", processo = n/a e identificacao = n/a.`,
        format: dadosEstruturadosZod,
      });
      return response as any;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(errorMessage);
    }
  }
}
