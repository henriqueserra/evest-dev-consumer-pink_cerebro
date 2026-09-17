import dotenv from 'dotenv';
import { EverestLogService } from './libs/everest.log.services';
import { EverestErrorServices } from './libs/everest.error.services';
import { AppDataSource } from './everest.orm.service';
import { PosIntegracaoSqs } from './SqsQueue/posIntegracaoSqs';

dotenv.config();

const routeName = 'start';
const logService = new EverestLogService();

const tempo = process.env.ENVIRONMENT === 'Prod' ? 1000 : 1000;

const start = async () => {
  try {
    do {
      // debugger;
      await new PosIntegracaoSqs().processaFila();
      // debugger;

      debugger;
      await new Promise((resolve) => setTimeout(resolve, tempo));
    } while (true);
  } catch (error: any) {
    const errorMessage = EverestErrorServices.getError(error);
    logService.error({ message: errorMessage, method: routeName, persist: false });
  }
};

AppDataSource.initialize()
  .then(async () => {
    console.log('Database connected');
    await start();
  })
  .catch((error) => {
    console.error('Error connecting to the database', error);
    process.exit(1);
  });
