import { ensureDataSourceInitialized } from '../../everest.orm.service';
import { Cliente } from '../entities/config_entities';
import { EverestLogService } from '../everest.log.services';

export class ClienteRepo {
  private logService: EverestLogService;
  private className: string;
  constructor() {
    this.logService = new EverestLogService();
    this.className = this.constructor.name;
  }

  async getCliente(clienteName: string): Promise<Cliente> {
    const methodName = `${this.className}.getCliente`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const clienteRepo = dataSource.getRepository(Cliente);
      const cliente = await clienteRepo.findOne({ where: { cliente: clienteName } });
      if (!cliente) throw new Error('Cliente não encontrado');
      return cliente;
    } catch (error: any) {
      throw error;
    }
  }

  async getClientes(): Promise<Cliente[]> {
    const methodName = `${this.className}.getCliente`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const clienteRepo = dataSource.getRepository(Cliente);
      const clientes = await clienteRepo.find({ where: { is_active: true }, order: { cliente: 'ASC' } });
      return clientes ?? [];
    } catch (error: any) {
      throw error;
    }
  }
}
