import { render, screen } from '@testing-library/react';
import App from './App';

it('renders the app home screen', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /checklist map/i })).toBeTruthy();
  expect(screen.getByRole('button', { name: /start walkthrough/i })).toBeTruthy();
});
