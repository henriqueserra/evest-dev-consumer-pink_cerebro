import { ensureDataSourceInitialized } from '../../everest.orm.service';
import { User } from '../entities/user';
import { EverestErrorServices } from '../everest.error.services';
import { EverestLogService } from '../everest.log.services';

export class UsersRepo {
  private logService: EverestLogService;
  private className: string;
  constructor() {
    this.logService = new EverestLogService();
    this.className = this.constructor.name;
  }

  async getUser(userEmail: string): Promise<User> {
    const methodName = `${this.className}.getUser`;
    this.logService.info({ message: `Iniciado ...`, method: methodName });
    try {
      const dataSource = await ensureDataSourceInitialized();
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { email: userEmail, is_active: true } });
      if (!user) throw new Error('User not found');
      return user;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({
        message: errorMessage,
        method: this.className,
        payload: { userEmail },
        persist: false,
      });
      throw error;
    }
  }

  async listAllUsers() {
    const methodName = `${this.className}.listAllUsers`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const repository = dataSource.getRepository(User);
      const users = await repository.find({
        where: {
          is_active: true,
        },
        order: { email: 'ASC' },
      });
      return users;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({ message: error.message, method: methodName });
      throw error;
    }
  }

  async saveUser(user: User): Promise<User> {
    const methodName = `${this.className}.saveUser`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const repository = dataSource.getRepository(User);
      return await repository.save(user);
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({ message: error.message, method: methodName });
      throw error;
    }
  }

  async updateUserLoginOrRefresh(user: User): Promise<User> {
    const methodName = `${this.className}.updateUserLoginOrRefresh`;
    try {
      const dataSource = await ensureDataSourceInitialized();
      const repository = dataSource.getRepository(User);
      user.last_login = new Date();
      return await repository.save(user);
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      await this.logService.error({ message: error.message, method: methodName });
      throw error;
    }
  }
}
