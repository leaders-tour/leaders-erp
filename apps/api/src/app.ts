import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import express from 'express';
import { createContext } from './context';
import { toGraphQLErrorExtensions } from './lib/errors';
import { resolvers } from './resolvers';
import { typeDefs } from './schema';

export async function createApp(): Promise<express.Express> {
  const app = express();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (formattedError, error) => {
      const extensions = toGraphQLErrorExtensions(error.originalError);
      return {
        ...formattedError,
        extensions: {
          ...formattedError.extensions,
          ...extensions,
        },
      };
    },
  });

  await server.start();

  app.use('/graphql', cors(), express.json(), expressMiddleware(server, { context: async () => createContext() }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
