/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:     '#111111',  // app background
          surface:  '#111111',  // same as base (Notara is flat)
          elevated: '#232323',  // hover state
          overlay:  '#0e0e0e',  // active / pressed
          sidebar:  '#1c1c1c',  // sidebar panel
          input:    '#1e1e1e',  // input fields
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover:   'var(--accent-hover)',
          light:   'var(--accent-light)',
          text:    'var(--accent)',
        },
        text: {
          primary:   '#e2e2de',
          secondary: '#87857f',
          muted:     '#4c4c48',
          tertiary:  '#4c4c48',
        },
        border: {
          DEFAULT: '#2c2c2c',
          subtle:  '#222222',
          bright:  '#3e3e3e',
          strong:  '#3e3e3e',
        },
        status: {
          reading:   '#3b82f6',
          completed: '#22c55e',
          unread:    '#6b7280',
          hold:      '#e8943a',
          dropped:   '#ef4444',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '10px',
      },
      boxShadow: {
        'sm':         '0 1px 3px rgba(0,0,0,0.4)',
        'md':         '0 4px 16px rgba(0,0,0,0.55)',
        'lg':         '0 8px 32px rgba(0,0,0,0.65)',
        'cover':      '0 20px 60px rgba(0,0,0,0.7)',
        'cover-hover':'0 30px 80px var(--accent-light), 0 20px 60px rgba(0,0,0,0.8)',
        'glow-accent':'0 0 24px var(--accent-light)',
        'glow-blue':  '0 0 20px rgba(59,130,246,0.3)',
      },
      animation: {
        'fade-in':   'fadeIn 0.2s ease-out',
        'slide-up':  'slideUp 0.3s ease-out',
        'scale-in':  'scaleIn 0.2s ease-out',
        'pulse-slow':'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};
