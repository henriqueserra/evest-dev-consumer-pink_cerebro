import { Message } from '@aws-sdk/client-sqs';
import { Dado, Demanda } from '../../../libs/entities/demanda';
import { EverestLogService } from '../../../libs/everest.log.services';
import { AbstractDistribuidosService } from '../../abstract.distribuidos.service';
import { EverestErrorServices } from '../../../libs/everest.error.services';
import { OpenAIService } from '../../../openai/openai.service';
import z from 'zod';
import { DemandaDadosRepo } from '../../../libs/repos/demanda_dados.repo';
import { ensureDataSourceInitialized } from '../../../everest.orm.service';

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
  contratos_mencionados: z.array(
    z.object({
      bindingId: z.string(),
    })
  ),
  tipo_justica: z.enum(['JUIZADO ESPECIAL CÍVEL', 'JUSTIÇA COMUM', 'JUSTIÇA DO TRABALHO']),
});

export class ReturnDistribuidosService extends AbstractDistribuidosService {
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

      await this.criaDado({
        demanda: this.demandaEntity,
        tipoDado: 'tipo_acao',
        value: 'AÇÃO INDENIZATÓRIA / DECLARATÓRIA',
      });

      // NÃO RECONHECIMENTO DO DÉBITO

      await this.criaDado({
        demanda: this.demandaEntity,
        tipoDado: 'causa_pedir',
        value: 'NÃO RECONHECIMENTO DO DÉBITO',
      });

      if (resumoBruto?.resumo) {
        await this.criaDado({ demanda: this.demandaEntity, tipoDado: 'detalhe_objeto', value: resumoBruto?.resumo });
      }
      if (resumoBruto?.contratos_mencionados && resumoBruto?.contratos_mencionados?.length > 0) {
        let selectedContratos: string[] = [];
        const contratosEntity = await new DemandaDadosRepo(this.demandaEntity).getDemandaDadoByTipoDado('contrato');
        contratosEntity?.value?.value?.forEach((contratoAlvo: any) => {
          const encontrado = resumoBruto?.contratos_mencionados?.find(
            (contratoMencionado: any) =>
              contratoMencionado.bindingId === contratoAlvo?.bindingId?.toString() ||
              contratoMencionado.bindingId === contratoAlvo?.ContratoOriginal
          );
          if (encontrado) {
            selectedContratos.push(contratoAlvo?.bindingId?.toString());
          }
        });
        if (selectedContratos && selectedContratos.length > 0) {
          selectedContratos.forEach(async (contrato: string) => {
            for (const contratoAlvo of contratosEntity?.value?.value) {
              if (contratoAlvo.bindingId.toString() === contrato) {
                contratoAlvo.selected = true;
              }
            }
            contratosEntity.ai_value = contratosEntity.value;
            const dataSource = await ensureDataSourceInitialized();
            const repo = await dataSource.getRepository(Dado);
            await repo.save(contratosEntity);
          });
        }
      }

      if (resumoBruto?.audiencia && resumoBruto?.audencia?.existe) {
        await this.criaDado({
          demanda: this.demandaEntity,
          tipoDado: 'data_audiencia',
          value: resumoBruto?.audiencia?.data_hora,
        });
      }

      if (resumoBruto?.total_dano_material >= 0 && resumoBruto?.total_dano_moral >= 0) {
        await this.criaDado({
          demanda: this.demandaEntity,
          tipoDado: 'valor_causa',
          value: resumoBruto?.total_dano_material + resumoBruto?.total_dano_moral,
        });
      }

      if (resumoBruto?.tipo_justica) {
        await this.criaDado({
          demanda: this.demandaEntity,
          tipoDado: 'tipo_justica',
          value: resumoBruto?.tipo_justica,
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

      const contratoEntity = await new DemandaDadosRepo(this.demandaEntity).getDemandaDadoByTipoDado('contrato');

      const contratos = contratoEntity?.value?.value?.map((contrato: any) => {
        return {
          bindingId: contrato.bindingId,
          contrato_original: contrato.ContratoOriginal,
          numero_divida: contrato.NumDivida,
          saldo_original: contrato.SaldoOriginal,
        };
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

      let promptContratos = '';

      if (contratos && contratos?.length > 0) {
        promptContratos = ` - Este json representa dos dados dos contratos de empréstimo possuídos pelo autor deste processo.Quero saber o bindingId dos contratos mencionados no texto da peticao inicial. Pode ser necessário analisar o contrato_inicial (que pode estar formatado com ".", "-" ou "/", então analise os valores como apenas números), numero_divida ou o saldo_original para localizar quais os contratos mencionados no texto da peticao inicial: ${JSON.stringify(
          contratos
        )}`;
      }

      const response = await openaiService.askAIZod({
        instructions:
          'Você é um advogado brasileiro que tem a responsabilidade de extrair dados importantes de documentos jurídicos.',
        textoExtraido: textosExtraidos,
        prompt: `Faça um resumo deste documento jurídico com o máximo de detalhes possíveis, mas não ultrapassando 4000 caracteres.
          Aponte no resumo os seguintes dados:
          - Breve resumo do processo.
          - Nome do juiz ou juiz responsável pelo processo ou pela emissão do documento
          - Nome da cidade e UF
          - Lista de pedidos do processo classificados com pedidos de dado moral e pedidos de dano material
          - Valor total dos pedidos de dado moral e pedidos de dano material
          - existência ou não de audiencia marcada e caso exista, data e hora da audiencia
          - existência ou não de pedido de liminar ou tutela e caso exista, prazo para atendimento do pedido e descrição do mesmo
          ${promptContratos}
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
