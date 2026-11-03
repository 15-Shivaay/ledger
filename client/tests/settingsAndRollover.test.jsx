import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SettingsModal from '../src/components/SettingsModal';
import CallQueuePage from '../src/pages/CallQueuePage';
import { LanguageProvider } from '../src/context/LanguageContext';
import { api } from '../src/services/api';

vi.mock('../src/services/api', () => ({
  api: {
    getCallList: vi.fn(),
    getCustomer: vi.fn(),
    updateCustomerRemark: vi.fn(),
    setCallQueueDay: vi.fn().mockResolvedValue({ success: true, day: 1 }),
    correctCustomerBalance: vi.fn().mockResolvedValue({ success: true, accountStatus: 'active' }),
    updateSettings: vi.fn().mockResolvedValue({ success: true })
  }
}));

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

describe('SettingsModal - Queue Start Date (Day 1)', () => {
  it('should render the queue start date input with initial value and call onSave with new date', async () => {
    const handleSave = vi.fn().mockResolvedValue({ success: true });
    const handleClose = vi.fn();

    render(
      <LanguageProvider>
        <SettingsModal
          isOpen={true}
          onClose={handleClose}
          currentSettings={{
            zeroBalanceAction: 'delete',
            currency: 'INR',
            queueStartDate: '2026-11-01'
          }}
          onSave={handleSave}
        />
      </LanguageProvider>
    );

    // Find date input
    const dateInput = screen.getByDisplayValue('2026-11-01');
    expect(dateInput).toBeInTheDocument();

    // Change date
    fireEvent.change(dateInput, { target: { value: '2026-11-05' } });
    expect(dateInput.value).toBe('2026-11-05');

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save settings/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith({
        zeroBalanceAction: 'delete',
        queueStartDate: '2026-11-05'
      });
    });
  });
});

describe('CallQueuePage - 5:00 AM Active Day & Navigation', () => {
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
      remarks: '',
      queuePosition: 1
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display Today Active Day badge when viewing today active queue day', async () => {
    api.getCallList.mockResolvedValue({
      success: true,
      data: mockCustomers,
      pagination: {
        day: 3,
        activeDay: 3,
        totalDays: 5,
        totalCustomers: 25,
        limit: 50,
        nextDay: 4,
        prevDay: 2,
        isWrapped: false
      }
    });

    render(
      <LanguageProvider>
        <CallQueuePage
          onBackToLedger={vi.fn()}
          onOpenSettings={vi.fn()}
          onOpenBackup={vi.fn()}
        />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Ramesh Sharma')).toBeInTheDocument();
    });

    // Expect Today's Active Day badge
    expect(screen.getByText("Today's Active Day")).toBeInTheDocument();
  });

  it('should display Go to Today button when browsing a different day and allow jumping to active day', async () => {
    api.getCallList.mockImplementation((targetDay) => {
      if (targetDay === 3) {
        return Promise.resolve({
          success: true,
          data: mockCustomers,
          pagination: {
            day: 3,
            activeDay: 3,
            totalDays: 5,
            totalCustomers: 25,
            limit: 50,
            nextDay: 4,
            prevDay: 2,
            isWrapped: false
          }
        });
      }
      return Promise.resolve({
        success: true,
        data: mockCustomers,
        pagination: {
          day: 1,
          activeDay: 3, // Active day is Day 3, but viewing Day 1
          totalDays: 5,
          totalCustomers: 25,
          limit: 50,
          nextDay: 2,
          prevDay: 5,
          isWrapped: false
        }
      });
    });

    render(
      <LanguageProvider>
        <CallQueuePage
          onBackToLedger={vi.fn()}
          onOpenSettings={vi.fn()}
          onOpenBackup={vi.fn()}
        />
      </LanguageProvider>
    );

    // Initial load returns Day 1 while active day is Day 3
    await waitFor(() => {
      expect(screen.getByText('Ramesh Sharma')).toBeInTheDocument();
    });

    // Check "Go to Today (Day 3)" button is displayed
    const goToTodayBtn = screen.getByRole('button', { name: /go to today \(day 3\)/i });
    expect(goToTodayBtn).toBeInTheDocument();

    // Click Go to Today button
    fireEvent.click(goToTodayBtn);

    await waitFor(() => {
      expect(api.getCallList).toHaveBeenCalledWith(3, 50);
    });
  });
});

