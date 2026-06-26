import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ dataPageUrl: '' }) })
  );
});

afterEach(() => {
  jest.restoreAllMocks();
  delete window.location;
  window.location = { search: '' };
});

it('renders the app home screen', () => {
  window.location = { search: '' };
  render(<App />);

  expect(screen.getByRole('heading', { name: /checklist map/i })).toBeTruthy();
  expect(screen.getByRole('button', { name: /start walkthrough/i })).toBeTruthy();
});

it('deep-links to importExport view via ?view=importExport', () => {
  window.location = { search: '?view=importExport' };
  render(<App />);

  expect(screen.getByText('Import / Export')).toBeTruthy();
});

it('deep-links to shopping list view via ?view=list', () => {
  window.location = { search: '?view=list' };
  render(<App />);

  expect(screen.getByText('Shopping List')).toBeTruthy();
});

it('deep-links to manage items view via ?view=manage', () => {
  window.location = { search: '?view=manage' };
  render(<App />);

  expect(screen.getByText('Inventory Items')).toBeTruthy();
});
