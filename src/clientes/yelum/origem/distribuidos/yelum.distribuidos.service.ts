import { Message } from '@aws-sdk/client-sqs';
import { ensureDataSourceInitialized } from '../../../../everest.orm.service';
import { Demanda, Dado } from '../../../../libs/entities/demanda';
import { EverestErrorServices } from '../../../../libs/everest.error.services';
import { EverestLogService } from '../../../../libs/everest.log.services';
import { DemandaDadosRepo } from '../../../../libs/repos/demanda_dados.repo';
import { OpenAIService } from '../../../../openai/openai.service';
import { AbstractDistribuidosService } from '../../../abstract.distribuidos.service';
import z from 'zod';

const dadosEstruturadosZod = z.object({
  resumo: z.string(),
  nome_juiz: z.string(),
  cidade: z.string(),
  uf: z.string(),
  pedidos: z.object({
    dano_moral: z.array(
      z.object({
        pedido: z.string(),
        descricao: z.string(),
        valor: z.number(),
      })
    ),
    dano_material: z.array(
      z.object({
        pedido: z.string(),
        descricao: z.string(),
        valor: z.number(),
      })
    ),
  }),
  total_dano_moral: z.number(),
  total_dano_material: z.number(),
  audiencia: z.object({
    existe: z.boolean(),
    data_hora: z
      .string()
      .refine((val) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[\+\-]\d{2}:\d{2})$/.test(val), {
        message: 'data_hora deve ser uma string no formato ISO8601',
      }),
  }),
  liminar: z.object({
    existe: z.boolean(),
    prazo: z.string().regex(/^\d+$/, {
      message:
        'prazo deve ser uma string numérica contendo a quantidade de dias para atendimento do pedido. Se o valor for identificado em horas, convertaa para dias.',
    }),
    descricao: z.string(),
  }),
  tipo_justica: z.enum(['JUIZADO ESPECIAL', 'ORDINÁRIO', 'TRABALHISTA']),
  nome_advogado: z.string(),
  ordinal_da_jurisdicao: z.string().regex(/^\d+$/, {
    message: 'ordinal_da_jurisdicao deve ser uma string numérica contendo o ordinal da jurisdição/vara',
  }),
  tipo_do_processo: z.enum(['PROCESSO JURIDICO', 'PROCESSO JURIDICO SEM SINISTRO'], {
    message:
      'tipo_do_processo deve ser um dos seguintes valores: PROCESSO JURIDICO, PROCESSO JURIDICO SEM SINISTRO, analisar se o processo menciona o acionamento de sinistro/seguro.',
  }),
  lista_autores: z.array(
    z.object({
      nome: z.string({ message: 'nome_autor deve ser uma string contendo o nome do autor do processo' }),
    })
  ),
  lista_reus: z.array(
    z.object({
      nome: z.string({ message: 'nome_reu deve ser uma string contendo o nome do reu do processo' }),
    })
  ),
});

export class YelumDistribuidosService extends AbstractDistribuidosService {
  readonly logService: EverestLogService = new EverestLogService();
  readonly className: string = this.constructor.name;
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

      if (resumoBruto?.resumo) {
        await this.criaDado({ demanda: this.demandaEntity, tipoDado: 'resumo_processo', value: resumoBruto?.resumo });
      }

      if (resumoBruto?.audiencia && resumoBruto?.audencia?.existe) {
        await this.criaDado({
          demanda: this.demandaEntity,
          tipoDado: 'data_audiencia',
          value: resumoBruto?.audiencia?.data_hora,
        });
      }

      if (resumoBruto?.cidade) {
        await this.criaDado({
          demanda: this.demandaEntity,
          tipoDado: 'cidade',
          value: resumoBruto?.cidade,
        });
      }

      if (resumoBruto?.tipo_justica) {
        await this.criaDado({
          demanda: this.demandaEntity,
          tipoDado: 'tipo_justica',
          value: resumoBruto?.tipo_justica,
        });
      }

      if (resumoBruto?.nome_advogado) {
        await this.criaDado({
          demanda: this.demandaEntity,
          tipoDado: 'nome_advogado',
          value: resumoBruto?.nome_advogado,
        });
      }

      if (resumoBruto?.ordinal_da_jurisdicao) {
        await this.criaDado({
          demanda: this.demandaEntity,
          tipoDado: 'ordinal_da_jurisdicao',
          value: resumoBruto?.ordinal_da_jurisdicao,
        });
      }

      if (resumoBruto?.tipo_do_processo) {
        await this.criaDado({
          demanda: this.demandaEntity,
          tipoDado: 'tipo_do_processo',
          value: resumoBruto?.tipo_do_processo,
        });
      }

      if (resumoBruto?.lista_autores) {
        await this.criaDado({
          demanda: this.demandaEntity,
          tipoDado: 'lista_autores',
          value: resumoBruto?.lista_autores,
        });
      }

      if (resumoBruto?.lista_reus) {
        await this.criaDado({
          demanda: this.demandaEntity,
          tipoDado: 'lista_reus',
          value: resumoBruto?.lista_reus,
        });
      }
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      debugger;
    } finally {
    }
  }

  private async campoResumoBruto(textosExtraidos: string): Promise<any> {
    const methodName = `${this.className}.campoResumo`;
    try {
      const openaiService = new OpenAIService({
        openAiApiKey: process.env.OPENAI_API_KEY,
      });

      const tipoJusticaEntity = await new DemandaDadosRepo(this.demandaEntity).getDemandaDadoByTipoDado(
        'dado_geral_assunto'
      );
      let promptTipoJustica = '';
      if (tipoJusticaEntity) {
        promptTipoJustica = ` - Este json representa o assunto do processo informado no site do tribunal: ${JSON.stringify(
          tipoJusticaEntity.value.value
        )} - Dada esta informação e o conteúdo do processo, identifique o tipo de justiça do processo.`;
      }

      const response = await openaiService.askAIZod({
        instructions:
          'Você é um advogado brasileiro que tem a responsabilidade de extrair dados importantes de documentos jurídicos.',
        textoExtraido: textosExtraidos,
        prompt: `Faça um resumo deste documento jurídico com o máximo de detalhes possíveis, mas não ultrapassando 2000 caracteres.
          Aponte no resumo os seguintes dados:
          - Breve resumo do processo.
          - Nome do juiz ou juiz responsável pelo processo ou pela emissão do documento
          - Nome da cidade e UF
          - Lista de pedidos do processo classificados com pedidos de dado moral e pedidos de dano material
          - Valor total dos pedidos de dado moral e pedidos de dano material
          - existência ou não de audiencia marcada e caso exista, data e hora da audiencia
          - existência ou não de pedido de liminar ou tutela e caso exista, prazo para atendimento do pedido e descrição do mesmo
          - Nome do advogado que representa o autor do processo
          - Ordinal da jurisdição/vara
          - Tipo de justiça
          - Tipo de processo
          - Lista de autores do processo
          - Lista de reus do processo
          ${promptTipoJustica}`,
        format: dadosEstruturadosZod,
      });
      return response as any;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(errorMessage);
    }
  }
}
