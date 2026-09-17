import { Message } from '@aws-sdk/client-sqs';
import { Demanda } from '../libs/entities/demanda';
import { EverestErrorServices } from '../libs/everest.error.services';
import { EverestLogService } from '../libs/everest.log.services';
import { ReturnRoteamentoService } from './return/return.roteamento.service';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { SqsServices } from '../libs/sqs.service';

export abstract class AbstractRoteamentoService {
  readonly logService: EverestLogService = new EverestLogService();
  readonly className: string = this.constructor.name;
  readonly demandaEntity!: Demanda;
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

  abstract distribuidos(): Promise<void>;
  abstract portalUploads(): Promise<void>;

  async roteamento(): Promise<void> {
    const methodName = `${this.className}.roteamento`;
    try {
      switch (this.demandaEntity.origem.origem) {
        case 'Distribuídos':
          await this.distribuidos();
          break;
        case 'Portal Uploads':
          await this.portalUploads();
          break;
        default:
          await this.logService.error({
            message: `Origem ${this.demandaEntity.origem.origem} não implementada`,
            method: methodName,
            persist: false,
            payload: { demandaEntity: this.demandaEntity },
          });
          await SqsServices.removeMessageFromQueue({
            queueUrl: this.queueUrl,
            receiptHandle: this.sqsMessage.ReceiptHandle as string,
          });
          break;
      }
      // debugger;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      debugger;
    }
  }

  async textExtraction(): Promise<string> {
    let axiosRequest: AxiosRequestConfig = {} as AxiosRequestConfig;
    let axiosResponse: AxiosResponse = {} as AxiosResponse;
    const methodName = `${this.className}.textExtraction`;
    try {
      axiosRequest = {
        method: 'POST',
        url: `http://3.215.174.114:3005/dev/ia/extract_text/extracao_texto_demanda_everest`,
        data: {
          pk: this.demandaEntity.pk as string,
        },
      };
      axiosResponse = await axios.request(axiosRequest);
      if (axiosResponse?.data?.success) {
        this.logService.info({
          message: `${this.demandaEntity.pk} - Texto extraído com sucesso - ${axiosResponse?.data?.textosExtraidos?.length} caracteres`,
          method: methodName,
        });
        const textosExtraidos = axiosResponse?.data?.textosExtraidos;
        const tamanhoTextosExtraidos = textosExtraidos?.length;
        if (tamanhoTextosExtraidos > 306419) {
          await this.logService.error({
            message: 'Texto extraído é muito grande',
            method: methodName,
            persist: false,
            payload: {},
            pk: this.demandaEntity.pk,
          });
          return '';
        }
        return textosExtraidos;
      } else {
        await this.logService.error({
          message: 'Texto não foi extraído com sucesso',
          method: methodName,
          persist: true,
          payload: { axiosRequest, axiosResponse },
        });
        return '';
      }
    } catch (error) {
      const axiosError: AxiosError = error as AxiosError;
      const errorMessage = EverestErrorServices.getError(axiosError);
      await this.logService.error({
        message: 'Texto não foi extraído com sucesso',
        method: methodName,
        persist: true,
        payload: { axiosRequest, axiosError },
      });
      return '';
    }
  }
}
