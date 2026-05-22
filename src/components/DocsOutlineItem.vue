<script setup lang="ts">
type OutlineItem = {
    title: string;
    link: string;
    depth: number;
    active: boolean;
    activeDeepest: boolean;
};

const props = defineProps<{
    items: OutlineItem[];
}>();

function navigateToHash(event: MouseEvent, link: string) {
    const targetId = link.replace(/^#/, '');
    const target = document.getElementById(targetId);

    if (!target) {
        return;
    }

    event.preventDefault();
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    window.location.hash = link;
}
</script>

<template>
    <ul id="table-of-contents-content" class="toc">
        <li
            v-for="item in props.items"
            :key="item.link"
            class="toc-item relative"
            :data-depth="item.depth"
            :data-active="item.active || undefined"
            :data-active-deepest="item.activeDeepest || undefined"
            :class="item.depth > 0
                ? item.active
                    ? 'border-l pl-4 border-docs-primary hover:border-docs-primary'
                    : 'border-l pl-4 border-slate-950/5 hover:border-slate-950/20'
                : ''"
        >
            <a
                :href="item.link"
                :style="item.depth > 0 ? 'padding-left:1rem' : undefined"
                class="break-words py-1"
                :class="[
                    item.depth > 0
                        ? 'group flex items-start whitespace-pre-wrap'
                        : 'block border-l pl-4 font-medium',
                    item.active
                        ? item.depth > 0
                            ? 'text-docs-primary'
                            : 'text-docs-primary border-docs-primary hover:border-docs-primary'
                        : item.depth > 0
                            ? 'text-gray-500 hover:text-gray-900'
                            : 'border-slate-950/5 hover:border-slate-950/20 hover:text-gray-900',
                ]"
                @click="navigateToHash($event, item.link)"
            >
                {{ item.title }}
            </a>
        </li>
    </ul>
</template>
