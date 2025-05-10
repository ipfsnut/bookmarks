// src/services/metadata/schemas/index.ts
import { ContentType, SchemaDefinition } from '../types';
import { BookSchema } from './BookSchema';
import { ArticleSchema } from './ArticleSchema';
import { WebsiteSchema } from './WebsiteSchema';

// Initialize schema instances
const bookSchema = new BookSchema();
const articleSchema = new ArticleSchema();
const websiteSchema = new WebsiteSchema();

// Export a map of content types to schema instances
export const schemas: Record<ContentType, SchemaDefinition> = {
  [ContentType.BOOK]: bookSchema,
  [ContentType.ARTICLE]: articleSchema,
  [ContentType.WEBSITE]: websiteSchema,
};