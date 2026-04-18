import React from 'react';
import PropTypes from 'prop-types';

const Input = ({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className={`relative group w-full ${className}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="block text-slate-400 text-lg mb-1 group-focus-within:text-brand-blue transition-colors"
        >
          {label}
        </label>
      )}
      
      <div className={`relative border-b transition-all ${
        error ? 'border-red-500' : 'border-gray-200 group-focus-within:border-brand-blue'
      }`}>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`input-dna ${icon ? 'pr-10' : ''}`}
          {...props}
        />
        
        {icon && (
          <span className="absolute right-0 top-2 text-slate-300">
            {icon}
          </span>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

Input.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string.isRequired,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  error: PropTypes.string,
  icon: PropTypes.node,
  className: PropTypes.string,
};

export default Input;
