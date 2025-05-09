// src/services/metadata/schemas/BookSchema.ts
import { ContentType, FormField } from '../types';
import { BaseSchema } from './BaseSchema';

export interface BookMetadata {
  type: ContentType.BOOK;
  title: string;
  author: string | string[];
  description?: string;
  image?: string;
  isbn?: string;
  doi?: string;
  publisher?: string;
  publish_date?: string;
  language?: string;
  edition?: string;
  page_count?: number;
  bisac_codes?: string[];
  translators?: string[];
  series?: string;
  volume?: string;
  tags?: string[];
  external_url?: string;
}

export class BookSchema extends BaseSchema {
  type = ContentType.BOOK;
  name = 'Book';
  description = 'Create a bookmark for a book';
  icon = 'BookIcon';
  
  // Book-specific fields
  private bookFields: FormField[] = [
    {
      name: 'author',
      label: 'Author',
      type: 'text',
      required: true,
      placeholder: 'Author name(s)',
      helpText: 'For multiple authors, separate with commas',
      validation: (value) => !value ? 'Author is required' : null
    },
    {
      name: 'isbn',
      label: 'ISBN',
      type: 'text',
      placeholder: 'ISBN',
      validation: (value) => {
        if (!value) return null;
        // Simple ISBN validation
        const isbnRegex = /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/i;
        return isbnRegex.test(value) ? null : 'Invalid ISBN format';
      }
    },
    {
      name: 'doi',
      label: 'DOI',
      type: 'text',
      placeholder: 'DOI',
    },
    {
      name: 'publisher',
      label: 'Publisher',
      type: 'text',
      placeholder: 'Publisher name',
    },
    {
      name: 'publish_date',
      label: 'Publication Date',
      type: 'date',
      placeholder: 'YYYY-MM-DD',
    },
    {
      name: 'language',
      label: 'Language',
      type: 'text',
      placeholder: 'Language',
    },
    {
      name: 'edition',
      label: 'Edition',
      type: 'text',
      placeholder: 'Edition',
    },
    {
      name: 'page_count',
      label: 'Page Count',
      type: 'number',
      placeholder: 'Number of pages',
    },
    {
      name: 'bisac_codes',
      label: 'BISAC Codes',
      type: 'tags',
      placeholder: 'Add BISAC codes',
      helpText: 'Press Enter or comma to add a code',
    },
    {
      name: 'translators',
      label: 'Translators',
      type: 'tags',
      placeholder: 'Add translators',
      helpText: 'Press Enter or comma to add a translator',
    },
    {
      name: 'series',
      label: 'Series',
      type: 'text',
      placeholder: 'Series name',
    },
    {
      name: 'volume',
      label: 'Volume',
      type: 'text',
      placeholder: 'Volume or part number',
    },
  ];
  
  // Combine base fields with book-specific fields
  fields = [...this.baseFields, ...this.bookFields];
  
  createMetadata(data: any): BookMetadata {
    // Process author field - convert comma-separated string to array if needed
    let author = data.author;
    if (typeof author === 'string' && author.includes(',')) {
      author = author.split(',').map(a => a.trim()).filter(Boolean);
    }
    
    // Process tags and other array fields
    const tags = Array.isArray(data.tags) ? data.tags : 
      (typeof data.tags === 'string' ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
    
    const bisac_codes = Array.isArray(data.bisac_codes) ? data.bisac_codes : 
      (typeof data.bisac_codes === 'string' ? data.bisac_codes.split(',').map(c => c.trim()).filter(Boolean) : []);
    
    const translators = Array.isArray(data.translators) ? data.translators : 
      (typeof data.translators === 'string' ? data.translators.split(',').map(t => t.trim()).filter(Boolean) : []);
    
    return {
      type: ContentType.BOOK,
      title: data.title,
      author,
      description: data.description,
      image: data.image,
      isbn: data.isbn,
      doi: data.doi,
      publisher: data.publisher,
      publish_date: data.publish_date,
      language: data.language,
      edition: data.edition,
      page_count: data.page_count ? Number(data.page_count) : undefined,
      bisac_codes,
      translators,
      series: data.series,
      volume: data.volume,
      tags,
      external_url: data.external_url
    };
  }
  
  async extractMetadata(source: string): Promise<Partial<BookMetadata>> {
    // Check if it's an ISBN
    const isbnRegex = /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/i;
    
    if (isbnRegex.test(source)) {
      // Extract metadata from ISBN using Google Books API or similar
      try {
        const isbn = source.replace(/[^0-9X]/gi, '');
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          const book = data.items[0].volumeInfo;
          
          return {
            type: ContentType.BOOK,
            title: book.title,
            author: book.authors || [],
            description: book.description,
            image: book.imageLinks?.thumbnail,
            isbn: isbn,
            publisher: book.publisher,
            publish_date: book.publishedDate,
            language: book.language,
            page_count: book.pageCount,
            tags: book.categories || []
          };
        }
      } catch (error) {
        console.error('Error extracting book metadata:', error);
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
          type: ContentType.BOOK,
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
    
    return { type: ContentType.BOOK };
  }
}
