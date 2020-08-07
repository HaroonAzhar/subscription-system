/* eslint-disable @typescript-eslint/unbound-method */
import fs from 'fs';
import { inject, injectable } from 'inversify';
import { join } from 'path';
import { DocumentStore, IDocumentSession } from 'ravendb';

import { ConfigService } from '../config/config.service';
import { env } from '../env';
import { createEverLogger } from '../helpers/Log';

@injectable()
export class ServicesApp {
  protected db: IDocumentSession;
  private log = createEverLogger({ name: 'main' });

  constructor(
    @inject(ConfigService)
    _configService: ConfigService,
  ) {
    process.on('SIGINT', this.gracefulExit).on('SIGTERM', this.gracefulExit);
  }
  async start(): Promise<void> {
    await this.connectDB();
  }
  async connectDB(): Promise<IDocumentSession> {
    try {
      if (this.db) {
        this.log.info('Return Existing Session');
        return this.db;
      }
      this.log.info('Trying to connect to database');
      const authOptions = {
        certificate: fs.readFileSync(join(process.cwd(), env.DB_CERTS)),
        type: 'pfx',
      };
      const store = new DocumentStore(
        env.DB_URI,
        env.DB_NAME,
        authOptions as any,
      );
      store.conventions.findCollectionNameForObjectLiteral = (entity: any) =>
        entity?.collection;
      store.initialize();
      this.db = store.openSession();
      return this.db;
    } catch (err) {
      this.log.error(err, 'Sever initialization failed! Cannot connect to DB');
    }
  }
  private gracefulExit() {
    try {
      if (this.db != null) {
        this.db = null;
        this.log.info('Mongoose default connection with DB :');
        process.exit(0);
      }
    } catch (err) {
      process.exit(0);
    }
  }
}
