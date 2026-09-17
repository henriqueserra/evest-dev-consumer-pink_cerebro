import dotenv from 'dotenv';
import * as os from 'os';
import { Erro } from './entities/erros';
import { ensureDataSourceInitialized } from '../everest.orm.service';
dotenv.config({ debug: true });

const machineName = os.hostname();

// Obtendo o nome da máquina (machine name) usando o módulo 'os'

export class EverestLogService {
  constructor() {}

  info({ message, method }: { message: string; method: string }) {
    console.info(
      `info::${new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      })}::[${machineName}]::[${method}]::${message}`
    );
  }

  async error({
    message,
    method,
    payload,
    pk,
    persist = true,
  }: {
    message: string;
    method: string;
    payload?: any;
    pk?: string;
    persist?: boolean;
  }) {
    const methodName = `EverestLogService.error`;
    try {
      if (persist) {
        const dataSource = await ensureDataSourceInitialized();
        const erroRepository = dataSource.getRepository(Erro);
        const erro = erroRepository.create({
          metodo: method,
          machine_name: machineName,
          mensagem: message,
          payload: payload ?? {},
          pk: pk ?? '',
        });
        const result = await erroRepository.save(erro);
      }

      console.error(
        `error::${new Date().toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
        })}::[${machineName}]::[${method}]::- ${message}`
      );
      return true;
    } catch (error) {
      debugger;
      console.error(
        `${new Date().toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
        })}::[${machineName}]::[${method}]::${message}`
      );
      return false;
    }
  }

  log({ message, method }: { message: string; method: string }) {
    console.log(
      `log ::${new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      })}::[${machineName}]::[${method}]::${message}`
    );
  }
}
