import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../src/context/LanguageContext';
import enTranslations from '../src/locales/en.json';
import hiTranslations from '../src/locales/hi.json';

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      keys = keys.concat(flattenKeys(val, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function TestLanguageConsumer({ testCustomerName }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div>
      <span data-testid="current-lang">{language}</span>
      <h1 data-testid="app-title">{t('app.title')}</h1>
      <p data-testid="customer-name">{testCustomerName}</p>
      <p data-testid="zero-balance-notice">
        {t('notifications.zeroBalanceDeletedNotice')}
      </p>
      <button onClick={() => setLanguage('hi')} data-testid="switch-to-hi">
        Switch to Hindi
      </button>
      <button onClick={() => setLanguage('en')} data-testid="switch-to-en">
        Switch to English
      </button>
    </div>
  );
}

describe('Bilingual Localization & Language Switcher (English / Hindi)', () => {
  it('should have parity between English and Hindi translation dictionaries', () => {
    const enKeys = flattenKeys(enTranslations).sort();
    const hiKeys = flattenKeys(hiTranslations).sort();

    expect(enKeys).toEqual(hiKeys);
    expect(enKeys.length).toBeGreaterThan(40);
  });

  it('should default to English and translate app title to Customer Account Ledger', () => {
    localStorage.clear();
    render(
      <LanguageProvider>
        <TestLanguageConsumer testCustomerName="Ramesh Kumar (रमेश कुमार)" />
      </LanguageProvider>
    );

    expect(screen.getByTestId('current-lang').textContent).toBe('en');
    expect(screen.getByTestId('app-title').textContent).toBe('Customer Account Ledger');
  });

  it('should switch to Hindi and update UI text while preserving customer entered name', () => {
    localStorage.clear();
    render(
      <LanguageProvider>
        <TestLanguageConsumer testCustomerName="Ramesh Kumar (रमेश कुमार)" />
      </LanguageProvider>
    );

    const switchBtn = screen.getByTestId('switch-to-hi');
    act(() => {
      switchBtn.click();
    });

    expect(screen.getByTestId('current-lang').textContent).toBe('hi');
    expect(screen.getByTestId('app-title').textContent).toBe('ग्राहक खाता बही');
    // Ensure customer name entered by user remains exactly as entered
    expect(screen.getByTestId('customer-name').textContent).toBe('Ramesh Kumar (रमेश कुमार)');
    // Notice text in Hindi
    expect(screen.getByTestId('zero-balance-notice').textContent).toContain('शेष राशि शून्य होने के कारण');
  });
});

