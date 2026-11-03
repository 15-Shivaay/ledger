import React from 'react';

export default function Logo({ className = "w-10 h-10", size }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="Customer Ledger Logo"
    >
      <defs>
        <linearGradient id="navLedgerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="navGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Rounded Base Icon Badge */}
      <rect width="48" height="48" rx="12" fill="url(#navLedgerGrad)" />
      {/* Shadow Glow */}
      <rect x="8" y="8" width="32" height="32" rx="6" fill="white" fillOpacity="0.1" />
      {/* Ledger Left Page */}
      <path d="M12 13C12 11.8954 12.8954 11 14 11H23V35H14C12.8954 35 12 34.1046 12 33V13Z" fill="#F8FAFC" />
      {/* Ledger Right Page */}
      <path d="M25 11H34C35.1046 11 36 11.8954 36 13V33C36 34.1046 35.1046 35 34 35H25V11Z" fill="#FFFFFF" />
      {/* Book Spine Center Fold */}
      <rect x="23" y="11" width="2" height="24" fill="#047857" />
      {/* Left Page Entry Lines */}
      <rect x="15" y="16" width="5.5" height="1.8" rx="0.9" fill="#059669" />
      <rect x="15" y="21" width="5.5" height="1.8" rx="0.9" fill="#059669" />
      <rect x="15" y="26" width="4" height="1.8" rx="0.9" fill="#059669" />
      {/* Right Page: Indian Rupee (₹) Financial Emblem */}
      {/* Top Bar */}
      <path d="M28 16H33" stroke="url(#navGoldGrad)" strokeWidth="1.8" strokeLinecap="round" />
      {/* Second Bar */}
      <path d="M28 19.5H32" stroke="url(#navGoldGrad)" strokeWidth="1.8" strokeLinecap="round" />
      {/* Upper Loop */}
      <path d="M28.5 16V22.5C29.8 22.5 32 22.2 32 19.5C32 17 29.8 17 28.5 17" stroke="url(#navGoldGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Downward Leg */}
      <path d="M29.5 22.5L33 28.5" stroke="url(#navGoldGrad)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
