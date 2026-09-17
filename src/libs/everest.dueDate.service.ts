import { EverestLogService } from './everest.log.services';
import { EverestErrorServices } from './everest.error.services';
import { ensureDataSourceInitialized } from '../everest.orm.service';

export class EverestDueDateService {
  private logService: EverestLogService;
  private className: string;
  constructor() {
    this.logService = new EverestLogService();
    this.className = this.constructor.name;
  }

  async findPreviousWorkingDateTime(date: Date): Promise<Date> {
    const methodName = `${this.className}.findPreviousWorkingDateTime`;
    try {
      return this.subtraiHoraUtil(date.toISOString(), 1);
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { date },
        persist: true,
      });
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  async getDataCarimbo(dateString: string): Promise<Date> {
    const methodName = `${this.className}.getDataCarimbo`;
    try {
      const date = new Date(dateString);

      const dataSource = await ensureDataSourceInitialized();

      const dataAlvo = new Date((date as Date).getTime() - 60 * 60 * 1000).toISOString();

      const dataCarimboRecord = await dataSource.query(
        `select due_date::timestamp AT TIME ZONE 'UTC' as due_date from config.due_date where due_date > $1 order by due_date asc limit 1`,
        [dataAlvo]
      );

      let dataCarimbo: Date | null = null;
      if (dataCarimboRecord && dataCarimboRecord.length > 0 && dataCarimboRecord[0].due_date) {
        const dueDate = dataCarimboRecord[0].due_date;
        dataCarimbo = new Date(
          Date.UTC(
            dueDate.getUTCFullYear(),
            dueDate.getUTCMonth(),
            dueDate.getUTCDate(),
            dueDate.getUTCHours(),
            dueDate.getUTCMinutes(),
            dueDate.getUTCSeconds(),
            dueDate.getUTCMilliseconds()
          )
        );
      }
      if (!dataCarimbo) throw new Error(`Data de carimbo não encontrada para a data ${date}`);

      if (
        dataCarimbo &&
        date &&
        dataCarimbo.getFullYear() === date.getFullYear() &&
        dataCarimbo.getMonth() === date.getMonth() &&
        dataCarimbo.getDate() === date.getDate() &&
        dataCarimbo.getHours() === date.getHours()
      ) {
        if (dataCarimbo) {
          dataCarimbo.setMinutes(date.getMinutes(), date.getSeconds(), date.getMilliseconds());
        }
      }

      return dataCarimbo as Date;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { dateString },
        persist: true,
      });
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  async subtraiHoraUtil(dateString: string, horas_uteis: number): Promise<Date> {
    const methodName = `${this.className}.subtraiHoraUtil`;
    try {
      const date = new Date(dateString);
      const dataSource = await ensureDataSourceInitialized();
      const dataIncial = new Date(await this.getDataCarimbo(date.toISOString())).toISOString();
      const dataCarimbo = await dataSource.query(
        `select due_date::timestamp AT TIME ZONE 'UTC' as due_date from config.due_date where due_date < $1 order by due_date desc limit $2`,
        [dataIncial, horas_uteis + 1]
      );

      let dueDateFinal = dataCarimbo[horas_uteis]?.due_date as Date;

      let dataCarimboFinal = new Date(dataIncial);

      if (
        dataCarimboFinal &&
        date &&
        dataCarimboFinal.getFullYear() === date.getFullYear() &&
        dataCarimboFinal.getMonth() === date.getMonth() &&
        dataCarimboFinal.getDate() === date.getDate() &&
        dataCarimboFinal.getHours() === date.getHours()
      ) {
        if (dataCarimboFinal) {
          dataCarimboFinal.setMinutes(date.getMinutes(), date.getSeconds(), date.getMilliseconds());
        }
        if (dueDateFinal) {
          dueDateFinal.setMinutes(date.getMinutes(), date.getSeconds(), date.getMilliseconds());
        }
      }
      return dueDateFinal as Date;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { dateString, horas_uteis },
        persist: true,
      });
      debugger;
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  async adicionaHoraUtil(dateString: string, horas_uteis: number): Promise<Date> {
    const methodName = `${this.className}.adicionaHoraUtil`;
    try {
      // console.log('created_at', date.toUTCString());
      const date = new Date(dateString);
      let created_at = new Date((date as Date).getTime() - 60 * 60 * 1000);
      // console.log('created_at', created_at.toUTCString());
      let createdAtOriginal = created_at;
      const dataSource = await ensureDataSourceInitialized();
      const dataIncial = new Date(
        (await this.getDataCarimbo(date.toISOString())).getTime() - 60 * 60 * 1000
      ).toISOString();
      const dataCarimbo = await dataSource.query(
        `select due_date::timestamp AT TIME ZONE 'UTC' as due_date from config.due_date where due_date > $1 order by due_date asc limit $2`,
        [dataIncial, horas_uteis + 1]
      );

      let dueDateFinal = dataCarimbo[horas_uteis]?.due_date as Date;

      let dataCarimboFinal = new Date(dataIncial);
      if (
        dataCarimboFinal &&
        createdAtOriginal &&
        dataCarimboFinal.getFullYear() === createdAtOriginal.getFullYear() &&
        dataCarimboFinal.getMonth() === createdAtOriginal.getMonth() &&
        dataCarimboFinal.getDate() === createdAtOriginal.getDate() &&
        dataCarimboFinal.getHours() === createdAtOriginal.getHours()
      ) {
        if (dataCarimboFinal) {
          dataCarimboFinal.setMinutes(
            createdAtOriginal.getMinutes(),
            createdAtOriginal.getSeconds(),
            createdAtOriginal.getMilliseconds()
          );
        }
        if (dueDateFinal) {
          dueDateFinal.setMinutes(
            createdAtOriginal.getMinutes(),
            createdAtOriginal.getSeconds(),
            createdAtOriginal.getMilliseconds()
          );
        }
      }

      return dueDateFinal;
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { dateString, horas_uteis },
        persist: true,
      });
      debugger;
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  async getNextWorkingDay(date: Date): Promise<Date> {
    const methodName = `${this.className}.getNextWorkingDay`;
    try {
      return await this.adicionaHoraUtil(date.toISOString(), 9);
    } catch (error) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { date },
        persist: true,
      });
      debugger;
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }
}
