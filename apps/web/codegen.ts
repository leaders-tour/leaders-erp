import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: process.env.WEB_GRAPHQL_URL ?? 'http://localhost:4000/graphql',
  documents: ['src/graphql/**/*.graphql'],
  generates: {
    'src/generated/': {
      preset: 'client',
      plugins: [],
    },
  },
};

export default config;
