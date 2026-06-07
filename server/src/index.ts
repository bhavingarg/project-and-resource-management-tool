import 'dotenv/config';
import app from './app';
import { AppConfig } from './config/app.config';
import { DatabaseConnection } from './config/database.config';

const startServer = async (): Promise<void> => {
    await DatabaseConnection.connect();

    app.listen(AppConfig.port, () => {
        console.log(`PRM Server running on port ${AppConfig.port}`);
    });
};

startServer();
