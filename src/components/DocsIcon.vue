<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
    name?: string;
    class?: string;
}>(), {
    name: '',
    class: 'size-4',
});

type IconDefinition = {
    paths: Array<{
        d: string;
        fill?: string;
    }>;
};

const icons: Record<string, IconDefinition> = {
    'play-circle': {
        paths: [
            { d: 'M8 14.25A6.25 6.25 0 1 0 8 1.75a6.25 6.25 0 0 0 0 12.5' },
            { d: 'M6.25 5.75 10.25 8l-4 2.25V5.75', fill: 'currentColor' },
        ],
    },
    'app-window': {
        paths: [
            { d: 'M2.75 4.25A1.5 1.5 0 0 1 4.25 2.75h7.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5v-7.5Z' },
            { d: 'M2.75 5.5h10.5' },
            { d: 'M5 4.125h.01M7 4.125h.01M9 4.125h.01' },
        ],
    },
    blocks: {
        paths: [
            { d: 'M2.75 3.25h4.5v4.5h-4.5z' },
            { d: 'M8.75 3.25h4.5v4.5h-4.5z' },
            { d: 'M5.75 8.75h4.5v4.5h-4.5z' },
        ],
    },
    'clipboard-list': {
        paths: [
            { d: 'M5.25 3.25h5.5a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-5.5a1.5 1.5 0 0 1-1.5-1.5v-7a1.5 1.5 0 0 1 1.5-1.5Z' },
            { d: 'M6.25 2.75h3.5v1.5h-3.5z' },
            { d: 'M6 6.5h3.75M6 8.5h3.75M6 10.5h3.75' },
            { d: 'M5 6.5h.01M5 8.5h.01M5 10.5h.01' },
        ],
    },
    'layout-template': {
        paths: [
            { d: 'M2.75 3.25h10.5v9.5H2.75z' },
            { d: 'M6.25 3.25v9.5' },
            { d: 'M6.25 6.75h7' },
        ],
    },
    'rows-3': {
        paths: [
            { d: 'M3 4.5h1.5M6 4.5h7' },
            { d: 'M3 8h1.5M6 8h7' },
            { d: 'M3 11.5h1.5M6 11.5h7' },
        ],
    },
    'square-terminal': {
        paths: [
            { d: 'M3.25 3.25h9.5v9.5h-9.5z' },
            { d: 'M5.25 6.25 7 8l-1.75 1.75' },
            { d: 'M8.75 9.75h2.25' },
        ],
    },
    'flask-conical': {
        paths: [
            { d: 'M6 2.75h4' },
            { d: 'M7 2.75v2.5l-3 5.25a1.5 1.5 0 0 0 1.3 2.25h5.4A1.5 1.5 0 0 0 12 10.5L9 5.25v-2.5' },
            { d: 'M5.5 9h5' },
        ],
    },
};

const icon = computed(() => icons[props.name] ?? null);
</script>

<template>
    <svg
        v-if="icon"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        :class="props.class"
        aria-hidden="true"
    >
        <path
            v-for="path in icon.paths"
            :key="path.d"
            :d="path.d"
            :fill="path.fill ?? 'none'"
        />
    </svg>
</template>
