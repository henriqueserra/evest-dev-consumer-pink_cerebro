import { ensureDataSourceInitialized } from '../../everest.orm.service';
import { Demanda } from '../entities/demanda';
import { EverestDueDateService } from '../everest.dueDate.service';
import { EverestErrorServices } from '../everest.error.services';
import { EverestLogService } from '../everest.log.services';
import { ClienteRepo } from './cliente.repo';
import { Equal } from 'typeorm';

export class DemandaRepo {
  private logService: EverestLogService;
  private className: string;
  constructor() {
    this.logService = new EverestLogService();
    this.className = this.constructor.name;
  }

  async getDemanda(pk: string): Promise<Demanda> {
    const methodName = `${this.className}.getDemanda`;
    try {
      // this.logService.info({ message: `Buscando demanda com pk: ${pk}`, method: methodName });
      const dataSource = await ensureDataSourceInitialized();
      const demandaRepo = dataSource.getRepository(Demanda);
      const demanda = await demandaRepo.findOne({
        where: { pk },
        relations: [
          'cliente',
          'status_demanda',
          'tipo_demanda',
          'origem',
          'perfil_demanda',
          'created_by',
          'historico',
          'observacao',
          // 'arquivos',
          // 'dados',
          // 'api',
        ],
      });
      if (!demanda) return {} as Demanda;
      return demanda as Demanda;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { pk },
        pk: pk,
        persist: false,
      });
      debugger;
      throw new Error(errorMessage);
    }
  }

  async saveDemanda(demanda: Demanda): Promise<Demanda> {
    const methodName = `${this.className}.saveDemanda`;
    try {
      demanda = await this.saneiaDemanda(demanda);
      const dataSource = await ensureDataSourceInitialized();
      const demandaRepo = dataSource.getRepository(Demanda);
      return await demandaRepo.save(demanda);
    } catch (error: any) {
      throw error;
    }
  }

  async updateStatus(demanda: Demanda): Promise<Demanda> {
    const methodName = `${this.className}.updateStatus`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const demandaRepo = dataSource.getRepository(Demanda);
      await demandaRepo.upsert(demanda, ['pk']);
      demanda = await this.getDemanda(demanda.pk as string);
      return demanda;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { demanda },
        pk: demanda.pk,
        persist: false,
      });
      debugger;
      throw new Error(errorMessage);
    }
  }

  async deleteDemanda(pk: string): Promise<void> {
    const methodName = `${this.className}.deleteDemanda`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const demandaRepository = dataSource.getRepository(Demanda);
      await demandaRepository.delete(pk);
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        persist: true,
        payload: { pk },
      });
      debugger;
      throw new Error(errorMessage);
    }
  }

  async getDadosParaConsulta(demanda: Demanda) {
    const methodName = `${this.className}.getDadosParaConsulta`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const dadosParaConsulta = await dataSource.query(
        `SELECT * FROM ${process.env.ENVIRONMENT?.toLowerCase()}.get_demanda_completa($1);`,
        [demanda.pk]
      );
      const cliente = await new ClienteRepo().getCliente(demanda.cliente.cliente);
      const clientePropriedades =
        process.env.ENVIRONMENT === 'Prod' ? cliente?.propriedades_prod : cliente?.propriedades_dev;
      return { ...dadosParaConsulta[0], picklists: clientePropriedades?.picklists || [] };
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { demanda },
        pk: demanda.pk,
        persist: false,
      });
      debugger;
      throw new Error(errorMessage);
    }
  }

  async getDemandasByStatus(statusDemandas: string[]) {
    const methodName = `${this.className}.getDemandasByStatus`;
    try {
      let demandasFinais: Demanda[] = [];
      const dataSource = await ensureDataSourceInitialized();
      const demandaRepository = dataSource.getRepository(Demanda);
      for (const statusDemanda of statusDemandas) {
        const demandas = await demandaRepository.find({
          where: { status_demanda: Equal(statusDemanda), is_active: true },
          relations: ['cliente', 'status_demanda', 'tipo_demanda', 'origem', 'perfil_demanda', 'created_by'],
        });
        demandasFinais = [...demandasFinais, ...demandas];
      }
      return demandasFinais;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({ message: errorMessage, method: methodName, persist: false });
      throw new Error(`${methodName} :: ${error.message}`);
    }
  }

  private async saneiaDemanda(demanda: Demanda) {
    const methodName = `${this.className}.saneiaDemanda`;
    try {
      if (!demanda.due_date) {
        demanda.data_carimbo = (
          await new EverestDueDateService().getDataCarimbo(demanda.created_at?.toISOString() as string)
        ).toISOString();
        demanda.due_date = (
          await new EverestDueDateService().adicionaHoraUtil(
            demanda.created_at?.toISOString() as string,
            demanda.cliente.sla_horas || 9
          )
        ).toISOString();
      }
      if (!demanda.processo) demanda.processo = 'n/a';
      if (!demanda.identificacao) demanda.identificacao = 'n/a';
      return demanda;
    } catch (error: any) {
      throw error;
    }
  }

  async getDemandasByCodNup(codNup: string) {
    const methodName = `${this.className}.getDemandasByCodNup`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const demandaRepository = dataSource.getRepository(Demanda);
      const demandas = await demandaRepository.find({ where: { cod_nup: codNup, is_active: true } });
      return demandas;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({ message: errorMessage, method: methodName, persist: true, payload: { codNup } });
      debugger;
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }
}
