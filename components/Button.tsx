import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  // Apple-style: rounded-xl to rounded-2xl dependent on size usually, but stick to fixed consistent curve
  
  const variants = {
    // Apple Blue: #0071e3 - approximated with blue-600 for Tailwind consistency or custom hex
    primary: "bg-[#0071e3] text-white hover:bg-[#0077ED] shadow-sm hover:shadow border border-transparent",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-transparent",
    white: "bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 shadow-sm hover:shadow",
    danger: "bg-white text-red-600 border border-red-100 hover:bg-red-50 hover:border-red-200 shadow-sm",
    ghost: "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/50",
    outline: "bg-transparent text-[#0071e3] border border-[#0071e3]/30 hover:border-[#0071e3] hover:bg-blue-50"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[13px] rounded-[10px]",
    md: "px-5 py-2.5 text-[15px] rounded-[12px]",
    lg: "px-6 py-3.5 text-[17px] rounded-[14px]",
    xl: "px-8 py-4 text-[19px] font-semibold rounded-[16px]"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};
