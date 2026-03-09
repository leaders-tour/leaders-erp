import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: process.env.WEB_GRAPHQL_URL ?? '../api/src/schema/**/*.graphql',
  documents: ['src/graphql/**/*.graphql'],
  generates: {
    'src/generated/': {
      preset: 'client',
      plugins: [],
    },
  },
};

export default config;
