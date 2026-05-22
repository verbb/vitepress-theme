<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import VPLocalSearchBox from 'vitepress/dist/client/theme-default/components/VPLocalSearchBox.vue';
import { registerDocsSearch, unregisterDocsSearch } from '../search';

const showSearch = ref(false);

function openSearch() {
    showSearch.value = true;
}

function closeSearch() {
    showSearch.value = false;
}

function isEditingContent(event: KeyboardEvent) {
    const element = event.target as HTMLElement;
    const tagName = element.tagName;

    return (
        element.isContentEditable
        || tagName === 'INPUT'
        || tagName === 'SELECT'
        || tagName === 'TEXTAREA'
    );
}

function handleSearchHotKey(event: KeyboardEvent) {
    if (
        (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))
        || (!isEditingContent(event) && event.key === '/')
    ) {
        event.preventDefault();
        openSearch();
    }
}

onMounted(() => {
    registerDocsSearch(openSearch);
    window.addEventListener('keydown', handleSearchHotKey);
});

onUnmounted(() => {
    unregisterDocsSearch(openSearch);
    window.removeEventListener('keydown', handleSearchHotKey);
});
</script>

<template>
    <VPLocalSearchBox v-if="showSearch" @close="closeSearch" />
</template>
