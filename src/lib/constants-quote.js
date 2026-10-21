export const BUSINESS = {
  name: 'XMARKET',
  address: 'Poblacion, San Pascual, Batangas City',
  phone: '09454408496',
  email: 'xmarket.official@gmail.com',
  logo: '/icons/icon-192.png',
};

export const CURRENCIES = {
  PHP: { code: 'PHP', symbol: '₱', label: 'PHP (₱)' },
  USD: { code: 'USD', symbol: '$', label: 'USD ($)' },
};

export const PAYMENT_METHODS = [
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'xwallet', label: 'XWallet' },
];

export const DELIVERY_METHODS = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'express', label: 'Express' },
  { value: 'instant', label: 'Instant' },
];

export const STATUSES = [
  { value: 'paid', label: 'Paid', color: '#10B981' },
  { value: 'unpaid', label: 'Unpaid', color: '#F59E0B' },
  { value: 'pending', label: 'Pending', color: '#3B82F6' },
  { value: 'overdue', label: 'Overdue', color: '#EF4444' },
];

export const TAX_PRESETS = [0, 5, 8, 12, 15, 20];
