import { shallowRef } from 'vue';

const openHandler = shallowRef<null | (() => void)>(null);

export function registerDocsSearch(handler: () => void) {
    openHandler.value = handler;
}

export function unregisterDocsSearch(handler: () => void) {
    if (openHandler.value === handler) {
        openHandler.value = null;
    }
}

export function openDocsSearch() {
    openHandler.value?.();
}
