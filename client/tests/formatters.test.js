import { describe, it, expect } from 'vitest';
import { formatCurrencyMinor, formatDate, getTodayInputValue } from '../src/utils/formatters';

describe('Currency and Date Formatters', () => {
  it('should format minor currency units (paise) to INR properly in English and Hindi', () => {
    // 250000 paise = ₹2,500.00
    const enFormatted = formatCurrencyMinor(250000, 'en', 'INR');
    expect(enFormatted).toMatch(/2,500/);

    const hiFormatted = formatCurrencyMinor(250000, 'hi', 'INR');
    expect(hiFormatted).toMatch(/2,500/);

    // 0 paise = ₹0.00
    const zeroFormatted = formatCurrencyMinor(0, 'en', 'INR');
    expect(zeroFormatted).toMatch(/0\.00/);
  });

  it('should format dates properly according to locale', () => {
    const testDate = new Date('2026-05-15T10:00:00Z');
    const enDate = formatDate(testDate, 'en');
    expect(enDate).toMatch(/May/);

    const hiDate = formatDate(testDate, 'hi');
    expect(hiDate).toBeDefined();
    expect(hiDate.length).toBeGreaterThan(0);
  });

  it('should return today date string in YYYY-MM-DD format', () => {
    const today = getTodayInputValue();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

