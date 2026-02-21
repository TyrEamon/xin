<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ImagePreview, Snackbar } from "@varlet/ui";
import FloatingTools from "~/components/FloatingTools.vue";
import GalleryCard from "~/components/GalleryCard.vue";
import GalleryTopbar from "~/components/GalleryTopbar.vue";
import { useGallery } from "~/composables/useGallery";

useHead({
  title: "TyrGallery V2",
  meta: [
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { name: "theme-color", content: "#2563eb" },
  ],
  link: [
    { rel: "icon", href: "/logo.png" },
  ],
});

const {
  activeType,
  activeItems,
  activeBucket,
  columns,
  loadingInit,
  listError,
  theme,
  toolsOpen,
  autoScrollEnabled,
  autoScrollPaused,
  adminUploadUrl,
  favoritesUrl,
  switchType,
  loadMoreActive,
  itemPreviewURL,
  itemOriginURL,
  itemSourceURL,
  itemArtistURL,
  safeCardTitle,
  calcRatioPadding,
  toggleTheme,
  setColumns,
  openRandom,
  resetToolsMenu,
  enableAutoScroll,
} = useGallery();

const runtimeCfg = useRuntimeConfig();
const galleryTitle = computed(() => String(runtimeCfg.public.galleryTitle || "TyrGallery"));
const logoSrc = "/logo.png";

const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

function openViewer(startIndex: number) {
  const urls = activeItems.value.map((item) => itemOriginURL(item)).filter(Boolean);
  if (urls.length === 0) {
    return;
  }

  ImagePreview({
    images: urls,
    initialIndex: Math.min(startIndex, Math.max(urls.length - 1, 0)),
    closeable: true,
    indicator: true,
    onChange: (index) => {
      if (urls.length - index <= 3) {
        void loadMoreActive();
      }
    },
  });
}

function toggleTools() {
  toolsOpen.value = !toolsOpen.value;
}

function toggleAutoScroll() {
  enableAutoScroll(!autoScrollEnabled.value);
}

function backToTop() {
  resetToolsMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function randomAll() {
  resetToolsMenu();
  await openRandom("all");
}

async function randomSmart() {
  resetToolsMenu();
  await openRandom("smart");
}

async function onSwitchType(type: "all" | "h" | "v") {
  await switchType(type);
  await nextTick();
  if (observer && sentinel.value) {
    observer.observe(sentinel.value);
  }
}

function buildObserver() {
  if (!import.meta.client) {
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          void loadMoreActive();
        }
      });
    },
    { root: null, rootMargin: "900px 0px", threshold: 0 }
  );

  if (sentinel.value) {
    observer.observe(sentinel.value);
  }
}

onMounted(() => {
  buildObserver();
});

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});

const emptyHint = computed(() => {
  if (loadingInit.value || activeBucket.value.loading) {
    return "";
  }
  if (activeItems.value.length > 0) {
    return "";
  }
  return "还没有图片，等爬虫或上传任务入库后再来看看。";
});

watch(
  () => listError.value,
  (msg) => {
    if (msg) {
      Snackbar.warning(msg);
    }
  }
);
</script>

<template>
  <div class="page-shell">
    <GalleryTopbar
      :title="galleryTitle"
      :logo-src="logoSrc"
      :favorites-url="favoritesUrl"
      :admin-upload-url="adminUploadUrl"
      :active-type="activeType"
      :columns="columns"
      :theme="theme"
      @switch-type="onSwitchType"
      @set-columns="setColumns"
      @toggle-theme="toggleTheme"
    />

    <main class="page">
      <section class="masonry-board" :style="{ '--gallery-cols': columns }">
        <GalleryCard
          v-for="(item, index) in activeItems"
          :key="item.id"
          :item="item"
          :preview-url="itemPreviewURL(item)"
          :source-url="itemSourceURL(item)"
          :artist-url="itemArtistURL(item)"
          :ratio-padding="calcRatioPadding(item)"
          :title="safeCardTitle(item)"
          @open="openViewer(index)"
        />
      </section>

      <div v-if="loadingInit" class="state-line">加载中...</div>
      <div v-else-if="emptyHint" class="state-line">{{ emptyHint }}</div>
      <div v-else-if="activeBucket.loading" class="state-line">继续加载中...</div>
      <div v-else-if="activeBucket.done" class="state-line">已经到底啦</div>

      <div ref="sentinel" class="scroll-sentinel" aria-hidden="true" />
    </main>

    <FloatingTools
      :open="toolsOpen"
      :auto-enabled="autoScrollEnabled"
      :auto-paused="autoScrollPaused"
      @toggle-open="toggleTools"
      @toggle-auto="toggleAutoScroll"
      @back-top="backToTop"
      @random-all="randomAll"
      @random-smart="randomSmart"
    />
  </div>
</template>

