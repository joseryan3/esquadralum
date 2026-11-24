import { render, screen } from '@testing-library/react';
import App from './App';

test('renders home navigation', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /painel de monitoramento/i })).toBeInTheDocument();
});
