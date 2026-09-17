import { ensureDataSourceInitialized } from '../../everest.orm.service';
import { Demanda, Observacao } from '../entities/demanda';
import { User } from '../entities/user';
import { EverestErrorServices } from '../everest.error.services';
import { EverestLogService } from '../everest.log.services';

export class DemandaObservacoesRepo {
  private logService: EverestLogService;
  private className: string;
  private demanda: Demanda;
  constructor(demanda: Demanda) {
    this.logService = new EverestLogService();
    this.className = this.constructor.name;
    this.demanda = demanda;
  }
  public async create(nova_observacao: string = '', userEntity: User) {
    const methodName = `${this.className}.create`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const demandaHistoricosRepository = dataSource.getRepository(Observacao);
      const newObservacao: Observacao = {
        mensagem: nova_observacao.trim(),
        created_by: userEntity.email,
        pk: this.demanda,
      };
      const demandaHistorico = demandaHistoricosRepository.create(newObservacao);
      await demandaHistoricosRepository.save(demandaHistorico);
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        pk: this.demanda.pk,
        payload: { nova_observacao, userEntity },
        persist: false,
      });
      throw new Error(errorMessage);
    }
  }
}
