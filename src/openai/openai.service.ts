import OpenAI from 'openai';
import { EverestLogService } from '../libs/everest.log.services';
import { EverestErrorServices } from '../libs/everest.error.services';
import { zodResponseFormat } from 'openai/helpers/zod';
import z from 'zod';

export class OpenAIService {
  readonly logService: EverestLogService = new EverestLogService();
  readonly className: string = this.constructor.name;
  readonly openaiClient: OpenAI;
  constructor({ openAiApiKey }: { openAiApiKey: string }) {
    this.openaiClient = new OpenAI({
      apiKey: openAiApiKey,
    });
  }

  async listAvailableModels(): Promise<string[]> {
    const methodName = `${this.className}.listAvailableModels`;
    try {
      const response = await this.openaiClient.models.list();
      // A resposta normalmente está em response.data, que é um array de objetos model
      let models = (response.data || []).map((model: any) => model.id);
      models = models.filter((model: string) => model.includes('gpt-5'));
      return models;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      this.logService.error({
        message: `Erro ao listar os models disponíveis: ${errorMessage}`,
        method: methodName,
        persist: true,
        payload: { error },
      });
      throw new Error(errorMessage);
    }
  }

  async askAI({
    instructions,
    textoExtraido,
    prompt,
  }: {
    instructions: string;
    textoExtraido: string;
    prompt: string;
  }): Promise<any> {
    try {
      // Define o schema Zod para a resposta
      const ResumoPeticaoSchema = z.object({
        resumo: z.string(),
        juiz: z.string(),
        comarca: z.string(),
        uf: z.string(),
        pedidos: z.object({
          dano_moral: z.array(z.string()),
          dano_material: z.array(z.string()),
        }),
        total_dano_moral: z.number(),
        total_dano_material: z.number(),
        audiencia: z.object({
          existe: z.boolean(),
          data_hora: z.string(),
        }),
        liminar: z.object({
          existe: z.boolean(),
          prazo: z.string(),
          descricao: z.string(),
        }),
      });

      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: `${textoExtraido}\n\n${prompt}` },
        ],
        response_format: zodResponseFormat(ResumoPeticaoSchema, 'ResumoPeticao'),
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia da OpenAI');
      }
      return JSON.parse(content);
    } catch (error) {
      console.error('AI ERROR:', error);
      throw error;
    }
  }

  async askAIZod({
    instructions,
    textoExtraido,
    prompt,
    format,
  }: {
    instructions: string;
    textoExtraido: string;
    prompt: string;
    format: z.ZodSchema;
  }): Promise<any> {
    try {
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: `${textoExtraido}\n\n${prompt}` },
        ],
        response_format: zodResponseFormat(format, 'dados_estruturados'),
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia da OpenAI');
      }
      return JSON.parse(content);
    } catch (error) {
      console.error('AI ERROR:', error);
      throw error;
    }
  }
}
