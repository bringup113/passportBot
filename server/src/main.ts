import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import os from 'os';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen(port, host);

  // Pretty startup logs
  const nets = os.networkInterfaces();
  let lan: string | undefined;
  for (const key of Object.keys(nets)) {
    const addrs = nets[key] || [];
    for (const addr of addrs) {
      // @ts-ignore Node type narrowing
      if (addr && addr.family === 'IPv4' && !addr.internal) {
        // @ts-ignore
        lan = addr.address;
        break;
      }
    }
    if (lan) break;
  }
  // eslint-disable-next-line no-console
  console.log('Server is running:');
  // eslint-disable-next-line no-console
  console.log(`- Local:    http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`- Network:  http://${lan ?? host}:${port}`);
}
bootstrap();
