import { ensureDataSourceInitialized } from '../../everest.orm.service';
import { Origem, PerfilDemanda, StatusDemanda, TipoDado, TipoDemanda } from '../entities/config_entities';
import { EverestLogService } from '../everest.log.services';

export class ConfigRepo {
  private logService: EverestLogService = new EverestLogService();
  private className: string = this.constructor.name;
  constructor() {}

  async getTipoDados(): Promise<TipoDado[]> {
    const dataSource = await ensureDataSourceInitialized();
    const tipoDadoRepo = dataSource.getRepository(TipoDado);
    const tipoDados = await tipoDadoRepo.find({ where: {}, order: { tipo_dado: 'ASC' } });
    return tipoDados;
  }

  async getTipoDado(tipoDadoName: string): Promise<TipoDado> {
    const dataSource = await ensureDataSourceInitialized();
    const tipoDadoRepo = dataSource.getRepository(TipoDado);
    const tipoDado = await tipoDadoRepo.findOne({ where: { tipo_dado: tipoDadoName } });
    if (!tipoDado) throw new Error(`Tipo dado: ${tipoDadoName} não encontrado`);
    return tipoDado ?? ({} as TipoDado);
  }

  async getOrigems(): Promise<Origem[]> {
    const dataSource = await ensureDataSourceInitialized();
    const tipoOrigemRepo = dataSource.getRepository(Origem);
    const tipoOrigems = await tipoOrigemRepo.find({ where: {}, order: { origem: 'ASC' } });
    return tipoOrigems;
  }

  async getOrigem(origemName: string): Promise<Origem> {
    const dataSource = await ensureDataSourceInitialized();
    const tipoOrigemRepo = dataSource.getRepository(Origem);
    const tipoOrigem = await tipoOrigemRepo.findOne({ where: { origem: origemName } });
    if (!tipoOrigem) throw new Error(`Origem: ${origemName} não encontrado`);
    return tipoOrigem;
  }

  async getPerfilDemandas(): Promise<PerfilDemanda[]> {
    const dataSource = await ensureDataSourceInitialized();
    const tipoRepo = dataSource.getRepository(PerfilDemanda);
    const tipos = await tipoRepo.find({ where: {}, order: { perfil_demanda: 'ASC' } });
    return tipos;
  }

  async getPerfilDemanda(perfilDemandaName: string): Promise<PerfilDemanda> {
    const dataSource = await ensureDataSourceInitialized();
    const tipoRepo = dataSource.getRepository(PerfilDemanda);
    const tipo = await tipoRepo.findOne({ where: { perfil_demanda: perfilDemandaName } });
    if (!tipo) throw new Error(`Perfil demanda: ${perfilDemandaName} não encontrado`);
    return tipo;
  }

  async getTipoDemandas(): Promise<TipoDemanda[]> {
    const dataSource = await ensureDataSourceInitialized();
    const tipoRepo = dataSource.getRepository(TipoDemanda);
    const tipos = await tipoRepo.find({ where: {}, order: { tipo_demanda: 'ASC' } });
    return tipos;
  }

  async getTipoDemanda(tipoDemandaName: string): Promise<TipoDemanda> {
    const dataSource = await ensureDataSourceInitialized();
    const tipoRepo = dataSource.getRepository(TipoDemanda);
    const tipo = await tipoRepo.findOne({ where: { tipo_demanda: tipoDemandaName } });
    if (!tipo) throw new Error(`Tipo demanda: ${tipoDemandaName} não encontrado`);
    return tipo;
  }

  async getStatusDemandas(): Promise<StatusDemanda[]> {
    const dataSource = await ensureDataSourceInitialized();
    const statusRepo = dataSource.getRepository(StatusDemanda);
    const statuss = await statusRepo.find({ where: {}, order: { status_demanda: 'ASC' } });
    return statuss;
  }

  async getStatusDemanda(statusDemandaName: string): Promise<StatusDemanda> {
    const dataSource = await ensureDataSourceInitialized();
    const statusRepo = dataSource.getRepository(StatusDemanda);
    const status = await statusRepo.findOne({ where: { status_demanda: statusDemandaName } });
    if (!status) throw new Error(`Status demanda: ${statusDemandaName} não encontrado`);
    return status ?? ({} as StatusDemanda);
  }
}
