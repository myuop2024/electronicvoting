const sharedSafelist = [
  'bg-primary',
  'text-primary',
  'border-primary'
];

module.exports = {
  darkMode: ['class'],
  content: [
    '../../apps/web/**/*.{ts,tsx,mdx}',
    '../../apps/admin/**/*.{ts,tsx,mdx}',
    '../../apps/superadmin/**/*.{ts,tsx,mdx}',
    '../../packages/ui/**/*.{ts,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(29, 78, 216)',
          foreground: 'rgb(255,255,255)'
        }
      }
    }
  },
  plugins: [require('tailwindcss-animate')],
  safelist: sharedSafelist
};
