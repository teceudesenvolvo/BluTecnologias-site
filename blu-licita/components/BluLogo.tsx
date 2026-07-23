import React from 'react';
import Logo from '../../assets/LOGO BLU SISTEMAS_Prancheta 1 cópia.png';

export const BluLogo: React.FC<{ compact?: boolean; light?: boolean }> = ({ compact }) => (
  <div className={`flex items-center ${compact ? 'justify-center' : ''}`} aria-label="Blu">
    <img
      src={Logo}
      alt="Blu"
      className={`${compact ? 'h-10 w-10' : 'h-12 w-12'} rounded-2xl object-cover shadow-sm`}
    />
  </div>
);
