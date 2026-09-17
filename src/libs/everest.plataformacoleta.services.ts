import { Pool, PoolClient } from 'pg';
import { EverestLogService } from './everest.log.services';

const routeName = `EverestPlataformaColetaServices`;

const logService = new EverestLogService();
export class EverestPlataformaColetaServices {
  pool: Pool;
  constructor() {
    this.pool = new Pool({
      host: 'plataforma-coleta-prod.caccybipsr5p.sa-east-1.rds.amazonaws.com',
      port: 4789,
      user: 'plataforma_coleta',
      password: 'plataforma_coleta_123',
      database: 'plataforma_coleta',
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  async getConnection() {
    const methodName = `${routeName}.getConnection`;
    try {
      // Verifica se existe uma conexão aberta
      let connection = await this.pool.connect();
      try {
        await connection.query('SELECT 1');
        return connection;
      } catch {
        // Se não existir, cria uma nova conexão
        connection = await this.pool.connect();
        return connection;
      }
      return connection;
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    }
  }

  async closeConnection(connection: PoolClient) {
    await connection.release();
  }

  static async queryGenericaStatic(query: string) {
    const methodName = `${routeName}.queryGenerica`;
    const everestDBService = new EverestPlataformaColetaServices();
    const connection = await everestDBService.pool.connect();
    try {
      const result = await connection.query(query);
      return result.rows;
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    } finally {
      await connection.release();
    }
  }

  static async getCitacaoIntimacaoDje(codCliente: number, cod_citacao_configuracao: number) {
    const methodName = `${routeName}.getCaptadores`;
    try {
      const query: string = `select cod_citacao_dado, cod_citacao_configuracao, dat_inclusao, dsc_nome_arquivo, dsc_path_arquivo, dsc_numero_processo, UPPER(tipo_documento) AS tipo_documento from captadores.citacao_dado cd where cod_citacao_configuracao in (select cod_citacao_configuracao from captadores.citacao_configuracao cc where cod_cliente = ${codCliente} and ind_status_registro = true) and ind_conferido_contencioso = false and ind_status_registro = true and cod_citacao_configuracao = ${cod_citacao_configuracao} order by dat_inclusao asc;`;

      const result = await this.queryGenericaStatic(query);
      return result;
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    }
  }

  static async getDistribuidos(codCliente: number) {
    const methodName = `${routeName}.getDistribuidos`;
    try {
      const query: string = `select * from processo.nup n where cod_cliente = ${codCliente} and ind_status_registro = true and ind_importado_everest is not true order by cod_nup asc;`;
      const result = await this.queryGenericaStatic(query);
      return result;
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    }
  }

  static async getDistribuidosArquivos(codNup: number) {
    const methodName = `${routeName}.getDistribuidos`;
    try {
      const query: string = `select * from processo.nup_anexo na where cod_nup = ${codNup} order by dat_inclusao asc;`;
      const result = await this.queryGenericaStatic(query);
      return result;
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    }
  }

  static async getDistribuidosDadosDeCapa(codNup: number) {
    const methodName = `${routeName}.getDistribuidosDadosDeCapa`;
    try {
      const query: string = `select * from processo.nup n where cod_nup = ${codNup};`;
      const result = await this.queryGenericaStatic(query);
      return result?.[0] || {};
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    }
  }

  static async getDistribuidosPartes(codNup: number) {
    const methodName = `${routeName}.getDistribuidosPartes`;
    try {
      const query: string = `select * from processo.nup_parte where cod_nup = ${codNup}`;
      const result = await this.queryGenericaStatic(query);
      return result;
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    }
  }

  static async getDistribuidosReus(codNup: number) {
    const methodName = `${routeName}.getDistribuidosReus`;
    try {
      const query: string = `select * from processo.nup_reu where cod_nup = ${codNup}`;
      const result = await this.queryGenericaStatic(query);
      return result;
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    }
  }

  static async updateDistribuidos({
    cod_nup,
    ind_importado_everest,
  }: {
    cod_nup: string;
    ind_importado_everest: boolean;
  }) {
    const methodName = `${routeName}.updateDistribuidos`;
    try {
      const query: string = `UPDATE processo.nup SET ind_importado_everest = ${ind_importado_everest} WHERE cod_nup = ${cod_nup} ;`;
      const result = await this.queryGenericaStatic(query);
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    }
  }

  static async updateCitacaoIntimacaoDje({
    cod_citacao_dado,
    ind_conferido_contencioso,
  }: {
    cod_citacao_dado: string;
    ind_conferido_contencioso: boolean;
  }) {
    const methodName = `${routeName}.updateCitacaoIntimacaoDje`;
    try {
      const query: string = `UPDATE captadores.citacao_dado SET ind_conferido_contencioso = ${ind_conferido_contencioso} WHERE cod_citacao_dado = ${cod_citacao_dado} ;`;
      const result = await this.queryGenericaStatic(query);
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    }
  }

  static async updateProcon({
    cod_regulatorio_dado,
    ind_conferido_contencioso,
  }: {
    cod_regulatorio_dado: string;
    ind_conferido_contencioso: boolean;
  }) {
    const methodName = `${routeName}.updateProcon`;
    try {
      const query: string = `UPDATE captadores.regulatorio_dado SET ind_conferido_contencioso = ${ind_conferido_contencioso} WHERE cod_regulatorio_dado = ${cod_regulatorio_dado} ;`;
      const result = await this.queryGenericaStatic(query);
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    }
  }

  static async updateProconsumidor({
    cod_proconsumidor_dado,
    ind_conferido_plataforma,
  }: {
    cod_proconsumidor_dado: string;
    ind_conferido_plataforma: boolean;
  }) {
    const methodName = `${routeName}.updateProconsumidor`;
    try {
      const query: string = `UPDATE captadores.proconsumidor_dado SET ind_conferido_plataforma = ${ind_conferido_plataforma} WHERE cod_proconsumidor_dado = ${cod_proconsumidor_dado} ;`;
      const result = await this.queryGenericaStatic(query);
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    }
  }

  static async updateProconSPDigital({
    ind_conferido_plataforma,
    cod_regulatorio_dado,
  }: {
    ind_conferido_plataforma: boolean;
    cod_regulatorio_dado: string;
  }) {
    const methodName = `${routeName}.updateProconSPDigital`;
    try {
      const query: string = `UPDATE captadores.regulatorio_dado SET ind_conferido_contencioso = ${ind_conferido_plataforma} WHERE cod_regulatorio_dado = ${cod_regulatorio_dado} ;`;
      const result = await this.queryGenericaStatic(query);
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    }
  }

  static async updatePublicacao({
    cod_movimentacao_digesto_publicacao,
    ind_conferido_plataforma,
  }: {
    cod_movimentacao_digesto_publicacao: string;
    ind_conferido_plataforma: boolean;
  }) {
    const methodName = `${routeName}.updatePublicacao`;
    try {
      const query: string = `UPDATE digesto.movimentacao_digesto_publicacao SET ind_importado_everest = ${ind_conferido_plataforma} WHERE cod_movimentacao_digesto_publicacao = ${cod_movimentacao_digesto_publicacao} ;`;
      const result = await this.queryGenericaStatic(query);
    } catch (error: any) {
      debugger;
      await logService.error({ message: error.message, method: methodName });
      throw new Error(`${routeName} :: ${error.message}`);
    }
  }
}
