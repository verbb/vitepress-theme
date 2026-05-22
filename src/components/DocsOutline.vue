<script setup lang="ts">
import { onContentUpdated, useData } from 'vitepress';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import DocsOutlineItem from './DocsOutlineItem.vue';

type OutlineItem = {
    title: string;
    slug: string;
    link: string;
    level: number;
    children: OutlineItem[];
};

type FlatOutlineItem = OutlineItem & {
    depth: number;
    active: boolean;
    activeDeepest: boolean;
};

const { frontmatter, theme } = useData();

const title = computed(() => {
    const outline = theme.value.outline;

    return (typeof outline === 'object' && !Array.isArray(outline) && outline?.label)
        || theme.value.outlineTitle
        || 'On this page';
});
const activeHash = ref<string | null>(null);
const headers = ref<OutlineItem[]>([]);
const flattenedHeaders = computed<FlatOutlineItem[]>(() => {
    const activeTrail = findActiveTrail(headers.value, activeHash.value);
    const activeLinks = new Set(activeTrail.map((item) => item.link));
    const activeDeepestLink = activeTrail.at(-1)?.link ?? null;

    return flattenHeaders(headers.value).map((item) => ({
        ...item,
        depth: Math.max(item.level - 2, 0),
        active: activeLinks.has(item.link),
        activeDeepest: item.link === activeDeepestLink,
    }));
});

function getScrollContainer() {
    return document.getElementById('docs-scroll-container')
        ?? document.getElementById('content-container');
}

function getActivationOffset(scrollContainer: HTMLElement) {
    const scrollMarginTop = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--scroll-mt'),
    );

    if (Number.isFinite(scrollMarginTop)) {
        return scrollMarginTop;
    }

    return Math.min(Math.max(scrollContainer.clientHeight * 0.18, 56), 120);
}

function resolveOutlineRange(range: unknown): [number, number] | null {
    if (range === false) {
        return null;
    }

    const levelsRange = (typeof range === 'object' && !Array.isArray(range) && range && 'level' in range
        ? (range as { level?: number | [number, number] | 'deep'; }).level
        : range) ?? 2;

    if (levelsRange === 'deep') {
        return [2, 6];
    }

    if (Array.isArray(levelsRange)) {
        return [levelsRange[0], levelsRange[1]];
    }

    return [levelsRange as number, levelsRange as number];
}

function getVisibleLevels() {
    const range = resolveOutlineRange(frontmatter.value.outline ?? theme.value.outline);

    if (!range) {
        return null;
    }

    return range;
}

function serializeHeader(element: Element) {
    const ignoredClassNames = /\b(?:VPBadge|header-anchor|footnote-ref|ignore-header)\b/;
    let content = '';

    for (const node of element.childNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const child = node as HTMLElement;

            if (ignoredClassNames.test(child.className)) {
                continue;
            }

            content += child.textContent ?? '';
        } else if (node.nodeType === Node.TEXT_NODE) {
            content += node.textContent ?? '';
        }
    }

    return content.trim();
}

function rebuildHeaders() {
    const levels = getVisibleLevels();

    if (!levels) {
        headers.value = [];
        return;
    }

    const [minLevel, maxLevel] = levels;
    const nodes = Array.from(document.querySelectorAll('.vp-doc :where(h1,h2,h3,h4,h5,h6)'))
        .filter((element) => element instanceof HTMLElement && !!element.id)
        .map((element) => {
            const level = Number(element.tagName.slice(1));

            return {
                title: serializeHeader(element),
                slug: element.id,
                link: `#${element.id}`,
                level,
                children: [],
            } satisfies OutlineItem;
        })
        .filter((item) => item.title && item.level >= minLevel && item.level <= maxLevel);

    const tree: OutlineItem[] = [];
    const stack: OutlineItem[] = [];

    for (const node of nodes) {
        while (stack.length && stack[stack.length - 1].level >= node.level) {
            stack.pop();
        }

        if (stack.length) {
            stack[stack.length - 1].children.push(node);
        } else {
            tree.push(node);
        }

        stack.push(node);
    }

    headers.value = tree;
}

function flattenHeaders(items: OutlineItem[]): OutlineItem[] {
    return items.flatMap((item) => {
        return [item, ...flattenHeaders(item.children ?? [])];
    });
}

function findActiveTrail(items: OutlineItem[], link: string | null): OutlineItem[] {
    if (!link) {
        return [];
    }

    for (const item of items) {
        if (item.link === link) {
            return [item];
        }

        if (item.children?.length) {
            const childTrail = findActiveTrail(item.children, link);

            if (childTrail.length) {
                return [item, ...childTrail];
            }
        }
    }

    return [];
}

function updateActiveHash() {
    const flattenedHeaders = flattenHeaders(headers.value);
    const scrollContainer = getScrollContainer();

    if (!flattenedHeaders.length || !scrollContainer) {
        activeHash.value = null;
        return;
    }

    const scrollTop = scrollContainer.scrollTop;
    const innerHeight = scrollContainer.clientHeight;
    const scrollHeight = scrollContainer.scrollHeight;
    const activationOffset = getActivationOffset(scrollContainer);
    const isBottom = Math.abs(scrollTop + innerHeight - scrollHeight) < 1;

    if (scrollTop < 1) {
        const locationHash = window.location.hash;
        const matchingHash = flattenedHeaders.some((header) => header.link === locationHash)
            ? locationHash
            : null;

        activeHash.value = matchingHash ?? flattenedHeaders[0]?.link ?? null;
        return;
    }

    if (isBottom) {
        activeHash.value = flattenedHeaders[flattenedHeaders.length - 1]?.link ?? null;
        return;
    }

    const locationHash = window.location.hash;
    const matchingHash = flattenedHeaders.some((header) => header.link === locationHash)
        ? locationHash
        : null;
    let currentHash: string | null = null;

    for (const header of flattenedHeaders) {
        const element = document.getElementById(header.slug);

        if (!element) {
            continue;
        }

        const containerTop = scrollContainer.getBoundingClientRect().top;
        const top = scrollTop + element.getBoundingClientRect().top - containerTop;

        if (top > scrollTop + activationOffset) {
            break;
        }

        currentHash = header.link;
    }

    activeHash.value = currentHash ?? matchingHash ?? flattenedHeaders[0]?.link ?? null;
}

const onScroll = () => {
    updateActiveHash();
};

onMounted(() => {
    const scrollContainer = getScrollContainer();

    requestAnimationFrame(() => {
        rebuildHeaders();
        updateActiveHash();
    });
    scrollContainer?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', onScroll, { passive: true });
});

onBeforeUnmount(() => {
    const scrollContainer = getScrollContainer();

    scrollContainer?.removeEventListener('scroll', onScroll);
    window.removeEventListener('hashchange', onScroll);
});

onContentUpdated(async () => {
    await nextTick();
    rebuildHeaders();
    updateActiveHash();
});
</script>

<template>
    <nav
        v-if="headers.length"
        id="table-of-contents"
        aria-label="On this page"
        class="space-y-2"
    >
        <button type="button" class="flex cursor-pointer items-center space-x-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3" aria-hidden="true">
                <path d="M2.5 3.5h11M2.5 8h7M2.5 12.5h11" stroke-linecap="round" />
            </svg>
            <span>{{ title }}</span>
        </button>
        <DocsOutlineItem :items="flattenedHeaders" />
    </nav>
</template>
