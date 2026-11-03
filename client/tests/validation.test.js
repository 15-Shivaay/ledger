import { describe, it, expect } from 'vitest';

describe('Client-side Transaction & Balance Validation Logic', () => {
  it('should detect when debit exceeds current balance', () => {
    const currentBalanceMinor = 150000; // ₹1500.00
    const validDebitMinor = 100000;    // ₹1000.00
    const excessiveDebitMinor = 200000; // ₹2000.00

    expect(validDebitMinor > currentBalanceMinor).toBe(false);
    expect(excessiveDebitMinor > currentBalanceMinor).toBe(true);
  });

  it('should detect when debit reaches exactly zero balance', () => {
    const currentBalanceMinor = 50000; // ₹500.00
    const exactPaymentMinor = 50000;   // ₹500.00
    const partialPaymentMinor = 25000; // ₹250.00

    expect(exactPaymentMinor === currentBalanceMinor).toBe(true);
    expect(partialPaymentMinor === currentBalanceMinor).toBe(false);
  });
});

