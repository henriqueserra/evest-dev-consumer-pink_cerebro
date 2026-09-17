import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export const schema_env = process.env.ENVIRONMENT === 'Prod' ? 'prod' : 'dev';

/**
 * Representa um usuário do sistema.
 */
@Entity({ name: 'users', schema: schema_env })
export class User {
  @PrimaryColumn({ type: 'varchar', unique: true })
  email!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at?: Date;

  @Column({ type: 'varchar', nullable: true })
  updated_by?: string;

  @Column({
    type: 'varchar',
    nullable: false,
    default: () => "'henrique.serra@oito.com.br'",
  })
  created_by!: string;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: () => 'true' })
  is_active!: boolean;

  @Column({ type: 'boolean', nullable: false, default: () => 'false' })
  eoc!: boolean;

  @Column({ type: 'boolean', nullable: false, default: () => 'false' })
  escolhe_esteira_oito!: boolean;

  @Column({ type: 'varchar', nullable: true })
  name?: string;

  @Column({ type: 'boolean', nullable: false, default: () => 'false' })
  god_mode!: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sub?: string;

  @Column('varchar', { array: true, nullable: true })
  esteira_oito?: string[];

  @Column('varchar', { array: true, nullable: true })
  auditoria_oito?: string[];

  @Column('varchar', { array: true, nullable: true })
  esteira_cliente?: string[];

  @Column('varchar', { array: true, nullable: true })
  excecao_oito?: string[];

  @Column('varchar', { array: true, nullable: true })
  excecao_cliente?: string[];

  @Column('varchar', { array: true, nullable: true })
  portal_upload?: string[];

  @Column('varchar', { array: true, nullable: true })
  consulta?: string[];

  @Column({ type: 'timestamp', nullable: true })
  last_login!: Date;

  @Column({
    name: 'usuario_virtual',
    type: 'boolean',
    nullable: false,
    default: () => 'false',
  })
  usuario_virtual?: boolean;
}
