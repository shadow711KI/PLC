import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from './Button'

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render button with children text', () => {
      render(<Button>Click Me</Button>)

      expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument()
    })

    it('should render with default props', () => {
      render(<Button>Default</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('button')
      expect(button).toHaveClass('button--primary')
      expect(button).toHaveClass('button--medium')
      expect(button).toHaveAttribute('type', 'button')
    })

    it('should render with icon', () => {
      render(<Button icon="🏠">Home</Button>)

      const button = screen.getByRole('button', { name: /Home/ })
      expect(button).toBeInTheDocument()
      expect(button.textContent).toContain('🏠')
      expect(button).toHaveClass('button--with-icon')
    })

    it('should render without icon class when no icon provided', () => {
      render(<Button>No Icon</Button>)

      const button = screen.getByRole('button')
      expect(button).not.toHaveClass('button--with-icon')
    })
  })

  describe('Variants', () => {
    it('should render primary variant', () => {
      render(<Button variant="primary">Primary</Button>)

      expect(screen.getByRole('button')).toHaveClass('button--primary')
    })

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>)

      expect(screen.getByRole('button')).toHaveClass('button--secondary')
    })

    it('should render danger variant', () => {
      render(<Button variant="danger">Danger</Button>)

      expect(screen.getByRole('button')).toHaveClass('button--danger')
    })

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>)

      expect(screen.getByRole('button')).toHaveClass('button--ghost')
    })
  })

  describe('Sizes', () => {
    it('should render small size', () => {
      render(<Button size="small">Small</Button>)

      expect(screen.getByRole('button')).toHaveClass('button--small')
    })

    it('should render medium size', () => {
      render(<Button size="medium">Medium</Button>)

      expect(screen.getByRole('button')).toHaveClass('button--medium')
    })

    it('should render large size', () => {
      render(<Button size="large">Large</Button>)

      expect(screen.getByRole('button')).toHaveClass('button--large')
    })
  })

  describe('Button Types', () => {
    it('should render as button type', () => {
      render(<Button type="button">Button</Button>)

      expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
    })

    it('should render as submit type', () => {
      render(<Button type="submit">Submit</Button>)

      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
    })

    it('should render as reset type', () => {
      render(<Button type="reset">Reset</Button>)

      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset')
    })
  })

  describe('Full Width', () => {
    it('should render with full-width class', () => {
      render(<Button fullWidth>Full Width</Button>)

      expect(screen.getByRole('button')).toHaveClass('button--full-width')
    })

    it('should not have full-width class by default', () => {
      render(<Button>Normal</Button>)

      expect(screen.getByRole('button')).not.toHaveClass('button--full-width')
    })
  })

  describe('Disabled State', () => {
    it('should render disabled button', () => {
      render(<Button disabled>Disabled</Button>)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('button--disabled')
    })

    it('should not be disabled by default', () => {
      render(<Button>Enabled</Button>)

      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
      expect(button).not.toHaveClass('button--disabled')
    })

    it('should not trigger onClick when disabled', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      )

      await user.click(screen.getByRole('button'))

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Click Handler', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(<Button onClick={handleClick}>Click Me</Button>)

      await user.click(screen.getByRole('button'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should call onClick multiple times', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(<Button onClick={handleClick}>Click Me</Button>)

      const button = screen.getByRole('button')
      await user.click(button)
      await user.click(button)
      await user.click(button)

      expect(handleClick).toHaveBeenCalledTimes(3)
    })

    it('should work without onClick handler', () => {
      render(<Button>No Handler</Button>)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Combined Props', () => {
    it('should render with multiple custom props', () => {
      const handleClick = vi.fn()

      render(
        <Button
          variant="danger"
          size="large"
          icon="⚠️"
          fullWidth
          onClick={handleClick}
        >
          Delete All
        </Button>
      )

      const button = screen.getByRole('button', { name: /Delete All/ })

      expect(button).toHaveClass('button--danger')
      expect(button).toHaveClass('button--large')
      expect(button).toHaveClass('button--with-icon')
      expect(button).toHaveClass('button--full-width')
      expect(button.textContent).toContain('⚠️')
    })

    it('should render disabled with variant and size', () => {
      render(
        <Button variant="secondary" size="small" disabled>
          Small Disabled
        </Button>
      )

      const button = screen.getByRole('button')

      expect(button).toHaveClass('button--secondary')
      expect(button).toHaveClass('button--small')
      expect(button).toHaveClass('button--disabled')
      expect(button).toBeDisabled()
    })
  })

  describe('Memoization', () => {
    it('should maintain stable reference with same props', () => {
      const { rerender } = render(<Button>Test</Button>)

      const firstButton = screen.getByRole('button')

      rerender(<Button>Test</Button>)

      const secondButton = screen.getByRole('button')

      // Button should be the same DOM element
      expect(firstButton).toBe(secondButton)
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(<Button onClick={handleClick}>Keyboard</Button>)

      const button = screen.getByRole('button')
      button.focus()

      expect(button).toHaveFocus()

      await user.keyboard('{Enter}')

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should have proper button role', () => {
      render(<Button>Accessible</Button>)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })
})
