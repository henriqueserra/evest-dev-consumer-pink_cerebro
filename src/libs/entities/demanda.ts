import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { Origem, PerfilDemanda, TipoDemanda, StatusDemanda, TipoDado, Cliente } from './config_entities';
import { User } from './user';

const environment = process.env.ENVIRONMENT === 'Prod' ? 'prod' : 'dev';
const schema_env = process.env.ENVIRONMENT === 'Prod' ? 'prod' : 'dev';

@Entity({ name: 'demandas', schema: environment })
@Index(`ix_demandas_data_carimbo_${schema_env}`, ['data_carimbo'])
@Index(`ix_demandas_cliente_${schema_env}`, ['cliente'])
@Index(`ix_demandas_cod_nup_${schema_env}`, ['cod_nup'])
// @Index(`ix_demandas_cod_nup_is_active_${schema_env}`, ['cod_nup', 'is_active'])
@Index(`ix_demandas_created_at_${schema_env}`, ['created_at'])
@Index(`ix_demandas_cliente_created_at_${schema_env}`, ['cliente', 'created_at'])
@Index(`ix_demandas_identificacao_${schema_env}`, ['identificacao'])
@Index(`ix_demandas_processo_${schema_env}`, ['processo'])
@Index(`ix_demandas_status_demanda_${schema_env}`, ['status_demanda'])
@Index(`ix_demandas_tipo_demanda_${schema_env}`, ['tipo_demanda'])
@Index(`ix_demandas_origem_${schema_env}`, ['origem'])
@Index(`ix_demandas_updated_at_${schema_env}`, ['updated_at'])
@Index(`ix_demandas_cliente_identificacao_${schema_env}`, ['cliente', 'identificacao'])
@Index(`ix_demandas_cliente_processo_${schema_env}`, ['cliente', 'processo'])
@Index(`ix_demandas_cliente_perfil_demanda_${schema_env}`, ['cliente', 'perfil_demanda'])
@Index(`ix_demandas_cliente_status_demanda_${schema_env}`, ['cliente', 'status_demanda'])
@Index(`ix_demandas_cliente_tipo_demanda_${schema_env}`, ['cliente', 'tipo_demanda'])
export class Demanda {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  pk?: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at?: Date;

  @Column({ type: 'boolean', default: () => 'true' })
  is_active!: boolean;

  @Column({ type: 'boolean', default: () => 'false' })
  was_pec?: boolean;

  @ManyToOne(() => Cliente, {})
  @JoinColumn({ name: 'cliente', foreignKeyConstraintName: `fk_demandas_cliente_${schema_env}` })
  cliente!: Cliente;

  @ManyToOne(() => StatusDemanda, {})
  @JoinColumn({ name: 'status_demanda', foreignKeyConstraintName: `fk_demandas_status_demanda_${schema_env}` })
  status_demanda!: StatusDemanda;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  due_date?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  data_carimbo?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cod_nup?: string | null | undefined;

  @ManyToOne(() => PerfilDemanda, {})
  @JoinColumn({ name: 'perfil_demanda', foreignKeyConstraintName: `fk_demandas_perfil_demanda_${schema_env}` })
  perfil_demanda!: PerfilDemanda;

  @Column({ type: 'varchar', nullable: true })
  usuario_atuando?: string | null;

  @ManyToOne(() => User, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'created_by', foreignKeyConstraintName: `fk_demandas_created_by_${schema_env}` })
  created_by!: User;

  @Column({ type: 'varchar', nullable: false })
  updated_by!: string;

  @Column({ type: 'varchar', nullable: true })
  processo?: string | null | undefined;

  @Column({ type: 'varchar', nullable: true })
  identificacao?: string | null | undefined;

  @Column({ type: 'varchar', nullable: true })
  id_cliente?: string | null | undefined;

  @ManyToOne(() => TipoDemanda, {})
  @JoinColumn({ name: 'tipo_demanda', foreignKeyConstraintName: `fk_demandas_tipo_demanda_${schema_env}` })
  tipo_demanda!: TipoDemanda;

  @ManyToOne(() => Origem, {})
  @JoinColumn({ name: 'origem', foreignKeyConstraintName: `fk_demandas_origem_${schema_env}` })
  origem!: Origem;

  @Column({ type: 'varchar', nullable: true })
  esteira_oito_usuario?: string | null | undefined;

  @Column({ type: 'varchar', nullable: true })
  esteira_cliente_usuario?: string | null | undefined;

  @Column({ type: 'varchar', nullable: true })
  tipificacao_oito_usuario?: string | null | undefined;

  @Column({ type: 'varchar', nullable: true })
  auditoria_oito_usuario?: string | null | undefined;

  @Column({ type: 'boolean', default: () => 'false' })
  prioridade!: boolean;

  @OneToMany(() => Arquivo, (arquivo) => arquivo.pk, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn({ name: 'pk', foreignKeyConstraintName: `fk_demandas_arquivos_${schema_env}` })
  arquivos?: Arquivo[];

  @OneToMany(() => Dado, (dado) => dado.pk, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn({ name: 'pk', foreignKeyConstraintName: `fk_demandas_dados_${schema_env}` })
  dados?: Dado[];

  @OneToMany(() => DemandaAPI, (demandaAPI) => demandaAPI.pk, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn({ name: 'pk', foreignKeyConstraintName: `fk_demandas_api_${schema_env}` })
  api?: DemandaAPI[];

  @OneToMany(() => Observacao, (observacao) => observacao.pk, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn({ name: 'pk', foreignKeyConstraintName: `fk_demandas_observacao_${schema_env}` })
  observacao?: Observacao[];

  @OneToMany(() => Historico, (historico) => historico.pk, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn({ name: 'pk', foreignKeyConstraintName: `fk_demandas_historico_${schema_env}` })
  historico?: Historico[];

  @OneToMany(() => Evento, (evento) => evento.pk, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn({ name: 'pk', foreignKeyConstraintName: `fk_demandas_evento_${schema_env}` })
  evento?: Evento[];
}

/* -------------------------------------------------------------------------- */
/*                              Demanda Histórico                             */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'demanda_historico', schema: environment })
@Unique(`UQ_pk_historico_${schema_env}`, ['pk', 'created_at'])
export class Historico {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  pk_historico?: string;

  @ManyToOne(() => Demanda, (demanda) => demanda.historico, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pk', foreignKeyConstraintName: `fk_demandas_historico_${schema_env}` })
  pk?: Demanda;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date;

  @Column({ type: 'varchar', nullable: false })
  created_by!: string;

  @Column({ type: 'varchar', nullable: false })
  mensagem!: string;

  @Column({ type: 'varchar', nullable: true })
  status_demanda_anterior?: string | null;

  @Column({ type: 'varchar', nullable: true })
  status_demanda?: string | null;
}

/* -------------------------------------------------------------------------- */
/*                             Demanda Observação                             */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'demanda_observacao', schema: environment })
@Unique(`UQ_pk_observacao_${schema_env}`, ['pk', 'created_at'])
export class Observacao {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  pk_observacao?: string;

  @ManyToOne(() => Demanda, (demanda) => demanda.observacao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pk', foreignKeyConstraintName: `fk_demandas_observacao_${schema_env}` })
  pk?: Demanda;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date;

  @Column({ type: 'varchar', nullable: false })
  created_by!: string;

  @Column({ type: 'text', nullable: false })
  mensagem!: string;
}

/* -------------------------------------------------------------------------- */
/*                                   Arquivo                                  */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'demanda_arquivos', schema: environment })
@Unique(`UQ_pk_s3_key_${schema_env}`, ['pk', 's3_key'])
export class Arquivo {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  pk_arquivo?: string;

  @ManyToOne(() => Demanda, (demanda) => demanda.arquivos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pk', foreignKeyConstraintName: `fk_demandas_arquivos_${schema_env}` })
  pk!: Demanda;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at?: Date;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: () => 'true' })
  is_active!: boolean;

  @Column({ name: 'created_by', type: 'varchar', nullable: false })
  created_by!: string;

  @Column({ name: 'updated_by', type: 'varchar', nullable: false })
  updated_by!: string;

  @Column({ type: 'varchar', nullable: false })
  file_name!: string;

  @Column({ type: 'float', nullable: true, default: () => '0' })
  file_size?: number | null;

  @Column({ type: 'varchar', nullable: true, default: () => "'application/octet-stream'" })
  mime_type!: string | null;

  @Column({ type: 'varchar', nullable: true })
  tipo?: string | null;

  @Column({ type: 'varchar', nullable: false })
  s3_bucket!: string;

  @Column({ type: 'varchar', nullable: false })
  s3_key!: string;

  @Column({ type: 'varchar', nullable: false, default: () => "'us-east-1'" })
  s3_region!: string | null;
}

/* -------------------------------------------------------------------------- */
/*                                    Dado                                    */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'demanda_dados', schema: environment })
@Unique(`UQ_pk_tipo_dado_${schema_env}`, ['pk', 'tipo_dado'])
@Index(`ix_demanda_dados_created_at_${schema_env}`, ['created_at'])
@Index(`ix_demanda_dados_pk_${schema_env}`, ['pk'])
@Index(`ix_demanda_dados_tipo_dado_${schema_env}`, ['tipo_dado'])
export class Dado {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  pk_demanda_dado?: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at?: Date;

  @Column({ type: 'boolean', nullable: false, default: () => 'true' })
  is_active?: boolean;

  @Column({ type: 'varchar', nullable: false })
  created_by!: string;

  @Column({ type: 'varchar', nullable: false })
  updated_by!: string;

  @ManyToOne(() => TipoDado, { nullable: false, onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'tipo_dado', foreignKeyConstraintName: `fk_demandas_dados_tipo_dado_${schema_env}` })
  tipo_dado?: TipoDado;

  @Column({ type: 'jsonb', nullable: false })
  value!: any;

  @Column({ type: 'boolean', nullable: false, default: () => 'false' })
  is_ai_created?: boolean;

  @Column({ type: 'jsonb', nullable: true })
  ai_value?: any;

  @ManyToOne(() => Demanda, (demanda) => demanda.dados, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pk', foreignKeyConstraintName: `fk_demandas_dados_${schema_env}` })
  pk?: Demanda;
}

/* -------------------------------------------------------------------------- */
/*                                     API                                    */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'demanda_api', schema: environment })
@Unique(`UQ_pk_created_at_${schema_env}`, ['pk', 'created_at'])
@Index(`idx_demanda_api_pk_${schema_env}`, ['pk'])
@Index(`idx_demanda_api_success_created_at_${schema_env}`, ['success', 'created_at'])
@Index(`idx_demanda_api_success_created_at_pk_${schema_env}`, ['success', 'created_at', 'pk'])
export class DemandaAPI {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  pk_demanda_api!: string;

  @ManyToOne(() => Demanda, (demanda) => demanda.api, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pk', foreignKeyConstraintName: `fk_demandas_api_${schema_env}` })
  pk?: Demanda;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at!: string;

  @Column({ type: 'boolean', nullable: false, default: () => 'true' })
  success!: boolean;

  @Column({ type: 'boolean', nullable: false, default: () => 'false' })
  reprocessado!: boolean;

  @Column({ type: 'varchar', nullable: false })
  created_by!: string;

  @Column({ type: 'varchar', nullable: false })
  updated_by!: string;

  @Column({ type: 'jsonb', nullable: false })
  value!: any;

  @Column({ type: 'varchar', nullable: false })
  endpoint!: string;
}

/* -------------------------------------------------------------------------- */
/*                                   Eventos                                  */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'demanda_eventos', schema: environment })
export class Evento {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  pk_demanda_evento?: string;

  @ManyToOne(() => Demanda, (demanda) => demanda.evento, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pk', foreignKeyConstraintName: `fk_demandas_evento_${schema_env}` })
  pk?: Demanda;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date;

  @Column({ type: 'varchar', nullable: false })
  created_by!: string;

  @Column({ type: 'varchar', nullable: false })
  evento!: string;

  @Column({ type: 'varchar', nullable: true })
  metodo!: string;

  @Column({ type: 'jsonb', nullable: true, default: () => 'NULL' })
  data!: any;
}
