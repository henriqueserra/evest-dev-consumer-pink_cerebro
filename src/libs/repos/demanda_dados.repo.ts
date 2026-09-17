import { Equal } from 'typeorm';
import { Dado, Demanda } from '../entities/demanda';
import { EverestErrorServices } from '../everest.error.services';
import { EverestLogService } from '../everest.log.services';
import { ensureDataSourceInitialized } from '../../everest.orm.service';
import { TipoDado } from '../entities/config_entities';
import _ from 'lodash';
import { DemandaRepo } from './demanda.repo';
import { EverestApoioService } from '../everest.apoio.service';

export class DemandaDadosRepo {
  private logService: EverestLogService;
  private className: string;
  private demanda: Demanda;

  constructor(demanda: Demanda) {
    this.logService = new EverestLogService();
    this.className = this.constructor.name;
    this.demanda = demanda;
  }

  async createDemandaDado(demandaDado: Dado) {
    const methodName = `${this.className}.createDemandaDado`;
    try {
      if (!this.demanda.pk) {
        throw new Error('Demanda not found');
      }
      const dataSource = await ensureDataSourceInitialized();
      const demandaDadoRepository = dataSource.getRepository(Dado);
      const response = await demandaDadoRepository.upsert(demandaDado, ['pk', 'tipo_dado']);
      this.logService.info({
        message: `DemandaDado ${demandaDado.tipo_dado?.tipo_dado} criado com sucesso`,
        method: methodName,
      });
      const novoDemandaDado = await demandaDadoRepository.findOne({
        where: {
          pk_demanda_dado: response.identifiers[0].pk_demanda_dado,
        },
        relations: ['pk', 'tipo_dado'],
      });
      return novoDemandaDado;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: demandaDado,
        pk: this.demanda.pk,
      });
      throw Error;
    }
  }

  async updateDemandaDado(demandaDado: Partial<Dado>) {
    const methodName = `${this.className}.updateDemandaDado`;
    try {
      if (!this.demanda.pk) {
        throw new Error('Demanda not found');
      }
      if (!demandaDado.pk_demanda_dado) {
        throw new Error('DemandaDado not found');
      }
      const dataSource = await ensureDataSourceInitialized();
      const demandaDadoRepository = dataSource.getRepository(Dado);
      const response = await demandaDadoRepository.update(demandaDado.pk_demanda_dado as string, {
        value: demandaDado.value,
        updated_by: demandaDado.updated_by,
        is_active: demandaDado.is_active,
      });
      this.logService.info({
        message: `DemandaDado ${demandaDado.tipo_dado?.tipo_dado} atualizado com sucesso`,
        method: methodName,
      });
      return response;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: demandaDado,
        pk: this.demanda.pk,
      });
      throw Error;
    }
  }

  async deleteDemandaDado(tipoDado: TipoDado): Promise<void> {
    const methodName = `${this.className}.deleteDemandaDado`;
    try {
      if (!this.demanda.pk) {
        throw new Error('Demanda not found');
      }
      const dataSource = await ensureDataSourceInitialized();
      const demandaDadoRepository = dataSource.getRepository(Dado);
      const demandaDado = await demandaDadoRepository.findOne({
        where: { pk: Equal(this.demanda.pk), tipo_dado: Equal(tipoDado.tipo_dado) },
        relations: ['pk', 'tipo_dado'],
      });
      if (!demandaDado) return;
      if (!demandaDado?.pk_demanda_dado) return;

      await demandaDadoRepository.delete(demandaDado.pk_demanda_dado);

      this.logService.info({ message: `Dado ${tipoDado.tipo_dado} deletado com sucesso`, method: methodName });
    } catch (error: any) {
      await this.logService.error({ message: error.message, method: methodName, payload: { tipoDado } });
      throw Error;
    }
  }

  async getDemandaDadoByTipoDado(tipoDado: string): Promise<Dado> {
    const methodName = `${this.className}.getDemandaDadoByTipoDado`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const demandaDadoRepository = dataSource.getRepository(Dado);
      const demandaDado = await demandaDadoRepository.findOne({
        where: { pk: Equal(this.demanda.pk), tipo_dado: Equal(tipoDado) },
      });
      return demandaDado ?? ({} as Dado);
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { tipoDado, demanda: this.demanda },
        pk: this.demanda.pk,
      });
      throw Error;
    }
  }

  async criaIsArray(tipoDado: TipoDado, created_by: string, value: any) {
    const methodName = `${this.className}.criaIsArray`;
    try {
      if (!this.demanda.pk) {
        throw new Error('Demanda not found');
      }

      if (!Array.isArray(value)) {
        throw new Error('Value is not an array');
      }

      if (!_.isArray(value)) {
        throw new Error('Value is not an array');
      }

      if (value?.length === 0 || value === null || value === undefined) {
        this.logService.info({
          message: `Value is an empty array`,
          method: methodName,
        });
        return;
      }

      value = value.map((item: any) => {
        delete item.id;
        return item;
      });

      value = _.uniqWith(value, _.isEqual);

      const dataSource = await ensureDataSourceInitialized();
      const demandaDadoRepository = dataSource.getRepository(Dado);
      const demandaDado = await demandaDadoRepository.findOne({
        where: { pk: Equal(this.demanda.pk), tipo_dado: Equal(tipoDado.tipo_dado) },
        relations: ['pk', 'tipo_dado'],
      });
      if (!demandaDado) {
        const newDemandaDado = new Dado();
        newDemandaDado.pk = this.demanda;
        newDemandaDado.tipo_dado = tipoDado;
        newDemandaDado.value = { value: [...value] };
        newDemandaDado.created_by = created_by;
        newDemandaDado.updated_by = created_by;
        newDemandaDado.is_active = true;
        await this.createDemandaDado(newDemandaDado);
      } else {
        // const comparacao = demandaDado.value.value.every((itemA) => value.some((itemB) => isEqual(itemA, itemB)));

        const comparacao = _.isEqual(demandaDado.value.value, value);
        if (comparacao) {
          return;
        } else {
          demandaDado.value = { value: [...value] };
          demandaDado.updated_by = created_by;
          demandaDado.is_active = true;
          await this.updateDemandaDado(demandaDado);
          return;
        }
      }
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { tipoDado, demanda: this.demanda, created_by, value },
        pk: this.demanda.pk,
      });
      debugger;
    }
  }

  async criaIsObject(tipoDado: TipoDado, created_by: string, value: any) {
    const methodName = `${this.className}.criaIsObject`;
    try {
      if (!this.demanda.pk) {
        throw new Error('Demanda not found');
      }

      if (!_.isObject(value)) {
        debugger;
        throw new Error(`${tipoDado.tipo_dado} is not an object`, { cause: true });
      }

      const dataSource = await ensureDataSourceInitialized();
      const demandaDadoRepository = dataSource.getRepository(Dado);
      const demandaDado = await demandaDadoRepository.findOne({
        where: { pk: Equal(this.demanda.pk), tipo_dado: Equal(tipoDado.tipo_dado) },
        relations: ['pk', 'tipo_dado'],
      });
      // Remove o atributo 'id' de value, se existir
      if (value && typeof value === 'object' && 'id' in value) {
        // Cria uma cópia de value sem o atributo 'id'
        // (não altera o objeto original recebido)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...valueSemId } = value;
        value = valueSemId;
      }

      if (!demandaDado) {
        const newDemandaDado = new Dado();
        newDemandaDado.pk = this.demanda;
        newDemandaDado.tipo_dado = tipoDado;
        newDemandaDado.value = { value: { ...value } };
        newDemandaDado.created_by = created_by;
        newDemandaDado.updated_by = created_by;
        newDemandaDado.is_active = true;
        await this.createDemandaDado(newDemandaDado);
      } else {
        const comparacao = _.isEqual(demandaDado.value.value, value);
        if (comparacao) {
          return;
        } else {
          demandaDado.value = { value: { ...value } };
          demandaDado.updated_by = created_by;
          demandaDado.is_active = true;
          await this.updateDemandaDado(demandaDado);
          return;
        }
      }
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { tipoDado, created_by, value },
        pk: this.demanda.pk,
      });
      debugger;
    }
  }

  async criaIsNumber(tipoDado: TipoDado, created_by: string, value: any) {
    const methodName = `${this.className}.criaIsNumber`;
    try {
      if (!this.demanda.pk) {
        throw new Error('Demanda not found');
      }

      if (!_.isNumber(value)) {
        debugger;
        throw new Error(`${tipoDado.tipo_dado} is not an number`, { cause: true });
      }

      const dataSource = await ensureDataSourceInitialized();
      const demandaDadoRepository = dataSource.getRepository(Dado);
      const demandaDado = await demandaDadoRepository.findOne({
        where: { pk: Equal(this.demanda.pk), tipo_dado: Equal(tipoDado.tipo_dado) },
        relations: ['pk', 'tipo_dado'],
      });

      if (!demandaDado) {
        const newDemandaDado = new Dado();
        newDemandaDado.pk = this.demanda;
        newDemandaDado.tipo_dado = tipoDado;
        newDemandaDado.value = { value: value };
        newDemandaDado.created_by = created_by;
        newDemandaDado.updated_by = created_by;
        newDemandaDado.is_active = true;
        await this.createDemandaDado(newDemandaDado);
      } else {
        const comparacao = demandaDado.value.value === value;
        if (comparacao) {
          return;
        } else {
          demandaDado.value = { value: value };
          demandaDado.updated_by = created_by;
          demandaDado.is_active = true;
          await this.updateDemandaDado(demandaDado);
          return;
        }
      }
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { tipoDado, created_by, value },
        pk: this.demanda.pk,
      });
      debugger;
    }
  }

  async criaIsBoolean(tipoDado: TipoDado, created_by: string, value: any) {
    const methodName = `${this.className}.criaIsBoolean`;
    try {
      if (!this.demanda.pk) {
        throw new Error('Demanda not found');
      }

      if (!_.isBoolean(value)) {
        debugger;
        throw new Error(`${tipoDado.tipo_dado} is not an boolean`, { cause: true });
      }

      const dataSource = await ensureDataSourceInitialized();
      const demandaDadoRepository = dataSource.getRepository(Dado);
      const demandaDado = await demandaDadoRepository.findOne({
        where: { pk: Equal(this.demanda.pk), tipo_dado: Equal(tipoDado.tipo_dado) },
        relations: ['pk', 'tipo_dado'],
      });

      if (!demandaDado) {
        const newDemandaDado = new Dado();
        newDemandaDado.pk = this.demanda;
        newDemandaDado.tipo_dado = tipoDado;
        newDemandaDado.value = { value: value ? true : false };
        newDemandaDado.created_by = created_by;
        newDemandaDado.updated_by = created_by;
        newDemandaDado.is_active = true;
        await this.createDemandaDado(newDemandaDado);
      } else {
        const comparacao = demandaDado.value.value === value ? true : false;
        if (comparacao) {
          return;
        } else {
          demandaDado.value = { value: value ? true : false };
          demandaDado.updated_by = created_by;
          demandaDado.is_active = true;
          await this.updateDemandaDado(demandaDado);
          return;
        }
      }
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { tipoDado, created_by, value },
        pk: this.demanda.pk,
      });
      debugger;
    }
  }

  async criaIsString(tipoDado: TipoDado, created_by: string, value: any) {
    const methodName = `${this.className}.criaIsString`;
    try {
      if (!this.demanda.pk) {
        throw new Error('Demanda not found');
      }

      if (!_.isString(value)) {
        debugger;
        throw new Error(`${tipoDado.tipo_dado} is not an string`, { cause: true });
      }

      const dataSource = await ensureDataSourceInitialized();
      const demandaDadoRepository = dataSource.getRepository(Dado);
      const demandaDado = await demandaDadoRepository.findOne({
        where: { pk: Equal(this.demanda.pk), tipo_dado: Equal(tipoDado.tipo_dado) },
        relations: ['pk', 'tipo_dado'],
      });

      value = await this.criaIsStringExcecao(tipoDado, created_by, value);

      if (!demandaDado) {
        const newDemandaDado = new Dado();
        newDemandaDado.pk = this.demanda;
        newDemandaDado.tipo_dado = tipoDado;
        newDemandaDado.value = { value: value };
        newDemandaDado.created_by = created_by;
        newDemandaDado.updated_by = created_by;
        newDemandaDado.is_active = true;
        await this.createDemandaDado(newDemandaDado);
      } else {
        const comparacao = demandaDado.value.value === value;
        if (comparacao) {
          return;
        } else {
          demandaDado.value = { value: value };
          demandaDado.updated_by = created_by;
          demandaDado.is_active = true;
          await this.updateDemandaDado(demandaDado);
          return;
        }
      }
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { tipoDado, created_by, value },
        pk: this.demanda.pk,
      });
      debugger;
    }
  }

  async criaIsStringExcecao(tipoDado: TipoDado, created_by: string, value: any): Promise<string> {
    const methodName = `${this.className}.criaIsStringExcecao`;
    try {
      /* ---------------- Processa tipo_dado = processo_originario ---------------- */
      if (tipoDado?.tipo_dado === 'processo_originario') {
        const valorProcesso = EverestApoioService.apenasNumeros(value);
        return valorProcesso as string;
      }
      /* ---------------------- Processa tipo_dado = processo --------------------- */
      if (tipoDado?.tipo_dado === 'processo') {
        const valorProcesso = EverestApoioService.apenasNumeros(value);
        if (this.demanda?.processo !== valorProcesso) {
          this.demanda.processo = valorProcesso;
          this.demanda.updated_by = created_by;

          await new DemandaRepo().updateStatus(this.demanda);
        }
        return valorProcesso as string;
      }
      /* ------------------- Processa tipo_dado = identificacao ------------------- */
      if (tipoDado?.tipo_dado === 'identificacao') {
        if (this.demanda?.identificacao !== value) {
          this.demanda.identificacao = value;
          this.demanda.updated_by = created_by;
          await new DemandaRepo().updateStatus(this.demanda);
        }
        return value as string;
      }
      return value as string;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { tipoDado, created_by, value },
        pk: this.demanda.pk,
      });
      debugger;
      throw new Error(errorMessage);
    }
  }
}
