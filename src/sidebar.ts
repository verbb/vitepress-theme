import { computed, onMounted, onUnmounted, ref, watch, watchEffect, type Ref } from 'vue';
import { useData } from 'vitepress';

export type SidebarItem = {
    text?: string;
    link?: string;
    base?: string;
    icon?: string;
    collapsed?: boolean;
    items?: SidebarItem[];
};

export type SidebarGroup = {
    text?: string;
    icon?: string;
    items: SidebarItem[];
};

type SidebarConfig = SidebarItem[] | Record<string, SidebarItem[] | { base?: string; items: SidebarItem[] }> | undefined;

const HASH_RE = /#.*$/;
const HASH_OR_QUERY_RE = /[?#].*$/;
const INDEX_OR_EXT_RE = /(?:(^|\/)index)?\.(?:md|html)$/;

function normalize(path: string) {
    return decodeURI(path)
        .replace(HASH_OR_QUERY_RE, '')
        .replace(INDEX_OR_EXT_RE, '$1');
}

function ensureStartingSlash(path: string) {
    return /^\//.test(path) ? path : `/${path}`;
}

function addBase(items: SidebarItem[], parentBase?: string): SidebarItem[] {
    return items.map((rawItem) => {
        const item = { ...rawItem };
        const base = item.base || parentBase;

        if (base && item.link) {
            item.link = `${base}${item.link}`;
        }

        if (item.items) {
            item.items = addBase(item.items, base);
        }

        return item;
    });
}

export function isActivePath(currentPath: string, matchPath?: string, asRegex = false) {
    if (matchPath === undefined) {
        return false;
    }

    const normalizedCurrentPath = normalize(`/${currentPath}`);

    if (asRegex) {
        return new RegExp(matchPath).test(normalizedCurrentPath);
    }

    if (normalize(matchPath) !== normalizedCurrentPath) {
        return false;
    }

    const hashMatch = matchPath.match(HASH_RE);

    if (hashMatch) {
        return typeof window !== 'undefined' && window.location.hash === hashMatch[0];
    }

    return true;
}

export function hasActiveSidebarItem(currentPath: string, item?: SidebarItem) {
    if (!item) {
        return false;
    }

    if (isActivePath(currentPath, item.link)) {
        return true;
    }

    return item.items?.some((child) => hasActiveSidebarItem(currentPath, child)) ?? false;
}

function getSidebar(sidebar: SidebarConfig, path: string): SidebarItem[] {
    if (Array.isArray(sidebar)) {
        return addBase(sidebar);
    }

    if (!sidebar) {
        return [];
    }

    const normalizedPath = ensureStartingSlash(path);
    const matchingDir = Object.keys(sidebar)
        .sort((a, b) => b.split('/').length - a.split('/').length)
        .find((dir) => normalizedPath.startsWith(ensureStartingSlash(dir)));

    const matchedSidebar = matchingDir ? sidebar[matchingDir] : [];

    if (Array.isArray(matchedSidebar)) {
        return addBase(matchedSidebar);
    }

    return addBase(matchedSidebar.items, matchedSidebar.base);
}

function getSidebarGroups(sidebar: SidebarItem[]): SidebarGroup[] {
    const groups: SidebarGroup[] = [];
    let lastGroupIndex = 0;

    for (const item of sidebar) {
        if (item.items) {
            groups.push({
                text: item.text,
                icon: item.icon,
                items: item.items,
            });
            lastGroupIndex = groups.length - 1;
            continue;
        }

        if (!groups[lastGroupIndex]) {
            groups.push({ items: [] });
            lastGroupIndex = groups.length - 1;
        }

        groups[lastGroupIndex].items.push(item);
    }

    return groups;
}

export function useDocsSidebar() {
    const { frontmatter, page, theme } = useData();
    const isOpen = ref(false);
    const sidebar = computed(() => getSidebar(theme.value.sidebar as SidebarConfig, page.value.relativePath));
    const sidebarGroups = computed(() => getSidebarGroups(sidebar.value));
    const hasSidebar = computed(() => {
        return frontmatter.value.sidebar !== false
            && frontmatter.value.layout !== 'home'
            && sidebar.value.length > 0;
    });

    watch(hasSidebar, (value) => {
        if (!value) {
            isOpen.value = false;
        }
    });

    watchEffect((onCleanup) => {
        if (typeof document === 'undefined') {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const shouldLockScroll = isOpen.value && typeof window !== 'undefined' && window.innerWidth < 1024;

        if (shouldLockScroll) {
            document.body.style.overflow = 'hidden';
        }

        onCleanup(() => {
            document.body.style.overflow = previousOverflow;
        });
    });

    function open() {
        isOpen.value = true;
    }

    function close() {
        isOpen.value = false;
    }

    function toggle() {
        isOpen.value = !isOpen.value;
    }

    return {
        isOpen,
        sidebar,
        sidebarGroups,
        hasSidebar,
        open,
        close,
        toggle,
    };
}

export function useCloseSidebarOnEscape(isOpen: Ref<boolean>, close: () => void) {
    let triggerElement: Element | null = null;

    watchEffect(() => {
        triggerElement = isOpen.value ? document.activeElement : null;
    });

    const onEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen.value) {
            close();

            if (triggerElement instanceof HTMLElement) {
                triggerElement.focus();
            }
        }
    };

    onMounted(() => {
        window.addEventListener('keyup', onEscape);
    });

    onUnmounted(() => {
        window.removeEventListener('keyup', onEscape);
    });
}
