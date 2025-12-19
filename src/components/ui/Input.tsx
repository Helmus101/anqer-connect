import React from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ icon, className = '', ...props }) => {
    return (
        <div className={`pally-input-wrapper ${className}`}>
            {icon && <span className="pally-input-icon">{icon}</span>}
            <input className="pally-input" {...props} />
        </div>
    );
};
