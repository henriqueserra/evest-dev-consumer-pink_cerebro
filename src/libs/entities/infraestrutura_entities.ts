import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Check } from 'typeorm';
import { Dado, Demanda } from './demanda';

/* -------------------------------------------------------------------------- */
/*                                    Filas                                   */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'filas', schema: 'infraestrutura' })
export class Fila {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  fila!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @Column({ type: 'integer', default: 60 })
  @Check(`"visibility_timeout" >= 30 AND "visibility_timeout" <= 900`)
  visibility_timeout!: number;

  @Column({ type: 'integer', default: 1 })
  @Check(`"max_number_of_messages" >= 1 AND "max_number_of_messages" <= 10`)
  max_number_of_messages!: number;
}

/* -------------------------------------------------------------------------- */
/*                                Status Filas                                */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'status_filas', schema: 'infraestrutura' })
export class StatusFila {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  fila!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at?: Date;

  @Column({ type: 'integer', default: 0 })
  availability_messages!: number;

  @Column({ type: 'integer', default: 0 })
  inflight_messages!: number;
}

/* -------------------------------------------------------------------------- */
/*                              Execução de Filas                             */
/* -------------------------------------------------------------------------- */
@Entity({ name: 'mensagens_sqs', schema: 'infraestrutura' })
export class MensagemSqs {
  @PrimaryColumn({ type: 'varchar', nullable: false })
  message_id!: string;

  @Column({ type: 'varchar', nullable: false })
  fila!: string;

  @Column({ type: 'varchar', nullable: true })
  cliente?: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  consumed_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  finished_at?: Date;

  @Column({ type: 'int', default: () => '0' })
  consumed_times?: number;

  @Column({ type: 'uuid', nullable: true })
  pk?: string | null;

  @Column({ type: 'boolean', default: false })
  success!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  message!: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  resposta?: Record<string, any>;

  @Column({ type: 'varchar', nullable: false })
  environment!: string;

  @Column({ type: 'varchar', nullable: true })
  status_pos_execucao?: string;

  @Column({ type: 'varchar', nullable: true })
  observacao?: string;

  @Column({ type: 'varchar', nullable: true })
  metodo_inicial?: string;

  @Column({ type: 'varchar', nullable: true })
  metodo_final?: string;

  @Column({ type: 'varchar', nullable: true })
  metodo_read?: string;
}
