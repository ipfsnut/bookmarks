// src/services/metadata/schemas/ArticleSchema.ts
import { ContentType, FormField } from '../types';
import { BaseSchema } from './BaseSchema';

export interface ArticleMetadata {
  type: ContentType.ARTICLE;
  title: string;
  author: string | string[];
  description?: string;
  image?: string;
  doi?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publish_date?: string;
  publisher?: string;
  abstract?: string;
  keywords?: string[];
  url?: string;
  tags?: string[];
  external_url?: string;
}

export class ArticleSchema extends BaseSchema {
  type = ContentType.ARTICLE;
  name = 'Academic Article';
  description = 'Create a bookmark for an academic or journal article';
  icon = 'FileTextIcon';
  
  // Article-specific fields
  private articleFields: FormField[] = [
    {
      name: 'author',
      label: 'Author(s)',
      type: 'text',
      required: true,
      placeholder: 'Author name(s)',
      helpText: 'For multiple authors, separate with commas',
      validation: (value: any) => !value ? 'Author is required' : null
    },
    {
      name: 'doi',
      label: 'DOI',
      type: 'text',
      placeholder: 'e.g., 10.1000/xyz123',
      helpText: 'Digital Object Identifier',
      validation: (value: string) => {
        if (!value) return null;
        // Basic DOI validation
        const doiRegex = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;
        return doiRegex.test(value) ? null : 'Invalid DOI format';
      }
    },
    {
      name: 'journal',
      label: 'Journal',
      type: 'text',
      placeholder: 'Journal name',
    },
    {
      name: 'volume',
      label: 'Volume',
      type: 'text',
      placeholder: 'Volume number',
    },
    {
      name: 'issue',
      label: 'Issue',
      type: 'text',
      placeholder: 'Issue number',
    },
    {
      name: 'pages',
      label: 'Pages',
      type: 'text',
      placeholder: 'e.g., 123-145',
    },
    {
      name: 'publish_date',
      label: 'Publication Date',
      type: 'date',
      placeholder: 'YYYY-MM-DD',
    },
    {
      name: 'publisher',
      label: 'Publisher',
      type: 'text',
      placeholder: 'Publisher name',
    },
    {
      name: 'abstract',
      label: 'Abstract',
      type: 'textarea',
      placeholder: 'Article abstract',
    },
    {
      name: 'keywords',
      label: 'Keywords',
      type: 'tags',
      placeholder: 'Add keywords',
      helpText: 'Press Enter or comma to add a keyword',
    },
    {
      name: 'url',
      label: 'URL',
      type: 'url',
      placeholder: 'https://example.com/article',
    },
  ];
  
  // Combine base fields with article-specific fields
  fields = [...this.baseFields, ...this.articleFields];
  
  createMetadata(data: any): ArticleMetadata {
    // Process author field - convert comma-separated string to array if needed
    let author = data.author;
    if (typeof author === 'string' && author.includes(',')) {
      author = author.split(',').map((a: string) => a.trim()).filter(Boolean);
    }
    
    // Process tags and keywords
    const tags = Array.isArray(data.tags) ? data.tags : 
      (typeof data.tags === 'string' ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
    
    const keywords = Array.isArray(data.keywords) ? data.keywords : 
      (typeof data.keywords === 'string' ? data.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []);
    
    return {
      type: ContentType.ARTICLE,
      title: data.title,
      author,
      description: data.description,
      image: data.image,
      doi: data.doi,
      journal: data.journal,
      volume: data.volume,
      issue: data.issue,
      pages: data.pages,
      publish_date: data.publish_date,
      publisher: data.publisher,
      abstract: data.abstract,
      keywords,
      url: data.url,
      tags,
      external_url: data.external_url
    };
  }
  
  async extractMetadata(source: string): Promise<Partial<ArticleMetadata>> {
    // Check if it's a DOI
    const doiRegex = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;
    const doiInUrlRegex = /doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)$/i;
    
    let doi = source;
    
    // Extract DOI from URL if needed
    if (source.includes('doi.org')) {
      const match = source.match(doiInUrlRegex);
      if (match && match[1]) {
        doi = match[1];
      }
    }
    
    if (doiRegex.test(doi)) {
      // Use CrossRef or similar API to extract metadata from DOI
      try {
        const response = await fetch(`https://api.crossref.org/works/${doi}`);
        const data = await response.json();
        
        if (data && data.message) {
          const article = data.message;
          
          return {
            type: ContentType.ARTICLE,
            title: article.title ? article.title[0] : '',
            author: article.author ? article.author.map((a: any) => 
              `${a.given || ''} ${a.family || ''}`).filter((name: string) => name.trim()) : [],
            doi: doi,
            journal: article['container-title'] ? article['container-title'][0] : '',
            volume: article.volume || '',
            issue: article.issue || '',
            pages: article.page || '',
            publish_date: article.created ? article.created['date-time'] : '',
            publisher: article.publisher || '',
            url: article.URL || '',
            external_url: `https://doi.org/${doi}`
          };
        }
      } catch (error) {
        console.error('Error extracting article metadata:', error);
      }
    }
    
    // If it's a URL, try to extract Open Graph data
    if (source.startsWith('http')) {
      try {
        const response = await fetch('/.netlify/functions/extract-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: source })
        });
        
        const data = await response.json();
        return {
          type: ContentType.ARTICLE,
          title: data.title,
          author: data.author || '',
          description: data.description,
          image: data.image,
          publisher: data.publisher,
          external_url: source
        };
      } catch (error) {
        console.error('Error extracting metadata from URL:', error);
      }
    }
    
    return { type: ContentType.ARTICLE };
  }
}