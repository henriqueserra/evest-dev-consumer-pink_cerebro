import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Erro } from './libs/entities/erros';
import { Arquivo, Dado, Demanda, DemandaAPI, Evento, Historico, Observacao } from './libs/entities/demanda';
import { EverestErrorServices } from './libs/everest.error.services';
import { User } from './libs/entities/user';
import {
  Cliente,
  DueDate,
  Origem,
  PerfilDemanda,
  StatusDemanda,
  TipoDado,
  TipoDemanda,
} from './libs/entities/config_entities';
import { Fila } from './libs/entities/infraestrutura_entities';
import { PortalUploads } from './libs/entities/portal_uploads';

const schema_env = process.env.ENVIRONMENT === 'Prod' ? 'prod' : 'dev';

export const AppDataSource = new DataSource({
  type: 'postgres',
  cache: {
    duration: 1000,
  },
  host: 'everest.c46mwg0c7idf.us-east-1.rds.amazonaws.com',
  port: 5432,
  username: 'postgres',
  password: 'r2GFtjRvsbV33b26fkWmT',
  database: 'everest',
  schema: schema_env,
  synchronize: false,
  logging: false,
  poolSize: 10,
  entities: [
    // Entidades base primeiro
    Erro,
    Fila,
    // Entidades que dependem das anteriores
    User,
    PortalUploads,
    Origem,
    PerfilDemanda,
    TipoDado,
    TipoDemanda,
    StatusDemanda,
    Cliente,
    DueDate,
    Demanda,
    Arquivo,
    Dado,
    DemandaAPI,
    Observacao,
    Historico,
    Evento,
  ],
  migrations: [],
  subscribers: [],
  ssl: {
    rejectUnauthorized: false, // Para desenvolvimento. Em produção, use certificados válidos!
  },
  extra: {
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    connectionErrorRetryCount: 3,
    connectionErrorRetryDelay: 2000,
  },
});

// Função para garantir que o DataSource esteja inicializado
export async function ensureDataSourceInitialized() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      await AppDataSource.query(`SET TIME ZONE 'UTC';`);
    }
    return AppDataSource;
  } catch (error) {
    const errorMessage = EverestErrorServices.getError(error);
    console.error(errorMessage);
    debugger;
    throw new Error(`${errorMessage}`);
  }
}
