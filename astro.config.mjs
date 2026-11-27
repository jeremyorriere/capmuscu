import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://capmuscu.fr',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') && !page.includes('/historique/') && !page.includes('/compte/') && !page.includes('/favoris/') && !page.includes('/profil/') })],
  vite: { plugins: [tailwindcss()] },
});
