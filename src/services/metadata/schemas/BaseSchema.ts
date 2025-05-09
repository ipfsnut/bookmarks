// src/services/metadata/schemas/BaseSchema.ts
import { ContentType, BaseMetadata, FormField, SchemaDefinition } from '../types';

export abstract class BaseSchema implements SchemaDefinition {
  abstract type: ContentType;
  abstract name: string;
  abstract description: string;
  abstract icon: string;
  abstract fields: FormField[];
  
  // Common fields that all schemas should have
  protected baseFields: FormField[] = [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'Enter title',
      validation: (value) => !value ? 'Title is required' : null
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Enter description',
    },
    {
      name: 'image',
      label: 'Cover Image URL',
      type: 'url',
      placeholder: 'https://example.com/image.jpg',
    },
    {
      name: 'tags',
      label: 'Tags',
      type: 'tags',
      placeholder: 'Add tags',
      helpText: 'Press Enter or comma to add a tag'
    },
    {
      name: 'external_url',
      label: 'External URL',
      type: 'url',
      placeholder: 'https://example.com',
    }
  ];
  
  // Create metadata object from form data
  abstract createMetadata(data: any): any;
  
  // Validate metadata
  validateMetadata(data: any): Record<string, string> | null {
    const errors: Record<string, string> = {};
    
    // Validate required fields
    this.fields.forEach(field => {
      if (field.required && !data[field.name]) {
        errors[field.name] = `${field.label} is required`;
      }
      
      // Run custom validation if provided
      if (field.validation && data[field.name]) {
        const error = field.validation(data[field.name]);
        if (error) {
          errors[field.name] = error;
        }
      }
    });
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  // Extract metadata from external source (optional)
  async extractMetadata(source: string): Promise<any> {
    throw new Error('Extract metadata not implemented for this schema');
  }
  
  // Default form renderer (can be overridden)
  renderForm(props: any): JSX.Element {
    // This would be implemented by a higher-order component
    // that generates a form based on the fields definition
    return null as any;
  }
}
