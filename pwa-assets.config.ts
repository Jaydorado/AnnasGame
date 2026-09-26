import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const nightBackground = { background: '#141d3b', fit: 'contain' } as const;

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: nightBackground },
    apple: { ...minimal2023Preset.apple, resizeOptions: nightBackground },
  },
  images: ['public/icon.svg'],
});
