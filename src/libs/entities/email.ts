import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

const schema_env = process.env.ENVIRONMENT === 'Prod' ? 'prod' : 'dev';

@Entity({ name: 'prod', schema: 'email' })
export class Email {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id?: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at?: Date;

  @Column({ type: 'varchar', array: true, nullable: false })
  to!: string[];

  @Column({ type: 'varchar', array: true, nullable: false })
  cc!: string[];

  @Column({ type: 'varchar', array: true, nullable: false })
  bcc!: string[];

  @Column({ type: 'varchar', nullable: false })
  subject!: string;

  @Column({ type: 'text', nullable: false })
  body!: string;

  @Column({ type: 'varchar', nullable: false, default: () => "'text/html'" })
  mime_type?: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments?: { s3_key: string; s3_bucket: string; s3_region: string }[];

  @Column({ type: 'uuid', nullable: true })
  pk?: string | null;

  @Column({ type: 'varchar', nullable: true })
  gmail_id?: string | null;

  @Column({ type: 'varchar', nullable: true })
  gmail_thread_id?: string | null;

  @Column({ type: 'boolean', nullable: false, default: () => 'false' })
  success?: boolean | null;

  @Column({ type: 'boolean', nullable: false, default: () => 'false' })
  portal_uploads?: boolean | null;

  @Column({ type: 'varchar', nullable: true })
  cliente?: string | null;

  @Column({ type: 'jsonb', nullable: false })
  from!: { email: string; name: string };

  @Column({ type: 'varchar', nullable: false })
  reply_to?: string;

  @Column({ type: 'jsonb', nullable: true })
  evidencia?: { s3_key: string; s3_bucket: string; s3_region: string };
}
