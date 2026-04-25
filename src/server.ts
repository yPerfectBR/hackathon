import { buildApp } from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./database/mongoose";

async function bootstrap() {
  await connectDatabase(env.MONGO_URI);

  const app = buildApp();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

void bootstrap();
