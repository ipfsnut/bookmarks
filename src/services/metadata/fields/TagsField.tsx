import React, { useState } from 'react';

interface TagsFieldProps {
  name: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
}

const TagsField: React.FC<TagsFieldProps> = ({
  name,
  label,
  value = [],
  onChange,
  error,
  required = false,
  placeholder,
  helpText,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };
  
  const addTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !value.includes(trimmedValue)) {
      onChange([...value, trimmedValue]);
      setInputValue('');
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };
  
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1">
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map(tag => (
            <span 
              key={tag} 
              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-indigo-100 text-indigo-800"
            >
              {tag}
              <button
                type="button"
                className="ml-1.5 inline-flex text-indigo-500 hover:text-indigo-600 focus:outline-none"
                onClick={() => removeTag(tag)}
                disabled={disabled}
              >
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <div className="flex">
          <input
            type="text"
            id={name}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addTag}
            className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md ${
              error ? 'border-red-300' : ''
            }`}
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>
      </div>
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default TagsField;