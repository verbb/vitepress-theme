# @verbb/vitepress-theme

Shared VitePress theme used by Verbb documentation sites (custom layout, sidebar, outline, local search, primary-color tokens).

## Usage

1. Add the package and peer dependencies (`vitepress`, `vue`), plus Tailwind v4 with `@tailwindcss/vite` and `@tailwindcss/typography` so `src/custom.css` can be processed.
2. In `.vitepress/theme/index.ts`:

```ts
import type { Theme } from 'vitepress';
import { createVerbbDocsTheme } from '@verbb/vitepress-theme';

const theme: Theme = createVerbbDocsTheme({
    enhanceApp({ app }) {
        // app.component('MyPreview', MyPreview);
    },
});

export default theme;
```

3. In VitePress config, ensure the theme is compiled (not externalized) during SSR:

```ts
vite: {
    ssr: { noExternal: ['@verbb/vitepress-theme'] },
    plugins: [tailwindcss()],
},
```

4. Set `themeConfig.nav` for top-of-site section links (shown as a dropdown). Leave `nav` empty or omit it to hide the control.

5. Optional: `themeConfig.docsTheme.primary` (and other `docsTheme` keys) override CSS variables for accent colors.

## Local `file:` dependency paths

Point `file:` at this folder from the package that runs VitePress. Examples from this workspace:

- `formie-plugin-repo/packages/docs` → `file:../../../verbb-vitepress-theme`
- `plugin-kit-repo/plugin-kit-react` → `file:../../verbb-vitepress-theme` (two levels up to `formie-react`, not three)
