import React from 'react';

interface NumberFieldProps {
  name: string;
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

const NumberField: React.FC<NumberFieldProps> = ({
  name,
  label,
  value,
  onChange,
  error,
  required = false,
  placeholder,
  helpText,
  min,
  max,
  step = 1,
  disabled = false
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(undefined);
    } else {
      onChange(Number(val));
    }
  };

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1">
        <input
          type="number"
          id={name}
          name={name}
          value={value === undefined ? '' : value}
          onChange={handleChange}
          className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md ${
            error ? 'border-red-300' : ''
          }`}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
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

export default NumberField;