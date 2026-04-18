import React from 'react';
import PropTypes from 'prop-types';

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'btn-dna'; // Uses the custom Tailwind class defined in main.css
  
  const variants = {
    primary: 'bg-brand-dark text-white hover:bg-brand-gold shadow-lg',
    secondary: 'bg-transparent text-brand-dark border-2 border-brand-dark hover:bg-brand-dark hover:text-white',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed active:scale-100 hover:brightness-100 hover:shadow-none' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${disabledStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Button;
