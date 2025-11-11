import type { Config } from 'tailwindcss';
import base from '@electronicvoting/config/tailwind';

export default {
  ...base,
  content: [...(base.content || []), './src/**/*.{ts,tsx,mdx}']
} satisfies Config;
