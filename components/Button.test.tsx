import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('should render with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should apply primary variant styles by default', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-[#0071e3]');
    expect(button).toHaveClass('text-white');
  });

  it('should apply secondary variant styles', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-100');
    expect(button).toHaveClass('text-gray-900');
  });

  it('should apply danger variant styles', () => {
    render(<Button variant="danger">Danger</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-red-600');
    expect(button).toHaveClass('border-red-100');
  });

  it('should apply ghost variant styles', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent');
    expect(button).toHaveClass('text-gray-600');
  });

  it('should apply outline variant styles', () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent');
    expect(button).toHaveClass('text-[#0071e3]');
  });

  it('should apply white variant styles', () => {
    render(<Button variant="white">White</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-white');
    expect(button).toHaveClass('text-gray-900');
  });

  it('should apply medium size by default', () => {
    render(<Button>Medium</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-5');
    expect(button).toHaveClass('py-2.5');
    expect(button).toHaveClass('text-[15px]');
  });

  it('should apply small size styles', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-3');
    expect(button).toHaveClass('py-1.5');
    expect(button).toHaveClass('text-[13px]');
    expect(button).toHaveClass('rounded-[10px]');
  });

  it('should apply large size styles', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-6');
    expect(button).toHaveClass('py-3.5');
    expect(button).toHaveClass('text-[17px]');
    expect(button).toHaveClass('rounded-[14px]');
  });

  it('should apply extra large size styles', () => {
    render(<Button size="xl">Extra Large</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-8');
    expect(button).toHaveClass('py-4');
    expect(button).toHaveClass('text-[19px]');
    expect(button).toHaveClass('rounded-[16px]');
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should handle onClick event', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
    expect(button).toHaveClass('disabled:cursor-not-allowed');
  });

  it('should not trigger onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick} disabled>Disabled</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should pass through HTML button attributes', () => {
    render(<Button type="submit" aria-label="Submit form">Submit</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('aria-label', 'Submit form');
  });

  it('should apply base styles for transitions and focus', () => {
    render(<Button>Base Styles</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('inline-flex');
    expect(button).toHaveClass('items-center');
    expect(button).toHaveClass('justify-center');
    expect(button).toHaveClass('font-medium');
    expect(button).toHaveClass('transition-all');
    expect(button).toHaveClass('duration-200');
    expect(button).toHaveClass('focus:outline-none');
    expect(button).toHaveClass('focus:ring-2');
  });

  it('should combine variant, size, and custom classes correctly', () => {
    render(
      <Button variant="secondary" size="lg" className="my-custom-class">
        Combined
      </Button>
    );
    const button = screen.getByRole('button');

    // Check variant styles
    expect(button).toHaveClass('bg-gray-100');

    // Check size styles
    expect(button).toHaveClass('px-6');

    // Check custom class
    expect(button).toHaveClass('my-custom-class');
  });
});
