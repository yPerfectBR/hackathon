import { MongoMemoryServer } from "mongodb-memory-server";
import { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app";
import { connectDatabase, disconnectDatabase } from "../../src/database/mongoose";

let mongoServer: MongoMemoryServer;
let app: FastifyInstance;

export async function createTestApp(): Promise<FastifyInstance> {
  mongoServer = await MongoMemoryServer.create();
  await connectDatabase(mongoServer.getUri());
  app = buildApp();
  await app.ready();
  return app;
}

export async function closeTestApp(): Promise<void> {
  if (app) {
    await app.close();
  }
  await disconnectDatabase();
  if (mongoServer) {
    await mongoServer.stop();
  }
}
