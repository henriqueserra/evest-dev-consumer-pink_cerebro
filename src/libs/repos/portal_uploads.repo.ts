import { Equal } from 'typeorm';
import { PortalUploads } from '../entities/portal_uploads';
import { EverestErrorServices } from '../everest.error.services';
import { EverestLogService } from '../everest.log.services';
import { ensureDataSourceInitialized } from '../../everest.orm.service';

export class PortalUploadsRepo {
  private logService: EverestLogService;
  private className: string;
  constructor() {
    this.logService = new EverestLogService();
    this.className = this.constructor.name;
  }

  async updateMigrado(pk_portal_uploads: string, migrado: boolean) {
    const methodName = `${this.className}.updateMigrado`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const repository = dataSource.getRepository(PortalUploads);
      const portalUploads = await repository.findOne({ where: { pk_portal_uploads } });
      if (!portalUploads) throw new Error('PortalUploads não encontrado');
      portalUploads.migrado = migrado;
      await repository.upsert(portalUploads, ['pk_portal_uploads']);
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { pk_portal_uploads, migrado },
        persist: false,
      });
      debugger;
      throw new Error(errorMessage);
    }
  }

  async hashCalculadoExiste(hash_calculado: string, cliente: string): Promise<PortalUploads | null> {
    const methodName = `${this.className}.hashCalculadoExiste`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const repository = dataSource.getRepository(PortalUploads);
      const portalUploads = await repository.findOne({ where: { hash_calculado, cliente: Equal(cliente) } });
      return portalUploads ? portalUploads : null;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: { hash_calculado, cliente },
        persist: false,
      });
      debugger;
      throw new Error(errorMessage);
    }
  }
  async save(portalUploads: PortalUploads): Promise<PortalUploads> {
    const methodName = `${this.className}.save`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const repository = dataSource.getRepository(PortalUploads);
      return await repository.save(portalUploads);
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: methodName,
        payload: portalUploads,
        persist: false,
      });
      throw new Error(errorMessage);
    }
  }
}
