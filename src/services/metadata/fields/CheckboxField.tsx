import React from 'react';

interface CheckboxFieldProps {
  name: string;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  required?: boolean;
  helpText?: string;
  disabled?: boolean;
}

const CheckboxField: React.FC<CheckboxFieldProps> = ({
  name,
  label,
  value = false,
  onChange,
  error,
  required = false,
  helpText,
  disabled = false
}) => {
  return (
    <div className="relative flex items-start">
      <div className="flex items-center h-5">
        <input
          id={name}
          name={name}
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className={`focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded ${
            error ? 'border-red-300' : ''
          }`}
          required={required}
          disabled={disabled}
        />
      </div>
      <div className="ml-3 text-sm">
        <label htmlFor={name} className="font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {helpText && !error && (
          <p className="text-gray-500">{helpText}</p>
        )}
        {error && (
          <p className="text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
};

export default CheckboxField;