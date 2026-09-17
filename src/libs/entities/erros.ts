import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export const schema_env = process.env.ENVIRONMENT === 'Prod' ? 'prod' : 'dev';

/**
 * Representa um usuário do sistema.
 */
@Entity({ name: schema_env, schema: 'erros' })
export class Erro {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id?: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at?: Date;

  @Column({ type: 'varchar', nullable: true })
  pk?: string;

  @Column({ type: 'varchar', nullable: true })
  mensagem!: string;

  @Column({ type: 'varchar', nullable: true })
  metodo!: string;

  @Column({ type: 'varchar', nullable: true })
  machine_name!: string;

  @Column({ type: 'jsonb', nullable: true })
  payload!: any;

  @Column({ type: 'boolean', nullable: false, default: () => 'false' })
  is_resolvido?: boolean;
}
