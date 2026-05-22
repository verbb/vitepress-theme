<script setup lang="ts">
import { computed } from 'vue';
import { useDocsSidebar } from '../sidebar';
import DocsIcon from './DocsIcon.vue';
import DocsMobileMenuNode from './DocsMobileMenuNode.vue';

defineProps<{
    logoSrc: string | null;
    siteTitle: string;
}>();

defineEmits<{
    navigate: [];
}>();

const { sidebarGroups } = useDocsSidebar();

const groups = computed(() => sidebarGroups.value.filter((group) => group.items?.length));
</script>

<template>
    <div class="min-h-full bg-white">
        <div class="border-b border-slate-200/80 px-4 pb-4 pt-5">
            <div class="flex min-w-0 items-center gap-3">
                <img
                    v-if="logoSrc"
                    :src="logoSrc"
                    alt=""
                    class="block h-7 w-auto max-w-[156px] shrink-0 object-contain"
                >
                <div v-else class="min-w-0 truncate text-base font-semibold tracking-[-0.01em] text-slate-900">
                    {{ siteTitle }}
                </div>
            </div>
        </div>

        <div class="px-4 pb-6 pt-6">
            <nav aria-label="Sidebar navigation" class="text-sm">
                <section
                    v-for="group in groups"
                    :key="group.text ?? group.items?.[0]?.link"
                    class="mt-6 first:mt-0"
                >
                    <h2
                        v-if="group.text"
                        class="mb-3 flex items-center gap-2.5 text-sm font-medium text-slate-900"
                    >
                        <DocsIcon
                            v-if="group.icon"
                            :name="group.icon"
                            class="size-4 text-slate-600"
                        />
                        {{ group.text }}
                    </h2>

                    <ul class="space-y-px">
                        <DocsMobileMenuNode
                            v-for="item in group.items"
                            :key="item.link ?? `${item.text}-${item.icon ?? ''}`"
                            :item="item"
                            @navigate="$emit('navigate')"
                        />
                    </ul>
                </section>
            </nav>
        </div>
    </div>
</template>
