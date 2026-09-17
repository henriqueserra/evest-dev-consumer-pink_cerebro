import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Check } from 'typeorm';
import { Dado, Demanda } from './demanda';

/* -------------------------------------------------------------------------- */
/*                                   Origem                                   */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'origems', schema: 'config' })
export class Origem {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  origem!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ type: 'varchar', nullable: true })
  descricao?: string;

  // @OneToMany(() => Demanda, (demanda) => demanda.origem, {
  //   cascade: true,
  // })
  // demanda!: Demanda;
}

/* -------------------------------------------------------------------------- */
/*                                  Tipo Dado                                 */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'tipo_dados', schema: 'config' })
@Check(`(is_array::int + is_object::int + is_string::int + is_boolean::int + is_number::int) = 1`)
export class TipoDado {
  @PrimaryColumn({ type: 'varchar' })
  tipo_dado!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ type: 'boolean', default: false })
  is_array!: boolean;

  @Column({ type: 'boolean', default: false })
  is_string!: boolean;

  @Column({ type: 'boolean', default: false })
  is_number!: boolean;

  @Column({ type: 'boolean', default: false })
  is_boolean!: boolean;

  @Column({ type: 'boolean', default: false })
  is_object!: boolean;

  @Column({ type: 'boolean', default: false })
  is_date!: boolean;

  @Column({ type: 'boolean', default: false })
  is_time!: boolean;

  @Column({ type: 'boolean', default: false })
  is_datetime!: boolean;

  @Column({ type: 'boolean', default: false })
  is_frontend!: boolean;

  @Column({ type: 'varchar', nullable: true })
  descricao?: string;

  // @OneToMany(() => Dado, (dado) => dado.tipo_dado, {
  //   cascade: true,
  // })
  // dado!: Dado;
}

/* -------------------------------------------------------------------------- */
/*                               Perfil Demanda                               */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'perfil_demandas', schema: 'config' })
export class PerfilDemanda {
  @PrimaryColumn({ type: 'varchar' })
  perfil_demanda!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ type: 'varchar', nullable: true })
  descricao?: string;

  // @OneToMany(() => Demanda, (demanda) => demanda.perfil_demanda, {
  //   cascade: true,
  // })
  // demanda!: Demanda;
}

/* -------------------------------------------------------------------------- */
/*                                Tipo Demanda                                */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'tipo_demandas', schema: 'config' })
export class TipoDemanda {
  @PrimaryColumn({ type: 'varchar' })
  tipo_demanda!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @CreateDateColumn({ type: 'int', default: () => '0' })
  time_out!: number;

  @Column({ type: 'varchar', nullable: true })
  descricao?: string;

  // @OneToMany(() => Demanda, (demanda) => demanda.tipo_demanda, {
  //   cascade: true,
  // })
  // demanda!: Demanda;
}

/* -------------------------------------------------------------------------- */
/*                               Status Demanda                               */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'status_demandas', schema: 'config' })
export class StatusDemanda {
  @PrimaryColumn({ type: 'varchar' })
  status_demanda!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ name: 'is_esteira_oito', type: 'boolean', nullable: false, default: false })
  is_esteira_oito!: boolean;

  @Column({ name: 'is_transient_status', type: 'boolean', nullable: false, default: false })
  is_transient_status!: boolean;

  @Column({ name: 'is_short_transient_status', type: 'boolean', nullable: false, default: false })
  is_short_transient_status!: boolean;

  @Column({ type: 'varchar', nullable: true })
  descricao?: string;

  // @OneToMany(() => Demanda, (demanda) => demanda.status_demanda, {
  //   cascade: true,
  // })
  // demanda!: Demanda;
}

/* -------------------------------------------------------------------------- */
/*                                   Cliente                                  */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'clientes', schema: 'config' })
export class Cliente {
  @PrimaryColumn({ type: 'varchar' })
  cliente!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at?: Date;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: () => 'true' })
  is_active!: boolean;

  @Column({ name: 'portal_uploads_lote', type: 'boolean', nullable: true, default: () => 'false' })
  portal_uploads_lote?: boolean;

  @Column({ name: 'portal_uploads_individual', type: 'boolean', nullable: true, default: () => 'false' })
  portal_uploads_individual?: boolean;

  @Column({ name: 'sla_horas', type: 'integer', nullable: false, default: () => '9' })
  sla_horas!: number;

  @Column({ type: 'json', nullable: true })
  propriedades_dev?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  propriedades_prod?: Record<string, any>;

  @Column({ name: 'has_extracao_texto', type: 'boolean', nullable: false, default: () => 'false' })
  has_extracao_texto!: boolean;

  // @OneToMany(() => Demanda, (demanda) => demanda.cliente, {
  //   cascade: true,
  // })
  // demanda!: Demanda;
}
/* -------------------------------------------------------------------------- */
/*                                  Due Date                                  */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'due_date', schema: 'config' })
export class DueDate {
  @PrimaryColumn({ type: 'timestamp', nullable: false })
  due_date!: Date;

  @Column({ type: 'timestamp', nullable: true })
  due_date_br?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  due_date_br_str?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  dia_semana?: string;
}
