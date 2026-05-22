<script setup lang="ts">
import { computed } from 'vue';
import { useData, withBase } from 'vitepress';

const { theme } = useData();

const code = computed(() => theme.value.notFound?.code ?? '404');
const title = computed(() => theme.value.notFound?.title ?? 'Page not found');
const quote = computed(() => {
    return theme.value.notFound?.quote
        ?? 'The page you requested does not exist or may have moved.';
});
const linkLabel = computed(() => theme.value.notFound?.linkLabel ?? 'Go to home');
const linkText = computed(() => theme.value.notFound?.linkText ?? 'Take me home');
</script>

<template>
    <section class="flex min-h-[calc(100dvh-14rem)] w-full flex-col items-center justify-center px-6 py-16 text-center sm:px-8 sm:py-24 lg:min-h-[calc(100dvh-10rem)]">
        <p class="text-6xl font-semibold tracking-[-0.04em] text-slate-900 sm:text-7xl">
            {{ code }}
        </p>

        <h1 class="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-3xl">
            {{ title }}
        </h1>

        <div class="mt-6 h-px w-16 bg-slate-200" />

        <p class="mt-5 max-w-sm text-sm leading-6 text-slate-600">
            {{ quote }}
        </p>

        <a
            :href="withBase('/')"
            :aria-label="linkLabel"
            class="mt-7 inline-flex items-center rounded-xl border border-docs-primary-border bg-docs-primary-soft px-4 py-2 text-sm font-medium text-docs-primary transition hover:border-docs-primary-border-strong hover:bg-docs-primary-soft-hover"
        >
            {{ linkText }}
        </a>
    </section>
</template>
