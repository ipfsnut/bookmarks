// src/services/metadata/MetadataService.ts
import { ContentType, SchemaDefinition } from './types';
import { schemas } from './schemas';

class MetadataService {
  private schemas: Record<ContentType, SchemaDefinition> = schemas;
  
  /**
   * Get all registered schemas
   */
  getSchemas(): SchemaDefinition[] {
    return Object.values(this.schemas);
  }
  
  /**
   * Get a specific schema by content type
   */
  getSchema(contentType: ContentType): SchemaDefinition {
    const schema = this.schemas[contentType];
    if (!schema) {
      throw new Error(`Schema not found for content type: ${contentType}`);
    }
    return schema;
  }
  
  /**
   * Register a new schema
   */
  registerSchema(schema: SchemaDefinition): void {
    this.schemas[schema.type] = schema;
  }
  
  /**
   * Create metadata for a specific content type
   */
  createMetadata(contentType: ContentType, data: any): any {
    const schema = this.getSchema(contentType);
    return schema.createMetadata(data);
  }
  
  /**
   * Validate metadata for a specific content type
   */
  validateMetadata(contentType: ContentType, data: any): Record<string, string> | null {
    const schema = this.getSchema(contentType);
    return schema.validateMetadata(data);
  }
  
  /**
   * Extract metadata from a source (URL, ISBN, DOI, etc.)
   */
  async extractMetadata(source: string): Promise<{ contentType: ContentType, metadata: any }> {
    // Try to detect content type
    const contentType = this.detectContentType(source);
    
    try {
      const schema = this.getSchema(contentType);
      const metadata = await schema.extractMetadata(source);
      return { contentType, metadata };
    } catch (error) {
      console.error(`Error extracting metadata for ${contentType}:`, error);
      return { 
        contentType, 
        metadata: { type: contentType } 
      };
    }
  }
  
  /**
   * Detect content type from a source
   */
  detectContentType(source: string): ContentType {
    // Check if it's a DOI
    if (source.startsWith('10.') || source.includes('doi.org')) {
      return ContentType.ARTICLE;
    }
    
    // Check if it's an ISBN (simple check)
    const isbnRegex = /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/i;
    if (isbnRegex.test(source)) {
      return ContentType.BOOK;
    }
    
    // Default to website for URLs
    if (source.startsWith('http') || source.includes('www.')) {
      return ContentType.WEBSITE;
    }
    
    // Default
    return ContentType.WEBSITE;
  }
  
  /**
   * Store metadata on IPFS
   */
  async storeMetadataOnIPFS(metadata: any): Promise<string> {
    try {
      // Use the API endpoint for storing metadata
      const response = await fetch('/.netlify/functions/store-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('session_token')}`
        },
        body: JSON.stringify({ metadata })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to store metadata');
      }
      
      const data = await response.json();
      return data.metadataUri;
    } catch (error) {
      console.error('Error storing metadata on IPFS:', error);
      throw error;
    }
  }
  
  /**
   * Fetch metadata from URI
   */
  async fetchMetadata(uri: string): Promise<any> {
    try {
      // Handle IPFS URIs
      if (uri.startsWith('ipfs://')) {
        uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }
      
      const response = await fetch(uri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Determine content type from metadata
      const contentType = data.type as ContentType || ContentType.WEBSITE;
      
      // Validate and format using the appropriate schema
      try {
        const schema = this.getSchema(contentType);
        return schema.createMetadata(data);
      } catch (error) {
        console.warn(`Error processing metadata with schema, returning raw data:`, error);
        return data;
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const metadataService = new MetadataService();
export default metadataService;
