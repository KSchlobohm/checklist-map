import { render, screen } from '@testing-library/react';
import QRCode from 'qrcode';
import App from './App';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  jest.spyOn(QRCode, 'toDataURL').mockResolvedValue('data:image/png;base64,test');
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('renders the app home screen', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /checklist map/i })).toBeTruthy();
  expect(screen.getByRole('button', { name: /start walkthrough/i })).toBeTruthy();
});

it('deep-links to importExport view via ?view=importExport', async () => {
  window.history.replaceState({}, '', '/?view=importExport');
  render(<App />);

  expect(screen.getByText('Import / Export')).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'http://localhost/?view=importExport' })
  ).toBeTruthy();
  expect(
    await screen.findByRole('img', { name: /QR code for http:\/\/localhost\/\?view=importExport/i })
  ).toBeTruthy();
});

it('deep-links to shopping list view via ?view=list', () => {
  window.history.replaceState({}, '', '/?view=list');
  render(<App />);

  expect(screen.getByText('Shopping List')).toBeTruthy();
});

it('deep-links to manage items view via ?view=manage', () => {
  window.history.replaceState({}, '', '/?view=manage');
  render(<App />);

  expect(screen.getByText('Inventory Items')).toBeTruthy();
});
