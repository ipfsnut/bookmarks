









// src/services/metadata/types.ts
export interface BaseMetadata {
  title: string;
  description?: string;
  image?: string;
  tags?: string[];
  external_url?: string;
  created_at?: string;
  updated_at?: string;
}

export enum ContentType {
  BOOK = 'book',
  ARTICLE = 'article',
  WEBSITE = 'website'
  // Add new types here
}

// Form field definition
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'url' | 'tags' | 'select' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{value: string, label: string}>; // For select fields
  validation?: (value: any) => string | null; // Return error message or null if valid
}

// Schema registration interface
export interface SchemaDefinition {
  type: ContentType;
  name: string;
  description: string;
  icon: string; // Icon component or name
  fields: FormField[];
  createMetadata: (data: any) => any;
  validateMetadata: (data: any) => Record<string, string> | null;
  extractMetadata?: (source: string) => Promise<any>;
  renderForm?: (props: any) => JSX.Element;
}