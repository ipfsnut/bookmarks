// src/services/metadata/schemas/WebsiteSchema.ts
import { ContentType, FormField } from '../types';
import { BaseSchema } from './BaseSchema';

export interface WebsiteMetadata {
  type: ContentType.WEBSITE;
  title: string;
  description?: string;
  image?: string;
  url: string;
  site_name?: string;
  author?: string | string[];
  published_date?: string;
  last_updated?: string;
  language?: string;
  favicon?: string;
  is_favorite?: boolean;
  category?: string;
  tags?: string[];
  notes?: string;
  external_url?: string;
}

export class WebsiteSchema extends BaseSchema {
  type = ContentType.WEBSITE;
  name = 'Website';
  description = 'Create a bookmark for a website';
  icon = 'GlobeIcon';
  
  // Website-specific fields
  private websiteFields: FormField[] = [
    {
      name: 'url',
      label: 'URL',
      type: 'url',
      required: true,
      placeholder: 'https://example.com',
      validation: (value: any) => {
        if (!value) return 'URL is required';
        // Basic URL validation
        try {
          new URL(value);
          return null;
        } catch (e) {
          return 'Invalid URL format';
        }
      }
    },
    {
      name: 'site_name',
      label: 'Site Name',
      type: 'text',
      placeholder: 'Website name',
    },
    {
      name: 'author',
      label: 'Author/Creator',
      type: 'text',
      placeholder: 'Creator of the content',
    },
    {
      name: 'published_date',
      label: 'Published Date',
      type: 'date',
      placeholder: 'YYYY-MM-DD',
    },
    {
      name: 'last_updated',
      label: 'Last Updated',
      type: 'date',
      placeholder: 'YYYY-MM-DD',
    },
    {
      name: 'language',
      label: 'Language',
      type: 'text',
      placeholder: 'e.g., en-US',
    },
    {
      name: 'favicon',
      label: 'Favicon URL',
      type: 'url',
      placeholder: 'https://example.com/favicon.ico',
    },
    {
      name: 'is_favorite',
      label: 'Favorite',
      type: 'checkbox',
      helpText: 'Mark as a favorite bookmark',
    },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'blog', label: 'Blog' },
        { value: 'news', label: 'News' },
        { value: 'reference', label: 'Reference' },
        { value: 'social', label: 'Social Media' },
        { value: 'entertainment', label: 'Entertainment' },
        { value: 'education', label: 'Education' },
        { value: 'business', label: 'Business' },
        { value: 'technology', label: 'Technology' },
        { value: 'other', label: 'Other' }
      ],
      placeholder: 'Select a category',
    },
    {
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
      placeholder: 'Your personal notes about this website',
    },
  ];
  
  // Combine base fields with website-specific fields
  fields = [...this.baseFields, ...this.websiteFields];
  
  createMetadata(data: any): WebsiteMetadata {
    // Process author field if needed
    let author = data.author;
    if (typeof author === 'string' && author.includes(',')) {
      author = author.split(',').map((a: string) => a.trim()).filter(Boolean);
    }
    
    // Process tags
    const tags = Array.isArray(data.tags) ? data.tags : 
      (typeof data.tags === 'string' ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
    
    return {
      type: ContentType.WEBSITE,
      title: data.title,
      description: data.description,
      image: data.image,
      url: data.url,
      site_name: data.site_name,
      author,
      published_date: data.published_date,
      last_updated: data.last_updated,
      language: data.language,
      favicon: data.favicon,
      is_favorite: data.is_favorite || false,
      category: data.category,
      tags,
      notes: data.notes,
      external_url: data.external_url || data.url
    };
  }
  
  async extractMetadata(source: string): Promise<Partial<WebsiteMetadata>> {
    // Only process URLs
    if (source.startsWith('http')) {
      try {
        const response = await fetch('/.netlify/functions/extract-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: source })
        });
        
        const data = await response.json();
        
        // Extract favicon if available
        let favicon = data.favicon;
        if (!favicon) {
          try {
            // Try to construct favicon URL
            const url = new URL(source);
            favicon = `${url.protocol}//${url.hostname}/favicon.ico`;
          } catch (e) {
            console.error('Error constructing favicon URL:', e);
          }
        }
        
        return {
          type: ContentType.WEBSITE,
          title: data.title || data.site_name || new URL(source).hostname,
          description: data.description,
          image: data.image,
          url: source,
          site_name: data.site_name,
          author: data.author || '',
          published_date: data.published_date,
          language: data.language,
          favicon,
          external_url: source
        };
      } catch (error) {
        console.error('Error extracting metadata from URL:', error);
      }
    }
    
    return { 
      type: ContentType.WEBSITE,
      title: '',
      url: source
    };
  }
}