import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CallQueuePage from '../src/pages/CallQueuePage';
import { LanguageProvider } from '../src/context/LanguageContext';
import { api } from '../src/services/api';

// Mock api
vi.mock('../src/services/api', () => ({
  api: {
    getCallList: vi.fn(),
    getCustomer: vi.fn(),
    updateCustomerRemark: vi.fn()
  }
}));

// Mock clerk
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      fullName: 'Admin User',
      primaryEmailAddress: { emailAddress: 'admin@example.com' },
      publicMetadata: { role: 'admin' }
    }
  }),
  useClerk: () => ({
    signOut: vi.fn()
  }),
  UserButton: () => <div data-testid="user-button">UserButton</div>
}));

describe('CallQueuePage - Print / Download PDF Feature', () => {
  const mockCustomers = [
    {
      id: 'cust-1',
      _id: 'cust-1',
      name: 'Ramesh Sharma',
      phoneNormalized: '+919876543210',
      phoneDisplay: '+91 98765 43210',
      address: 'Shop 12, Main Market, Mumbai',
      currentBalanceMinor: 150000,
      balanceFormattedEn: '₹1,500.00',
      balanceFormattedHi: '₹१,५००.००',
      remarks: 'Called yesterday, promised payment by Monday',
      queuePosition: 1,
      updatedAt: '2026-03-01T10:00:00.000Z'
    },
    {
      id: 'cust-2',
      _id: 'cust-2',
      name: 'Pooja Patel',
      phoneNormalized: '+919876543211',
      phoneDisplay: '+91 98765 43211',
      address: 'A-402, Sunshine Heights, Pune',
      currentBalanceMinor: 275050,
      balanceFormattedEn: '₹2,750.50',
      balanceFormattedHi: '₹२,७५०.५०',
      remarks: 'Send reminder SMS on 5th',
      queuePosition: 2,
      updatedAt: '2026-03-02T10:00:00.000Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.getCallList.mockResolvedValue({
      success: true,
      data: mockCustomers,
      pagination: {
        day: 1,
        totalDays: 2,
        totalCustomers: 52,
        limit: 50,
        nextDay: 2,
        prevDay: 1,
        isWrapped: false
      }
    });
  });

  it('should render the Print / Download PDF button after the customers list', async () => {
    render(
      <LanguageProvider>
        <CallQueuePage
          onBackToLedger={vi.fn()}
          onOpenSettings={vi.fn()}
          onOpenBackup={vi.fn()}
        />
      </LanguageProvider>
    );

    // Wait for customers to load
    await waitFor(() => {
      expect(screen.getAllByText('Ramesh Sharma').length).toBeGreaterThanOrEqual(1);
    });

    // Check that Print / Download PDF button is rendered at end of the page only
    const printButtons = screen.getAllByRole('button', { name: /print \/ download pdf/i });
    expect(printButtons.length).toBe(1);

    // Click the Print / Download PDF button at end of page
    fireEvent.click(printButtons[0]);

    // Verify the preview modal opens and PDF table has all 5 required columns
    const printTable = await waitFor(() => {
      const el = document.getElementById('call-list-print-table');
      expect(el).toBeInTheDocument();
      return el;
    });

    // Check column headers in the printable table:
    // Name, Phone, Address, Balance, Response
    expect(printTable.textContent).toContain('Name');
    expect(printTable.textContent).toContain('Phone');
    expect(printTable.textContent).toContain('Address');
    expect(printTable.textContent).toContain('Balance');
    expect(printTable.textContent).toContain('Response');

    // Check customer rows in the printable table
    expect(printTable.textContent).toContain('Ramesh Sharma');
    expect(printTable.textContent).toContain('+91 98765 43210');
    expect(printTable.textContent).toContain('Shop 12, Main Market, Mumbai');
    expect(printTable.textContent).toContain('₹1,500.00');
    expect(printTable.textContent).toContain('Called yesterday, promised payment by Monday');

    expect(printTable.textContent).toContain('Pooja Patel');
    expect(printTable.textContent).toContain('+91 98765 43211');
    expect(printTable.textContent).toContain('A-402, Sunshine Heights, Pune');
    expect(printTable.textContent).toContain('₹2,750.50');
    expect(printTable.textContent).toContain('Send reminder SMS on 5th');
  });

  it('should automatically include searched and directed customer in today call list and printable PDF', async () => {
    const searchedCustomer = {
      id: 'cust-searched',
      _id: 'cust-searched',
      name: 'Sunil Verma',
      phoneNormalized: '+919876543299',
      phoneDisplay: '+91 98765 43299',
      address: 'Shop 88, Cloth Market, Surat',
      currentBalanceMinor: 450000,
      balanceFormattedEn: '₹4,500.00',
      balanceFormattedHi: '₹४,५००.००',
      remarks: 'Called on phone, promised to clear balance by Saturday',
      isManuallyAdded: true,
      queuePosition: '+1'
    };

    render(
      <LanguageProvider>
        <CallQueuePage
          onBackToLedger={vi.fn()}
          onOpenSettings={vi.fn()}
          onOpenBackup={vi.fn()}
          targetCustomer={searchedCustomer}
        />
      </LanguageProvider>
    );

    // Verify searched customer card is rendered at top with Added Today badge
    await waitFor(() => {
      expect(screen.getAllByText('Sunil Verma').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Added Today')).toBeInTheDocument();
    });

    // Check that all call card functionalities are present on searched customer's card:
    // Call button, copy phone button, remarks, ledger
    const callLinks = screen.getAllByRole('link', { name: /call/i });
    expect(callLinks[0]).toHaveAttribute('href', 'tel:+919876543299');
    expect(screen.getByText(/Sunil Verma/)).toBeInTheDocument();
    expect(screen.getByText(/₹4,500.00/)).toBeInTheDocument();

    // Click Print / Download PDF
    const printButtons = screen.getAllByRole('button', { name: /print \/ download pdf/i });
    fireEvent.click(printButtons[0]);

    // Check that Sunil Verma and his remarks are included in printable PDF table alongside queued customers
    const printTable = await waitFor(() => {
      const el = document.getElementById('call-list-print-table');
      expect(el).toBeInTheDocument();
      return el;
    });

    expect(printTable.textContent).toContain('Sunil Verma');
    expect(printTable.textContent).toContain('+91 98765 43299');
    expect(printTable.textContent).toContain('Shop 88, Cloth Market, Surat');
    expect(printTable.textContent).toContain('₹4,500.00');
    expect(printTable.textContent).toContain('Called on phone, promised to clear balance by Saturday');

    // Also verify original queued customers are still present in table
    expect(printTable.textContent).toContain('Ramesh Sharma');
    expect(printTable.textContent).toContain('Pooja Patel');
  });
});
