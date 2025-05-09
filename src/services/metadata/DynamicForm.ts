// src/components/metadata/DynamicForm.tsx
import React, { useState, useEffect } from 'react';
import { ContentType, FormField } from '../../services/metadata/types';
import { metadataService } from '../../services/metadata/MetadataService';

// Import form field components
import TextField from './fields/TextField';
import TextareaField from './fields/TextareaField';
import NumberField from './fields/NumberField';
import DateField from './fields/DateField';
import UrlField from './fields/UrlField';
import TagsField from './fields/TagsField';
import SelectField from './fields/SelectField';
import CheckboxField from './fields/CheckboxField';

interface DynamicFormProps {
  contentType: ContentType;
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel?: () => void;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ 
  contentType, 
  initialData = {}, 
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<any>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get schema for the selected content type
  const schema = metadataService.getSchema(contentType);
  
  // Update form data when content type changes
  useEffect(() => {
    setFormData(initialData || { type: contentType });
    setErrors({});
  }, [contentType, initialData]);
  
  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate the data
      const validationErrors = schema.validateMetadata(formData);
      
      if (validationErrors) {
        setErrors(validationErrors);
        setIsSubmitting(false);
        return;
      }
      
      // Create metadata object
      const metadata = schema.createMetadata(formData);
      
      // Call onSubmit with the metadata
      await onSubmit(metadata);
      
      // Reset form if submission was successful
      setFormData({ type: contentType });
      setErrors({});
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setErrors({ 
        _form: error.message || 'An error occurred while submitting the form' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render the appropriate field component based on field type
  const renderField = (field: FormField) => {
    const value = formData[field.name];
    const error = errors[field.name];
    const commonProps = {
      key: field.name,
      name: field.name,
      label: field.label,
      value: value,
      onChange: (value: any) => handleChange(field.name, value),
      error: error,
      required: field.required,
      placeholder: field.placeholder,
      helpText: field.helpText
    };
    
    switch (field.type) {
      case 'text':
        return <TextField {...commonProps} />;
      case 'textarea':
        return <TextareaField {...commonProps} />;
      case 'number':
        return <NumberField {...commonProps} />;
      case 'date':
        return <DateField {...commonProps} />;
      case 'url':
        return <UrlField {...commonProps} />;
      case 'tags':
        return <TagsField {...commonProps} />;
      case 'select':
        return <SelectField {...commonProps} options={field.options || []} />;
      case 'checkbox':
        return <CheckboxField {...commonProps} />;
      default:
        return <TextField {...commonProps} />;
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form title */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-medium text-gray-900">
          {schema.name}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {schema.description}
        </p>
      </div>
      
      {/* General error message */}
      {errors._form && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              {/* Error icon */}
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {errors._form}
              </h3>
            </div>
          </div>
        </div>
      )}
      
      {/* Form fields */}
      <div className="space-y-6">
        {schema.fields.map(field => renderField(field))}
      </div>
      
      {/* Form actions */}
      <div className="flex justify-end space-x-3 pt-5 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

export default DynamicForm;
