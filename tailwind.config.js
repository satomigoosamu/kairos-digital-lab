/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: '#FAF9F6',
        charcoal: '#18181B',
        slateink: '#52525B',
        obsidian: '#121214',
        'obsidian-surface': '#1E1E22',
        gold: {
          DEFAULT: '#C5A059',
          hover: '#B08D46',
          muted: 'rgba(197, 160, 89, 0.14)',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Noto Sans TC"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
