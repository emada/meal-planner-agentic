import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renders the application title as the top-level heading', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: /recipe search & meal planner/i }),
    ).toBeInTheDocument();
  });

  it('exposes a main landmark for assistive technology', () => {
    render(<App />);

    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
