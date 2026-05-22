<script setup lang="ts">
import { computed } from 'vue';
import { useDocsSidebar } from '../sidebar';
import DocsIcon from './DocsIcon.vue';
import DocsSidebarNode from './DocsSidebarNode.vue';

defineEmits<{
    navigate: [];
}>();

const { sidebarGroups } = useDocsSidebar();

const groups = computed(() => sidebarGroups.value.filter((group) => group.items?.length));
</script>

<template>
    <nav aria-label="Sidebar navigation" class="text-sm">
        <section v-for="group in groups" :key="group.text ?? group.items?.[0]?.link" class="mt-6 first:mt-0 lg:mt-6 lg:first:mt-0">
            <h2
                v-if="group.text"
                class="mb-3 flex items-center gap-2.5 text-sm font-medium text-slate-900 lg:mb-2"
            >
                <DocsIcon
                    v-if="group.icon"
                    :name="group.icon"
                    class="size-4 text-slate-600"
                />
                {{ group.text }}
            </h2>

            <ul class="space-y-px">
                <DocsSidebarNode
                    v-for="item in group.items"
                    :key="item.link ?? `${item.text}-${item.icon ?? ''}`"
                    :item="item"
                    @navigate="$emit('navigate')"
                />
            </ul>
        </section>
    </nav>
</template>
