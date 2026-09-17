import { Equal } from 'typeorm';
import { Arquivo, Demanda } from '../entities/demanda';
import { EverestErrorServices } from '../everest.error.services';
import { EverestLogService } from '../everest.log.services';
import { DemandaRepo } from './demanda.repo';
import { ensureDataSourceInitialized } from '../../everest.orm.service';

export class DemandaArquivosRepo {
  private logService: EverestLogService;
  private className: string;
  private demanda: Demanda;

  constructor(demanda: Demanda) {
    this.logService = new EverestLogService();
    this.className = this.constructor.name;
    this.demanda = demanda;
  }

  async getArquivo(pk_arquivo: string) {
    const methodName = `${this.className}.getArquivo`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const repository = dataSource.getRepository(Arquivo);
      const response = await repository.findOne({ where: { pk_arquivo: Equal(pk_arquivo) }, relations: ['pk'] });
      return response;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({ message: errorMessage, method: methodName, pk: this.demanda.pk, persist: false });
      throw Error;
    }
  }

  async getArquivosByDemanda() {
    const methodName = `${this.className}.getArquivosByDemanda`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const repository = dataSource.getRepository(Arquivo);
      const response = await repository.find({ where: { pk: Equal(this.demanda.pk) }, relations: ['pk'] });
      return response;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({ message: errorMessage, method: methodName, pk: this.demanda.pk, persist: false });
      throw Error;
    }
  }

  async create(demandaArquivo: Arquivo) {
    const methodName = `${this.className}.create`;
    try {
      if (!this.demanda.pk) {
        throw new Error('Demanda not found');
      }
      const demanda = await new DemandaRepo().getDemanda(this.demanda.pk as string);
      const dataSource = await ensureDataSourceInitialized();
      const repository = dataSource.getRepository(Arquivo);
      const response = await repository.upsert(demandaArquivo, ['pk', 's3_key']);
      this.logService.info({
        message: `DemandaArquivo ${demandaArquivo.s3_key} criado com sucesso`,
        method: methodName,
      });
      // Busca usando apenas o pk (uuid) da demanda em vez do objeto completo
      const novoDemandaArquivo = await repository.findOne({
        where: {
          pk: Equal(demanda.pk),
          s3_key: demandaArquivo.s3_key as string,
        },
        relations: ['pk'],
      });
      return novoDemandaArquivo;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: demandaArquivo,
        pk: this.demanda.pk,
        persist: false,
      });
      throw Error;
    }
  }

  async update(demandaArquivo: Arquivo) {
    const methodName = `${this.className}.update`;
    try {
      if (!this.demanda.pk) {
        throw new Error('Demanda not found');
      }
      if (!demandaArquivo.pk_arquivo) {
        throw new Error('DemandaArquivo not found');
      }
      const dataSource = await ensureDataSourceInitialized();
      const demandaDadoRepository = dataSource.getRepository(Arquivo);
      const response = await demandaDadoRepository.update(demandaArquivo.pk_arquivo as string, demandaArquivo);
      this.logService.info({
        message: `DemandaArquivo ${demandaArquivo.s3_key} atualizado com sucesso`,
        method: methodName,
      });
      return response;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: demandaArquivo,
        pk: this.demanda.pk,
      });
      throw Error;
    }
  }

  async delete(demandaArquivo: Arquivo): Promise<void> {
    const methodName = `${this.className}.delete`;
    try {
      if (!this.demanda.pk) {
        throw new Error('Demanda not found');
      }
      const dataSource = await ensureDataSourceInitialized();
      const demandaDadoRepository = dataSource.getRepository(Arquivo);
      await demandaDadoRepository.remove(demandaArquivo);

      this.logService.info({ message: `Dado ${demandaArquivo.s3_key} deletado com sucesso`, method: methodName });
    } catch (error: any) {
      await this.logService.error({ message: error.message, method: methodName, payload: { demandaArquivo } });
      throw Error;
    }
  }
}
