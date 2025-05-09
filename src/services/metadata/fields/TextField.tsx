import React from 'react';

interface TextFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
}

const TextField: React.FC<TextFieldProps> = ({
  name,
  label,
  value = '',
  onChange,
  error,
  required = false,
  placeholder,
  helpText,
  disabled = false
}) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1">
        <input
          type="text"
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md ${
            error ? 'border-red-300' : ''
          }`}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
        />
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

export default TextField;