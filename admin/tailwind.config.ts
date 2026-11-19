import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F47721',
          hover: '#E06310',
          light: '#FFF7F0',
        },
        'dark-text': '#252525',
        'secondary-text': '#666666',
        'muted-text': '#777777',
        'border-default': '#EEEEEE',
        'surface-gray': '#FAFAFA',
        success: '#269B62',
        error: '#D94A43',
        warning: '#F59E0B',
      },
    },
  },
  plugins: [],
};

export default config;
