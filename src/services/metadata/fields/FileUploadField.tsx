import React, { useState, useRef } from 'react';

interface FileUploadFieldProps {
  name: string;
  label: string;
  value: File | null;
  onChange: (value: File | null) => void;
  error?: string;
  required?: boolean;
  helpText?: string;
  accept?: string;
  disabled?: boolean;
  maxSizeMB?: number;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  name,
  label,
  value,
  onChange,
  error,
  required = false,
  helpText,
  accept = '*/*',
  disabled = false,
  maxSizeMB = 5
}) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }
    
    // Check file type if accept is specified
    if (accept !== '*/*') {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const fileType = file.type;
      
      // Check if file type matches any of the accepted types
      const isAccepted = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          // Handle wildcards like 'image/*'
          const category = type.split('/')[0];
          return fileType.startsWith(`${category}/`);
        }
        return type === fileType;
      });
      
      if (!isAccepted) {
        return 'File type not accepted';
      }
    }
    
    return null;
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0] && !disabled) {
      const file = e.dataTransfer.files[0];
      const validationError = validateFile(file);
      
      if (validationError) {
        // Set error state
        // This would typically be handled by the parent component
        console.error(validationError);
        return;
      }
      
      onChange(file);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validationError = validateFile(file);
      
      if (validationError) {
        // Set error state
        // This would typically be handled by the parent component
        console.error(validationError);
        return;
      }
      
      onChange(file);
    }
  };
  
  const handleButtonClick = () => {
    inputRef.current?.click();
  };
  
  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };
  
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div 
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
          dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
        } ${error ? 'border-red-300' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-1 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          {value ? (
            <div className="flex flex-col items-center">
              <p className="text-sm text-gray-700">{value.name}</p>
              <p className="text-xs text-gray-500">
                {(value.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                type="button"
                onClick={handleRemove}
                className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={disabled}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor={name}
                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
              >
                <span>Upload a file</span>
                <input
                  id={name}
                  name={name}
                  type="file"
                  className="sr-only"
                  ref={inputRef}
                  onChange={handleChange}
                  accept={accept}
                  disabled={disabled}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
          )}
          
          <p className="text-xs text-gray-500">
            {accept === '*/*' ? 'Any file type' : accept.replace(/,/g, ', ')} up to {maxSizeMB}MB
          </p>
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

export default FileUploadField;