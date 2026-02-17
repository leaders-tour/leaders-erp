import { createApp } from './app';

const port = Number(process.env.API_PORT ?? 4000);

createApp()
  .then((app) => {
    app.listen(port, () => {
      process.stdout.write(`API listening on http://localhost:${port}/graphql\n`);
    });
  })
  .catch((error: unknown) => {
    process.stderr.write(`Failed to start API: ${String(error)}\n`);
    process.exit(1);
  });
