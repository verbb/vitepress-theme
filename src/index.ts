import type { App } from 'vue';
import type { Theme } from 'vitepress';
import Layout from './Layout.vue';
import 'vitepress/dist/client/theme-default/styles/icons.css';
import './custom.css';

export type VerbbDocsThemeOptions = {
    enhanceApp?: (ctx: { app: App }) => void | Promise<void>;
};

export function createVerbbDocsTheme(options: VerbbDocsThemeOptions = {}): Theme {
    return {
        Layout,
        async enhanceApp(ctx) {
            await options.enhanceApp?.(ctx);
        },
    };
}

export { default as Layout } from './Layout.vue';
export * from './sidebar';
export { openDocsSearch, registerDocsSearch, unregisterDocsSearch } from './search';
