<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useData, useRouter, withBase } from 'vitepress';
import type { SidebarItem } from '../sidebar';
import { hasActiveSidebarItem, isActivePath } from '../sidebar';
import DocsIcon from './DocsIcon.vue';

const props = withDefaults(defineProps<{
    item: SidebarItem;
    depth?: number;
}>(), {
    depth: 0,
});

const emit = defineEmits<{
    navigate: [];
}>();

const { page } = useData();
const router = useRouter();

const hasChildren = computed(() => Boolean(props.item.items?.length));
const isCurrent = computed(() => isActivePath(page.value.relativePath, props.item.link));
const hasActiveDescendant = computed(() => {
    return props.item.items?.some((child) => hasActiveSidebarItem(page.value.relativePath, child)) ?? false;
});
const isOpen = ref(hasChildren.value ? (!props.item.collapsed || hasActiveDescendant.value) : false);

watch(hasActiveDescendant, (value) => {
    if (value) {
        isOpen.value = true;
    }
});

function itemHref(link?: string) {
    return link ? withBase(link) : '#';
}

async function navigate(event: MouseEvent, link?: string) {
    if (!link) {
        return;
    }

    event.preventDefault();
    await router.go(itemHref(link));
    emit('navigate');
}

function toggleGroup() {
    if (!hasChildren.value) {
        return;
    }

    isOpen.value = !isOpen.value;
}
</script>

<template>
    <li class="relative">
        <button
            v-if="hasChildren"
            type="button"
            class="group flex w-full cursor-pointer items-center py-0.5 pr-2 text-left text-sm leading-6 outline-offset-[-1px] transition hover:text-docs-primary"
            :class="hasActiveDescendant
                ? 'text-docs-primary'
                : 'text-slate-700'"
            @click="toggleGroup"
        >
            <span class="min-w-0 flex-1 break-words">{{ item.text }}</span>
            <svg
                viewBox="0 0 640 640"
                class="size-3 shrink-0 transition-transform"
                :class="isOpen ? 'rotate-90' : 'rotate-0'"
                aria-hidden="true"
            >
                <path d="M471.1 297.4C483.6 309.9 483.6 330.2 471.1 342.7L279.1 534.7C266.6 547.2 246.3 547.2 233.8 534.7C221.3 522.2 221.3 501.9 233.8 489.4L403.2 320L233.9 150.6C221.4 138.1 221.4 117.8 233.9 105.3C246.4 92.8 266.7 92.8 279.2 105.3L471.2 297.3z" />
            </svg>
        </button>

        <a
            v-else
            :href="itemHref(item.link)"
            class="group flex w-full cursor-pointer items-center py-0.5 text-left text-sm leading-6 outline-offset-[-1px] transition hover:text-docs-primary"
            :class="isCurrent
                ? 'text-docs-primary'
                : 'text-slate-700'"
            @click="navigate($event, item.link)"
        >
            <div class="flex min-w-0 flex-1 items-start gap-x-2.5">
                <DocsIcon
                    v-if="item.icon"
                    :name="item.icon"
                    class="mt-1 size-4 shrink-0 text-slate-500 group-hover:text-slate-700"
                />
                <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 [word-break:break-word]">
                    <span class="min-w-0 max-w-full break-words">{{ item.text }}</span>
                </div>
            </div>
        </a>

        <ul
            v-if="hasChildren && isOpen"
            :style="{ marginLeft: depth === 0 ? '1rem' : '1.25rem' }"
        >
            <DocsMobileMenuNode
                v-for="child in item.items"
                :key="child.link ?? `${child.text}-${child.icon ?? ''}`"
                :item="child"
                :depth="depth + 1"
                @navigate="emit('navigate')"
            />
        </ul>
    </li>
</template>
