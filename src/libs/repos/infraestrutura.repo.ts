import { ensureDataSourceInitialized } from '../../everest.orm.service';
import { Fila } from '../entities/infraestrutura_entities';

export const getStatusFila = async (fila: string) => {
  const dataSource = await ensureDataSourceInitialized();
  const repository = dataSource.getRepository(Fila);
  const statusFila = repository.findOne({ where: { fila } });
  if (!statusFila) throw new Error('Fila não encontrada');
  return statusFila;
};
