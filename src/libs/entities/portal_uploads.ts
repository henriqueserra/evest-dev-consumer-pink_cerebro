import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user';
import { Cliente } from './config_entities';

export const schema_env = process.env.ENVIRONMENT === 'Prod' ? 'prod' : 'dev';

@Entity({
  name: `${schema_env}`,
  schema: 'portal_uploads',
})
@Index(`ix_portal_uploads_hash_calculado_cliente_${schema_env}`, ['hash_calculado', 'cliente'], { unique: true })
export class PortalUploads {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  pk_portal_uploads!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at?: Date;

  @Column({ type: 'boolean', nullable: false, default: () => 'false' })
  migrado!: boolean;

  @Column({ type: 'jsonb', nullable: false })
  payload_original!: Record<string, any>;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  created_by!: User;

  @Column({ type: 'varchar', nullable: false })
  updated_by!: string;

  @ManyToOne(() => Cliente, { eager: true })
  @JoinColumn({ name: 'cliente' })
  cliente!: Cliente;

  @Column({ type: 'timestamp', nullable: false })
  data_carimbo!: Date;

  @Column({ type: 'timestamp', nullable: false })
  due_date?: Date;

  @Column({ type: 'varchar', nullable: false })
  file_name_original!: string;

  @Column({ type: 'varchar', nullable: false })
  hash_calculado!: string;

  @Column({ type: 'varchar', nullable: false, default: () => "'n/a'" })
  identificacao!: string;

  @Column({ type: 'varchar', nullable: false, default: () => "'n/a'" })
  processo!: string;

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

  @Column({ type: 'float', nullable: true, default: () => '0' })
  file_size?: number;
}
