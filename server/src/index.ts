import 'dotenv/config';
import app from './app';
import { AppConfig } from './config/app.config';
import { DatabaseConnection } from './config/database.config';
import { startScheduler } from './scheduler';
import { SystemConfigRepository } from './repositories/system-config.repository';

const startServer = async (): Promise<void> => {
    await DatabaseConnection.connect();
    await SystemConfigRepository.initialize();

    app.listen(AppConfig.port, () => {
        console.log(`PRM Server running on port ${AppConfig.port}`);
    });

    startScheduler();
};

startServer();
