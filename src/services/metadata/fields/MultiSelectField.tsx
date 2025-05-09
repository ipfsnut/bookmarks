import React, { useState } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface MultiSelectFieldProps {
  name: string;
  label: string;
  value: string[];
  options: SelectOption[];
  onChange: (value: string[]) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
}

const MultiSelectField: React.FC<MultiSelectFieldProps> = ({
  name,
  label,
  value = [],
  options = [],
  onChange,
  error,
  required = false,
  placeholder,
  helpText,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };
  
  const getSelectedLabels = () => {
    return value
      .map(v => options.find(o => o.value === v)?.label)
      .filter(Boolean)
      .join(', ');
  };
  
  return (
    <div className="relative">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1 relative">
        <button
          type="button"
          className={`bg-white relative w-full border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
            error ? 'border-red-300' : ''
          }`}
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="block truncate">
            {value.length > 0 ? getSelectedLabels() : (placeholder || 'Select options')}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </span>
        </button>
        
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            {options.map((option) => (
              <div
                key={option.value}
                className={`${
                  value.includes(option.value) ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                } cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50`}
                onClick={() => toggleOption(option.value)}
              >
                <span className={`block truncate ${value.includes(option.value) ? 'font-medium' : 'font-normal'}`}>
                  {option.label}
                </span>
                {value.includes(option.value) && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
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

export default MultiSelectField;