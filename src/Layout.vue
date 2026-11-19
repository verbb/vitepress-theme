<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Content, onContentUpdated, useData, useRoute, withBase } from 'vitepress';
import DocsMobileMenu from './components/DocsMobileMenu.vue';
import DocsNotFound from './components/DocsNotFound.vue';
import DocsOutline from './components/DocsOutline.vue';
import DocsSearchProvider from './components/DocsSearchProvider.vue';
import DocsSidebar from './components/DocsSidebar.vue';
import { openDocsSearch } from './search';
import { hasActiveSidebarItem, isActivePath, type SidebarGroup, type SidebarItem, useCloseSidebarOnEscape, useDocsSidebar } from './sidebar';

type DocsThemeOptions = {
    homeLink?: string;
    primary?: string;
    primaryStrong?: string;
    primarySoft?: string;
    primarySoftHover?: string;
    primaryBorder?: string;
    primaryBorderStrong?: string;
};

type DocsNavItem = {
    text?: string;
    link?: string;
    activeMatch?: string;
    items?: DocsNavItem[];
};

type DocsNavLink = {
    text: string;
    link: string;
    activeMatch?: string;
};

const route = useRoute();
const { frontmatter, page, site, theme } = useData();
const { close, hasSidebar, isOpen, toggle, sidebarGroups } = useDocsSidebar();
const docsScrollContainer = ref<HTMLDivElement | null>(null);
const navigationItems = ref<HTMLDivElement | null>(null);
const sidebarHasTopFade = ref(false);
const topNavRootDesktop = ref<HTMLDivElement | null>(null);
const topNavRootMobile = ref<HTMLDivElement | null>(null);
const topNavMenuDesktopOpen = ref(false);
const topNavMenuMobileOpen = ref(false);

useCloseSidebarOnEscape(isOpen, close);

watch(() => route.path, close);
watch(() => route.path, async (nextPath, previousPath) => {
    await syncRouteScroll(nextPath, previousPath);
});

const logoSrc = computed(() => {
    if (!theme.value.logo) {
        return null;
    }

    return typeof theme.value.logo === 'string'
        ? withBase(theme.value.logo)
        : withBase(theme.value.logo.src);
});

const showOutline = computed(() => {
    if (frontmatter.value.layout === false || frontmatter.value.layout === 'home') {
        return false;
    }

    if (frontmatter.value.aside === false) {
        return false;
    }

    return (frontmatter.value.outline ?? theme.value.outline) !== false;
});

const siteTitle = computed(() => {
    if (typeof theme.value.siteTitle === 'string' && theme.value.siteTitle.trim()) {
        return theme.value.siteTitle;
    }

    return site.value.title;
});
const homeHref = computed(() => {
    const configuredHomeLink = (theme.value as typeof theme.value & { docsTheme?: DocsThemeOptions; }).docsTheme?.homeLink;

    return configuredHomeLink || site.value.base || '/';
});
const socialLinks = computed(() => theme.value.socialLinks ?? []);
const currentSidebarGroup = computed<SidebarGroup | null>(() => {
    return sidebarGroups.value.find((group) => {
        return group.items?.some((item) => hasActiveSidebarItem(page.value.relativePath, item as SidebarItem));
    }) ?? null;
});
const mobilePageTitle = computed(() => {
    return frontmatter.value.title
        ?? page.value.title
        ?? siteTitle.value;
});
const mobileBreadcrumbs = computed(() => {
    const items = [sectionLabel.value, mobilePageTitle.value]
        .filter((value): value is string => Boolean(value?.trim()));

    return items.filter((value, index) => value !== items[index - 1]);
});
const mobileBreadcrumbLead = computed(() => {
    return mobileBreadcrumbs.value.length > 1
        ? mobileBreadcrumbs.value[0]
        : null;
});
const mobileBreadcrumbCurrent = computed(() => {
    return mobileBreadcrumbs.value.at(-1) ?? siteTitle.value;
});
const hasSearch = computed(() => {
    const searchConfig = (theme.value as typeof theme.value & {
        search?: { provider?: string; };
        algolia?: unknown;
    });

    return Boolean(searchConfig.search?.provider || searchConfig.algolia);
});
const docsTheme = computed(() => {
    return ((theme.value as typeof theme.value & { docsTheme?: DocsThemeOptions; }).docsTheme ?? {});
});
const editLinkConfig = computed(() => {
    return (theme.value as typeof theme.value & {
        editLink?: { pattern?: string; text?: string; };
    }).editLink;
});
const lastUpdatedText = computed(() => {
    return (theme.value as typeof theme.value & { lastUpdatedText?: string; }).lastUpdatedText ?? 'Last updated';
});

function flattenSidebarLinks(items: SidebarItem[]): SidebarItem[] {
    const links: SidebarItem[] = [];

    for (const item of items) {
        if (item.link) {
            links.push(item);
        }

        if (item.items?.length) {
            links.push(...flattenSidebarLinks(item.items));
        }
    }

    return links;
}

function findActiveSidebarTrail(items: SidebarItem[], currentPath: string): SidebarItem[] | null {
    for (const item of items) {
        if (item.link && hasActiveSidebarItem(currentPath, item)) {
            return [item];
        }

        if (!item.items?.length) {
            continue;
        }

        const childTrail = findActiveSidebarTrail(item.items, currentPath);

        if (childTrail) {
            return [item, ...childTrail];
        }
    }

    return null;
}

function flattenNavItems(items: DocsNavItem[]): DocsNavLink[] {
    const links: DocsNavLink[] = [];

    for (const item of items) {
        if (item.text && item.link) {
            links.push({
                text: item.text,
                link: item.link,
                activeMatch: item.activeMatch,
            });
        }

        if (item.items?.length) {
            links.push(...flattenNavItems(item.items));
        }
    }

    return links;
}

function normalizeRoutePath(path: string) {
    const sanitizedPath = decodeURI(path).split(/[?#]/, 1)[0] || '/';
    const base = site.value.base && site.value.base !== '/'
        ? site.value.base.replace(/\/+$/, '')
        : '';
    const baseRelativePath = base && sanitizedPath.startsWith(`${base}/`)
        ? sanitizedPath.slice(base.length)
        : sanitizedPath;

    if (baseRelativePath === '/') {
        return '/';
    }

    const withoutIndex = baseRelativePath.replace(/\/index(?:\.html)?$/, '/');
    const withoutExtension = withoutIndex.replace(/\.html$/, '');

    return withoutExtension === '/'
        ? '/'
        : withoutExtension.replace(/\/+$/, '');
}

const currentRoutePath = computed(() => normalizeRoutePath(route.path));
const topNavLinks = computed(() => {
    const nav = Array.isArray(theme.value.nav) ? theme.value.nav as DocsNavItem[] : [];

    return flattenNavItems(nav);
});

function isTopNavLinkActive(item: DocsNavLink) {
    if (item.activeMatch) {
        return new RegExp(item.activeMatch).test(currentRoutePath.value);
    }

    const targetPath = normalizeRoutePath(item.link);

    if (targetPath === '/') {
        return currentRoutePath.value === '/';
    }

    return currentRoutePath.value === targetPath
        || currentRoutePath.value.startsWith(`${targetPath}/`);
}

const activeTopNavItem = computed(() => {
    return topNavLinks.value.find((item) => isTopNavLinkActive(item)) ?? null;
});
const activeTopNavLabel = computed(() => {
    return activeTopNavItem.value?.text
        ?? topNavLinks.value[0]?.text
        ?? 'Documentation';
});

function closeTopNavMenus() {
    topNavMenuDesktopOpen.value = false;
    topNavMenuMobileOpen.value = false;
}

function toggleTopNavMenuDesktop() {
    topNavMenuDesktopOpen.value = !topNavMenuDesktopOpen.value;
    topNavMenuMobileOpen.value = false;
}

function toggleTopNavMenuMobile() {
    topNavMenuMobileOpen.value = !topNavMenuMobileOpen.value;
    topNavMenuDesktopOpen.value = false;
}

function onDocumentPointerDown(event: MouseEvent | PointerEvent) {
    const target = event.target as Node;

    if (
        topNavMenuDesktopOpen.value
        && topNavRootDesktop.value
        && !topNavRootDesktop.value.contains(target)
    ) {
        topNavMenuDesktopOpen.value = false;
    }

    if (
        topNavMenuMobileOpen.value
        && topNavRootMobile.value
        && !topNavRootMobile.value.contains(target)
    ) {
        topNavMenuMobileOpen.value = false;
    }
}

watch(() => route.path, closeTopNavMenus);

const sectionLabel = computed(() => {
    const currentGroup = currentSidebarGroup.value;

    if (!currentGroup?.items?.length) {
        return currentGroup?.text ?? null;
    }

    const activeTrail = findActiveSidebarTrail(currentGroup.items as SidebarItem[], page.value.relativePath);

    if (!activeTrail?.length || activeTrail.length === 1) {
        return currentGroup.text ?? null;
    }

    return activeTrail.at(-2)?.text ?? currentGroup.text ?? null;
});
const flatSectionLinks = computed(() => {
    return currentSidebarGroup.value?.items?.length
        ? flattenSidebarLinks(currentSidebarGroup.value.items as SidebarItem[])
        : [];
});
const currentSectionIndex = computed(() => {
    return flatSectionLinks.value.findIndex((item) => isActivePath(page.value.relativePath, item.link));
});
const previousPageLink = computed(() => {
    const index = currentSectionIndex.value;

    return index > 0 ? flatSectionLinks.value[index - 1] : null;
});
const nextPageLink = computed(() => {
    const index = currentSectionIndex.value;

    return index >= 0 && index < flatSectionLinks.value.length - 1
        ? flatSectionLinks.value[index + 1]
        : null;
});
const editLink = computed(() => {
    if (frontmatter.value.editLink === false) {
        return null;
    }

    const pattern = editLinkConfig.value?.pattern;
    const filePath = page.value.filePath;

    if (!pattern || !filePath) {
        return null;
    }

    return {
        text: editLinkConfig.value?.text ?? 'Edit this page',
        href: pattern.replace(':path', filePath),
    };
});
const formattedLastUpdated = computed(() => {
    if (frontmatter.value.lastUpdated === false) {
        return null;
    }

    const value = (page.value as typeof page.value & { lastUpdated?: number; }).lastUpdated;

    if (!value) {
        return null;
    }

    return new Intl.DateTimeFormat(site.value.lang || undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(value);
});
const docsThemeStyle = computed<Record<string, string>>(() => {
    const primary = docsTheme.value.primary?.trim() || '#0f766e';

    return {
        '--docs-primary': primary,
        '--docs-primary-strong': docsTheme.value.primaryStrong?.trim()
            || `color-mix(in oklab, ${primary} 82%, black)`,
        '--docs-primary-soft': docsTheme.value.primarySoft?.trim()
            || `color-mix(in oklab, ${primary} 12%, white)`,
        '--docs-primary-soft-hover': docsTheme.value.primarySoftHover?.trim()
            || `color-mix(in oklab, ${primary} 16%, white)`,
        '--docs-primary-border': docsTheme.value.primaryBorder?.trim()
            || `color-mix(in oklab, ${primary} 18%, white)`,
        '--docs-primary-border-strong': docsTheme.value.primaryBorderStrong?.trim()
            || `color-mix(in oklab, ${primary} 28%, white)`,
    };
});

function updateSidebarFade() {
    const element = navigationItems.value;

    if (!element) {
        sidebarHasTopFade.value = false;
        return;
    }

    sidebarHasTopFade.value = element.scrollTop > 4;
}

function getRoutePathname(path: string) {
    return path.split('#')[0] ?? path;
}

function getRouteHash(path: string) {
    const hashIndex = path.indexOf('#');

    return hashIndex >= 0 ? decodeURIComponent(path.slice(hashIndex + 1)) : '';
}

function getActiveHash(path: string) {
    const routeHash = getRouteHash(path);

    if (routeHash) {
        return routeHash;
    }

    return typeof window !== 'undefined'
        ? decodeURIComponent(window.location.hash.replace(/^#/, ''))
        : '';
}

function getScrollContainer() {
    return docsScrollContainer.value
        ?? document.getElementById('docs-scroll-container')
        ?? document.getElementById('content-container');
}

function resetContentScroll() {
    getScrollContainer()?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function scrollContentToHash(hash: string) {
    if (!hash) {
        return false;
    }

    const target = document.getElementById(hash);
    const scrollContainer = getScrollContainer();

    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (!(scrollContainer instanceof HTMLElement)) {
        target.scrollIntoView({ block: 'start' });
        return true;
    }

    const top = scrollContainer.scrollTop
        + target.getBoundingClientRect().top
        - scrollContainer.getBoundingClientRect().top
        - 24;

    scrollContainer.scrollTo({
        top: Math.max(0, top),
        left: 0,
        behavior: 'auto',
    });

    return true;
}

async function syncRouteScroll(nextPath: string, previousPath?: string) {
    await nextTick();
    updateSidebarFade();

    if (getRoutePathname(nextPath) !== getRoutePathname(previousPath ?? '')) {
        resetContentScroll();
    }

    const hash = getActiveHash(nextPath);

    if (hash) {
        await nextTick();
        scrollContentToHash(hash);
    }
}

function createSvgIcon(
    pathData: string,
    className: string,
    options?: {
        fill?: boolean;
        size?: number;
        strokeWidth?: number;
        viewBox?: string;
    },
) {
    const size = options?.size ?? 18;
    const strokeWidth = options?.strokeWidth ?? 1.5;
    const viewBox = options?.viewBox ?? `0 0 ${size} ${size}`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', className);

    for (const d of pathData.split('||')) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        if (options?.fill) {
            path.setAttribute('fill', 'currentColor');
        } else {
            path.setAttribute('stroke', 'currentColor');
            path.setAttribute('stroke-width', String(strokeWidth));
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
        }
        svg.append(path);
    }

    return svg;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // Fall back to the legacy copy path below.
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.append(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    try {
        return document.execCommand('copy');
    } finally {
        textarea.remove();
    }
}

function getCodeBlockText(block: HTMLElement): string {
    const lines = Array.from(block.querySelectorAll('pre code .line'));

    if (lines.length) {
        return lines
            .map((line) => line.textContent ?? '')
            .join('\n')
            .replace(/\n$/, '');
    }

    const code = block.querySelector('pre code');
    return (code?.textContent ?? '').replace(/\n$/, '');
}

function getHeadingUrl(id: string): URL {
    const url = new URL(window.location.href);
    url.hash = id;
    return url;
}

function selectionHasText(): boolean {
    const selection = window.getSelection();
    return Boolean(selection && selection.type === 'Range' && selection.toString().trim());
}

function hydrateHeadingAnchors() {
    document
        .querySelectorAll<HTMLElement>('.vp-doc h2[id], .vp-doc h3[id], .vp-doc h4[id], .vp-doc h5[id], .vp-doc h6[id]')
        .forEach((heading) => {
            if (heading.dataset.docsHeadingCopyBound === 'true') {
                return;
            }

            const anchor = heading.querySelector<HTMLAnchorElement>('.header-anchor');

            if (!anchor) {
                return;
            }

            heading.dataset.docsHeadingCopyBound = 'true';
            heading.classList.add('docs-copyable-heading');
            const content = document.createElement('span');
            content.className = 'anchor-heading__content';

            while (heading.childNodes.length > 0) {
                const child = heading.firstChild;

                if (child === anchor) {
                    break;
                }

                content.appendChild(child as Node);
            }

            const anchorWrap = document.createElement('div');
            anchorWrap.className = 'anchor-heading__icon-wrap';
            anchorWrap.tabIndex = -1;
            anchorWrap.appendChild(anchor);
            heading.prepend(anchorWrap);
            heading.appendChild(content);

            anchor.replaceChildren(
                createSvgIcon(
                    'M0 256C0 167.6 71.6 96 160 96h72c13.3 0 24 10.7 24 24s-10.7 24-24 24H160C98.1 144 48 194.1 48 256s50.1 112 112 112h72c13.3 0 24 10.7 24 24s-10.7 24-24 24H160C71.6 416 0 344.4 0 256zm576 0c0 88.4-71.6 160-160 160H344c-13.3 0-24-10.7-24-24s10.7-24 24-24h72c61.9 0 112-50.1 112-112s-50.1-112-112-112H344c-13.3 0-24-10.7-24-24s10.7-24 24-24h72c88.4 0 160 71.6 160 160zM184 232H392c13.3 0 24 10.7 24 24s-10.7 24-24 24H184c-13.3 0-24-10.7-24-24s10.7-24 24-24z',
                    'docs-heading-anchor__icon',
                    { fill: true, size: 12, viewBox: '0 0 576 512' },
                ),
            );

            heading.addEventListener('click', (event) => {
                if (selectionHasText()) {
                    return;
                }

                if (event.target instanceof HTMLElement && event.target.closest('a:not(.header-anchor)')) {
                    return;
                }

                const target = event.target instanceof HTMLElement ? event.target : null;
                const clickedHeadingText = target?.closest('.anchor-heading__content');
                const clickedAnchor = target?.closest('.header-anchor');

                if (!clickedHeadingText && !clickedAnchor) {
                    return;
                }

                event.preventDefault();

                const url = getHeadingUrl(heading.id);
                window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
                scrollContentToHash(heading.id);
                void copyTextToClipboard(url.toString());
            });
        });
}

function hydrateCodeCopyButtons() {
    document
        .querySelectorAll<HTMLButtonElement>('.vp-doc [class*="language-"] > button.copy')
        .forEach((button) => {
            if (button.querySelector('.docs-copy-button__icon')) {
                if (button.dataset.docsCopyBound === 'true') {
                    return;
                }
            } else {
                const copyIcon = createSvgIcon(
                    'M14.25 5.25H7.25C6.14543 5.25 5.25 6.14543 5.25 7.25V14.25C5.25 15.3546 6.14543 16.25 7.25 16.25H14.25C15.3546 16.25 16.25 15.3546 16.25 14.25V7.25C16.25 6.14543 15.3546 5.25 14.25 5.25Z||M2.80103 11.998L1.77203 5.07397C1.61003 3.98097 2.36403 2.96397 3.45603 2.80197L10.38 1.77297C11.313 1.63397 12.19 2.16297 12.528 3.00097',
                    'docs-copy-button__icon',
                );
                const copiedIcon = createSvgIcon(
                    'M2.75 9.25L6.75 13.25L15.25 4.75',
                    'docs-copy-button__icon docs-copy-button__icon--copied',
                    { size: 18, strokeWidth: 2, viewBox: '0 0 18 18' },
                );
                const label = document.createElement('span');
                label.className = 'sr-only';
                label.textContent = button.title || 'Copy code';

                button.replaceChildren(copyIcon, copiedIcon, label);
            }

            button.dataset.docsCopyBound = 'true';
            button.type = 'button';

            button.addEventListener('click', async(event) => {
                event.preventDefault();
                event.stopPropagation();

                const block = button.closest('[class*="language-"]');

                if (!(block instanceof HTMLElement)) {
                    return;
                }

                const text = getCodeBlockText(block);

                if (!text) {
                    return;
                }

                const copied = await copyTextToClipboard(text);

                if (!copied) {
                    return;
                }

                button.classList.add('copied');
                window.setTimeout(() => {
                    button.classList.remove('copied');
                }, 1500);
            });
        });
}

function openSearch() {
    openDocsSearch();
}

onMounted(async () => {
    document.addEventListener('pointerdown', onDocumentPointerDown);
    await syncRouteScroll(route.path);
    hydrateCodeCopyButtons();
    hydrateHeadingAnchors();
    navigationItems.value?.addEventListener('scroll', updateSidebarFade, { passive: true });
});

onContentUpdated(async () => {
    await nextTick();
    hydrateCodeCopyButtons();
    hydrateHeadingAnchors();
    scrollContentToHash(getActiveHash(route.path));
});

onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onDocumentPointerDown);
    navigationItems.value?.removeEventListener('scroll', updateSidebarFade);
});
</script>

<template>
    <div v-if="frontmatter.layout !== false" class="min-h-screen bg-slate-50 text-slate-900 lg:h-screen lg:overflow-hidden">
        <DocsSearchProvider v-if="hasSearch" />
        <div class="max-lg:contents lg:flex lg:w-full" data-docs-theme="almond" :style="docsThemeStyle">
            <div class="max-lg:contents lg:flex-1 lg:min-w-0 lg:overflow-x-clip">
                <!--
                  When the mobile drawer is open, disable hits on the whole navbar.
                  Inner fade already uses pointer-events-none, but the header chrome
                  wrappers still sit at z-30 above the close control and steal clicks.
                -->
                <header
                    id="navbar"
                    class="peer fixed top-0 z-30 w-full"
                    :class="isOpen ? 'max-lg:pointer-events-none' : ''"
                >
                    <!--
                      Mobile inset matches the content card's border edge (grid px-2 = 8px),
                      not the prose column — logo / switcher / icons line up with the box.
                    -->
                    <div class="relative z-10 mx-auto max-w-[96rem] px-4 max-lg:px-3">
                        <div class="relative">
                            <div
                                class="transition-opacity duration-200"
                                :class="isOpen ? 'max-lg:pointer-events-none max-lg:opacity-0' : ''"
                            >
                                <div class="lg:hidden">
                                    <div class="flex h-14 items-center justify-between gap-3">
                                        <div class="flex min-w-0 flex-1 items-center gap-2.5">
                                            <a :href="homeHref" class="flex min-w-0 shrink items-center gap-3 select-none">
                                                <img v-if="logoSrc" :src="logoSrc" alt="" class="relative block h-6 w-auto max-w-[156px] shrink-0 object-contain" />
                                                <div v-if="!logoSrc" class="min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
                                                    {{ siteTitle }}
                                                </div>
                                            </a>

                                            <!--
                                              Keep the section switcher on the logo row on mobile —
                                              a second sticky row costs too much viewport height.
                                            -->
                                            <div
                                                v-if="topNavLinks.length"
                                                ref="topNavRootMobile"
                                                class="relative min-w-0 shrink"
                                            >
                                                <button
                                                    type="button"
                                                    class="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 py-1.5 pl-2.5 pr-2 text-sm font-medium text-slate-800"
                                                    :aria-expanded="topNavMenuMobileOpen"
                                                    aria-haspopup="listbox"
                                                    aria-label="Documentation section"
                                                    @click.stop="toggleTopNavMenuMobile"
                                                >
                                                    <span class="min-w-0 truncate">{{ activeTopNavLabel }}</span>
                                                    <svg
                                                        class="h-4 w-4 shrink-0 text-slate-500 transition-transform"
                                                        :class="topNavMenuMobileOpen ? 'rotate-180' : ''"
                                                        viewBox="0 0 20 20"
                                                        fill="none"
                                                        aria-hidden="true"
                                                    >
                                                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
                                                    </svg>
                                                </button>
                                                <div
                                                    v-if="topNavMenuMobileOpen"
                                                    class="absolute left-0 top-full z-[100] mt-1 min-w-[12rem] max-w-[min(100vw-2rem,22rem)] rounded-xl border border-slate-200/80 bg-white py-1 shadow-lg"
                                                    role="listbox"
                                                    :aria-label="`${activeTopNavLabel} options`"
                                                >
                                                    <a
                                                        v-for="item in topNavLinks"
                                                        :key="item.link"
                                                        :href="withBase(item.link)"
                                                        role="option"
                                                        class="block truncate px-3 py-2 text-sm transition"
                                                        :class="isTopNavLinkActive(item)
                                                            ? 'bg-docs-primary-soft font-medium text-docs-primary-strong'
                                                            : 'text-slate-700 hover:bg-slate-50'"
                                                        :aria-selected="isTopNavLinkActive(item)"
                                                        @click="closeTopNavMenus"
                                                    >
                                                        {{ item.text }}
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="-mr-2 flex shrink-0 items-center gap-1.5">
                                            <button
                                                v-if="hasSearch"
                                                type="button"
                                                class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/80 hover:text-slate-900"
                                                aria-label="Open search"
                                                @click="openSearch"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-[18px] w-[18px]" aria-hidden="true">
                                                    <circle cx="11" cy="11" r="8" />
                                                    <path d="m21 21-4.3-4.3" />
                                                </svg>
                                            </button>

                                            <a
                                                v-for="link in socialLinks"
                                                :key="`mobile-${link.link}`"
                                                :href="link.link"
                                                target="_blank"
                                                rel="noreferrer"
                                                class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/80 hover:text-slate-900"
                                                :aria-label="link.icon"
                                            >
                                                <svg
                                                    v-if="link.icon === 'github'"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                    class="h-[18px] w-[18px]"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58l-.02-2.04c-3.34.73-4.04-1.42-4.04-1.42-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.9 0-1.3.46-2.36 1.23-3.19-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.22a11.5 11.5 0 0 1 6 0c2.3-1.54 3.3-1.22 3.3-1.22.65 1.65.24 2.87.12 3.17.76.83 1.22 1.89 1.22 3.19 0 4.58-2.81 5.59-5.49 5.89.43.37.82 1.1.82 2.22l-.01 3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
                                                </svg>
                                            </a>
                                        </div>
                                    </div>

                                    <!--
                                      Second row: page menu + breadcrumb. Lives in the fixed
                                      header (not the scrolling card) so it stays put on scroll.
                                    -->
                                    <button
                                        v-if="hasSidebar"
                                        type="button"
                                        class="flex h-14 w-full items-center px-1 text-left cursor-pointer focus:outline-0"
                                        aria-label="Open navigation menu"
                                        :aria-expanded="isOpen"
                                        @click="toggle"
                                    >
                                        <div class="text-slate-500 transition hover:text-slate-600">
                                            <span class="sr-only">Navigation</span>
                                            <svg class="h-4" fill="currentColor" viewBox="0 0 448 512" aria-hidden="true">
                                                <path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z" />
                                            </svg>
                                        </div>

                                        <div class="ml-4 flex min-w-0 items-center space-x-3 overflow-hidden text-sm leading-6 whitespace-nowrap">
                                            <div v-if="mobileBreadcrumbLead" class="flex shrink-0 items-center space-x-3 text-slate-500">
                                                <span>{{ mobileBreadcrumbLead }}</span>
                                                <svg width="3" height="24" viewBox="0 -9 3 24" class="h-5 overflow-visible text-slate-400" aria-hidden="true">
                                                    <path d="M0 0L3 3L0 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                                                </svg>
                                            </div>
                                            <div class="min-w-0 flex-1 truncate font-semibold text-slate-900">
                                                {{ mobileBreadcrumbCurrent }}
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                <div class="relative hidden h-14 min-w-0 flex-1 items-center gap-x-4 lg:flex lg:border-none">
                                    <div class="flex min-w-0 flex-1 items-center gap-x-4">
                                        <a :href="homeHref" class="flex min-w-0 items-center gap-3 select-none">
                                            <img v-if="logoSrc" :src="logoSrc" alt="" class="relative block h-6 w-auto max-w-[156px] shrink-0 object-contain" />
                                            <div v-if="!logoSrc" class="min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
                                                {{ siteTitle }}
                                            </div>
                                        </a>

                                        <div
                                            v-if="topNavLinks.length"
                                            ref="topNavRootDesktop"
                                            class="relative hidden min-w-0 shrink lg:block"
                                        >
                                            <button
                                                type="button"
                                                class="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-800 backdrop-blur transition hover:bg-slate-100/90"
                                                :aria-expanded="topNavMenuDesktopOpen"
                                                aria-haspopup="listbox"
                                                aria-label="Documentation section"
                                                @click.stop="toggleTopNavMenuDesktop"
                                            >
                                                <span class="truncate">{{ activeTopNavLabel }}</span>
                                                <svg
                                                    class="h-4 w-4 shrink-0 text-slate-500 transition-transform"
                                                    :class="topNavMenuDesktopOpen ? 'rotate-180' : ''"
                                                    viewBox="0 0 20 20"
                                                    fill="none"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
                                                </svg>
                                            </button>
                                            <div
                                                v-if="topNavMenuDesktopOpen"
                                                class="absolute left-0 top-full z-[100] mt-1 min-w-[12rem] max-w-[min(100vw-2rem,22rem)] rounded-xl border border-slate-200/80 bg-white py-1 shadow-lg"
                                                role="listbox"
                                                :aria-label="`${activeTopNavLabel} options`"
                                            >
                                                <a
                                                    v-for="item in topNavLinks"
                                                    :key="item.link"
                                                    :href="withBase(item.link)"
                                                    role="option"
                                                    class="block truncate px-3 py-2 text-sm transition"
                                                    :class="isTopNavLinkActive(item)
                                                        ? 'bg-docs-primary-soft font-medium text-docs-primary-strong'
                                                        : 'text-slate-700 hover:bg-slate-50'"
                                                    :aria-selected="isTopNavLinkActive(item)"
                                                    @click="closeTopNavMenus"
                                                >
                                                    {{ item.text }}
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="-mr-2 flex items-center gap-4">
                                        <div class="flex items-center gap-2">
                                            <a
                                                v-for="link in socialLinks"
                                                :key="link.link"
                                                :href="link.link"
                                                target="_blank"
                                                rel="noreferrer"
                                                class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/80 hover:text-slate-900"
                                                :aria-label="link.icon"
                                            >
                                                <svg
                                                    v-if="link.icon === 'github'"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                    class="h-[18px] w-[18px]"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58l-.02-2.04c-3.34.73-4.04-1.42-4.04-1.42-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.9 0-1.3.46-2.36 1.23-3.19-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.22a11.5 11.5 0 0 1 6 0c2.3-1.54 3.3-1.22 3.3-1.22.65 1.65.24 2.87.12 3.17.76.83 1.22 1.89 1.22 3.19 0 4.58-2.81 5.59-5.49 5.89.43.37.82 1.1.82 2.22l-.01 3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
                                                </svg>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <!--
                  Mobile sticky chrome is two h-14 rows (logo/switcher/icons + page menu),
                  so the content shell drops 7rem; desktop keeps its single 3.5rem bar.
                -->
                <div class="scroll-mt-[var(--scroll-mt)] fixed top-[7rem] w-full pb-2 pt-0 lg:top-[3.5rem]">
                    <!--
                      Own stacking context above the navbar (z-30). Child z-index alone
                      was trapped under the header because this content shell is z-auto.
                    -->
                    <div
                        v-if="hasSidebar"
                        class="fixed inset-0 z-40 lg:hidden"
                        :class="isOpen ? '' : 'pointer-events-none'"
                        :aria-hidden="isOpen ? undefined : 'true'"
                    >
                        <div
                            class="absolute inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity duration-300"
                            :class="isOpen ? 'opacity-100' : 'opacity-0'"
                            @click="close"
                        />

                        <button
                            type="button"
                            class="absolute right-4 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/95 text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.16)] transition duration-300"
                            :class="isOpen ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95'"
                            aria-label="Close navigation menu"
                            @click="close"
                        >
                            <svg viewBox="0 0 20 20" fill="none" class="h-5 w-5" aria-hidden="true">
                                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                            </svg>
                        </button>

                        <aside
                            class="absolute inset-y-0 left-0 w-[min(22rem,calc(100vw-2.5rem))] max-w-full overflow-y-auto overscroll-contain border-r border-slate-200/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.22)] transition-transform duration-300"
                            :class="isOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-[105%]'"
                        >
                            <DocsMobileMenu
                                :logo-src="logoSrc"
                                :site-title="siteTitle"
                                @navigate="close"
                            />
                        </aside>
                    </div>

                    <div
                        class="mx-auto grid h-[calc(100dvh-7rem)] min-h-0 w-full max-w-[96rem] rounded-2xl px-2 lg:h-[calc(100dvh-4rem)] lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:gap-x-2 lg:px-4"
                        :class="hasSidebar ? '' : 'lg:grid-cols-[minmax(0,1fr)]'"
                    >
                        <div
                            v-if="hasSidebar"
                            id="sidebar-content"
                            class="hidden min-h-0 lg:flex lg:flex-col"
                        >
                            <div class="flex h-full min-h-0 flex-col gap-4 text-sm">
                                <div class="relative z-20 hidden items-center gap-2.5 mr-4 mt-2 mb-2 lg:flex">
                                    <button
                                        v-if="hasSearch"
                                        type="button"
                                        class="group/search flex h-9 w-full items-center justify-between gap-2 rounded-lg bg-white pl-3.5 pr-3 text-left text-sm leading-6 text-gray-500 ring-1 ring-gray-400/30 transition-[color,box-shadow] hover:text-gray-800 hover:ring-gray-600/30"
                                        aria-label="Open search"
                                        @click="openSearch"
                                    >
                                        <div class="flex min-w-0 items-center gap-2">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 min-w-4 flex-none text-gray-700" aria-hidden="true">
                                                <circle cx="11" cy="11" r="8" />
                                                <path d="m21 21-4.3-4.3" />
                                            </svg>
                                            <div class="min-w-0 truncate">Search...</div>
                                        </div>
                                        <span class="flex-none text-xs">⌘K</span>
                                    </button>
                                </div>

                                <div
                                    id="navigation-items"
                                    ref="navigationItems"
                                    class="stable-scrollbar-gutter pb-4 min-h-0 flex-1 overflow-y-auto"
                                    :class="sidebarHasTopFade ? '[mask-image:linear-gradient(transparent,black_32px)] [-webkit-mask-image:linear-gradient(transparent,black_32px)]' : ''"
                                >
                                    <DocsSidebar />
                                </div>
                            </div>
                        </div>

                        <div class="min-w-0 h-full min-h-0">
                            <div
                                id="docs-scroll-container"
                                ref="docsScrollContainer"
                                class="stable-scrollbar-gutter h-full overflow-y-auto rounded-xl border border-gray-400/30 bg-white px-4 pb-10 pt-6 lg:px-10 lg:pt-10"
                            >
                                <div
                                    class="mx-auto w-full max-w-[88rem] xl:grid xl:grid-cols-[minmax(0,52rem)_16.5rem] xl:justify-center xl:gap-x-12"
                                >
                                    <main id="content-area" class="w-full min-w-0 overflow-x-visible">
                                        <DocsNotFound v-if="page.isNotFound" />
                                        <template v-else>
                                            <div
                                                v-if="sectionLabel"
                                                class="eyebrow mb-2.5 h-5 text-sm font-semibold text-docs-primary"
                                            >
                                                {{ sectionLabel }}
                                            </div>

                                            <Content class="vp-doc mdx-content relative prose prose-gray [contain:inline-size] isolate" />

                                            <div
                                                v-if="editLink || formattedLastUpdated || previousPageLink || nextPageLink"
                                                class="mt-12 border-t border-slate-200 pt-6"
                                            >
                                                <div
                                                    v-if="editLink || formattedLastUpdated"
                                                    class="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <a
                                                        v-if="editLink"
                                                        :href="editLink.href"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        class="font-medium text-docs-primary transition hover:text-docs-primary-strong"
                                                    >
                                                        {{ editLink.text }}
                                                    </a>

                                                    <div v-if="formattedLastUpdated">
                                                        {{ lastUpdatedText }}: {{ formattedLastUpdated }}
                                                    </div>
                                                </div>

                                                <div
                                                    v-if="previousPageLink || nextPageLink"
                                                    class="mt-6 grid gap-3 sm:grid-cols-2"
                                                >
                                                    <a
                                                        v-if="previousPageLink?.link"
                                                        :href="withBase(previousPageLink.link)"
                                                        class="group rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-docs-primary-border-strong hover:bg-docs-primary-soft/50"
                                                    >
                                                        <div class="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Previous</div>
                                                        <div class="mt-1 text-sm font-medium text-slate-900 group-hover:text-docs-primary-strong">
                                                            {{ previousPageLink.text }}
                                                        </div>
                                                    </a>
                                                    <div v-else class="hidden sm:block" />

                                                    <a
                                                        v-if="nextPageLink?.link"
                                                        :href="withBase(nextPageLink.link)"
                                                        class="group rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-docs-primary-border-strong hover:bg-docs-primary-soft/50 sm:text-right"
                                                    >
                                                        <div class="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Next</div>
                                                        <div class="mt-1 text-sm font-medium text-slate-900 group-hover:text-docs-primary-strong">
                                                            {{ nextPageLink.text }}
                                                        </div>
                                                    </a>
                                                </div>
                                            </div>
                                        </template>
                                    </main>

                                    <aside
                                        v-if="showOutline"
                                        id="content-side-layout"
                                        class="hidden xl:block"
                                    >
                                        <div class="sticky top-0 pt-1">
                                            <div
                                                id="table-of-contents-shell"
                                                class="max-h-[calc(100dvh-7rem)] w-[16.5rem] overflow-y-auto space-y-2 pb-4 text-sm leading-6 text-slate-600"
                                            >
                                                <DocsOutline />
                                            </div>
                                        </div>
                                    </aside>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <Content v-else />
</template>
