import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Brand & Accent */
        primary: '#533afd',
        'primary-deep': '#4434d4',
        'primary-press': '#2e2b8c',
        'primary-soft': '#665efd',
        'primary-subdued': '#b9b9f9',
        'brand-dark-900': '#1c1e54',
        ruby: '#ea2261',
        magenta: '#f96bee',
        lemon: '#9b6829',

        /* Surface */
        canvas: '#ffffff',
        'canvas-soft': '#f6f9fc',
        'canvas-cream': '#f5e9d4',
        hairline: '#e3e8ee',
        'hairline-input': '#a8c3de',

        /* Text */
        ink: '#0d253d',
        'ink-secondary': '#273951',
        'ink-mute': '#64748d',
        'ink-mute-2': '#61718a',
        'on-primary': '#ffffff',

        /* Semantic (dashboard-specific) */
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',

        /* Dark theme surfaces (from mockups) */
        'surface-dark': '#0b1326',
        'surface-container-dark': '#171f33',
        'surface-container-low-dark': '#131b2e',
        'surface-container-high-dark': '#222a3d',
        'surface-container-highest-dark': '#2d3449',
        'surface-bright-dark': '#31394d',
        'outline-dark': '#8c909f',
        'outline-variant-dark': '#424754',
        'on-surface-dark': '#dae2fd',
        'on-surface-variant-dark': '#c2c6d6',
        'primary-dark': '#adc6ff',
        'primary-container-dark': '#4d8eff',
        'secondary-dark': '#4ae176',
        'secondary-container-dark': '#00b954',
        'error-dark': '#ffb4ab',
        'error-container-dark': '#93000a',
        'tertiary-dark': '#ffb3ad',
        'tertiary-container-dark': '#ff5451',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      fontSize: {
        'display-xxl': ['56px', { lineHeight: '1.03', letterSpacing: '-1.4px', fontWeight: '300' }],
        'display-xl': ['48px', { lineHeight: '1.15', letterSpacing: '-0.96px', fontWeight: '300' }],
        'display-lg': ['32px', { lineHeight: '1.1', letterSpacing: '-0.64px', fontWeight: '300' }],
        'display-md': ['26px', { lineHeight: '1.12', letterSpacing: '-0.26px', fontWeight: '300' }],
        'heading-lg': ['22px', { lineHeight: '1.1', letterSpacing: '-0.22px', fontWeight: '300' }],
        'heading-md': ['20px', { lineHeight: '1.4', letterSpacing: '-0.2px', fontWeight: '300' }],
        'heading-sm': ['18px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '300' }],
        'body-lg': ['16px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '300' }],
        'body-md': ['15px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '300' }],
        'body-tabular': ['14px', { lineHeight: '1.4', letterSpacing: '-0.42px', fontWeight: '300' }],
        'button-md': ['16px', { lineHeight: '1.0', letterSpacing: '0', fontWeight: '400' }],
        'button-sm': ['14px', { lineHeight: '1.0', letterSpacing: '0', fontWeight: '400' }],
        caption: ['13px', { lineHeight: '1.4', letterSpacing: '-0.39px', fontWeight: '400' }],
        micro: ['11px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '300' }],
        'micro-cap': ['10px', { lineHeight: '1.15', letterSpacing: '0.1px', fontWeight: '400' }],

        /* Mockup-specific sizes */
        'headline-lg': ['30px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'label-sm': ['11px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '500' }],
        'code-md': ['13px', { lineHeight: '20px', fontWeight: '400' }],
      },
      spacing: {
        xxs: '2px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        huge: '64px',
        gutter: '16px',
        'sidebar-width': '260px',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
      },
      boxShadow: {
        'level-1': 'rgba(0,55,112,0.08) 0 1px 3px',
        'level-2': 'rgba(0,55,112,0.08) 0 8px 24px, rgba(0,55,112,0.04) 0 2px 6px',
      },
    },
  },
  plugins: [],
};

export default config;
