import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  'base.graphql',
  'scalars.graphql',
  'region.graphql',
  'location.graphql',
  'location-guide.graphql',
  'lodging.graphql',
  'meal-set.graphql',
  'segment.graphql',
  'plan.graphql',
  'time-block.graphql',
  'activity.graphql',
  'override.graphql',
];

export const typeDefs = files.map((fileName) => readFileSync(path.join(__dirname, fileName), 'utf8'));
