import path from 'path';

export default {
  plugins: {
    tailwindcss: path.resolve(import.meta.dirname, 'tailwind.config.js'),
    autoprefixer: {},
  },
}