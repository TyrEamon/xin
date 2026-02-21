import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { Snackbar } from "@varlet/ui";
import { useRuntimeConfig } from "#imports";
import type { GalleryBucket, GalleryItem, OrientationType } from "~/types/gallery";

const BATCH_SIZE = 20;
const INTERACTION_RESUME_DELAY_MS = 1200;
const AUTO_SCROLL_PX_PER_FRAME = 0.7;

function clampOrientation(raw: string): OrientationType {
  if (raw === "h" || raw === "v") {
    return raw;
  }
  return "all";
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string") {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function toText(v: unknown, fallback = ""): string {
  if (typeof v === "string") {
    return v;
  }
  if (v == null) {
    return fallback;
  }
  return String(v);
}

function normalizeItem(input: Record<string, unknown>): GalleryItem {
  return {
    id: toText(input.id),
    preview_id: toText(input.preview_id),
    origin_id: toText(input.origin_id),
    title: toText(input.title, "Untitled"),
    artist_name: toText(input.artist_name, "Arts"),
    artist_id: toText(input.artist_id, "none"),
    source_url: toText(input.source_url, "none"),
    source: toText(input.source, "unknown"),
    tags: toText(input.tags),
    created_at: toNumber(input.created_at),
    width: toNumber(input.width),
    height: toNumber(input.height),
  };
}

function createBucket(): GalleryBucket {
  return {
    items: [],
    offset: 0,
    loading: false,
    done: false,
  };
}

export function useGallery() {
  const cfg = useRuntimeConfig();
  const apiBase = String(cfg.public.apiBase || "").replace(/\/$/, "");

  const buckets = reactive<Record<OrientationType, GalleryBucket>>({
    all: createBucket(),
    h: createBucket(),
    v: createBucket(),
  });

  const activeType = ref<OrientationType>("all");
  const columns = ref(4);
  const loadingInit = ref(false);
  const listError = ref("");

  const theme = ref<"light" | "dark">("light");

  const toolsOpen = ref(false);
  const autoScrollEnabled = ref(false);
  const autoScrollPaused = ref(false);

  let rafId = 0;
  let resumeTimer = 0;

  const activeBucket = computed(() => buckets[activeType.value]);
  const activeItems = computed(() => activeBucket.value.items);

  const adminUploadUrl = String(cfg.public.adminUploadUrl || "/admin/upload");
  const favoritesUrl = String(cfg.public.favoritesUrl || "/favorites.html");

  const randomBase = apiBase || (import.meta.client ? window.location.origin : "");

  function buildApiURL(path: string, query: Record<string, string | number | undefined>) {
    const base = apiBase || (import.meta.client ? window.location.origin : "http://localhost");
    const url = new URL(path, base);
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  function toImageURL(fileId: string): string {
    if (!fileId) {
      return "";
    }
    if (fileId.startsWith("http://") || fileId.startsWith("https://")) {
      return fileId;
    }
    return `${apiBase}/image/${encodeURIComponent(fileId)}`;
  }

  function itemPreviewURL(item: GalleryItem): string {
    return toImageURL(item.preview_id);
  }

  function itemOriginURL(item: GalleryItem): string {
    return toImageURL(item.origin_id || item.preview_id);
  }

  function itemSourceURL(item: GalleryItem): string {
    const source = item.source_url.trim();
    if (!source || source === "none") {
      return "";
    }
    return source;
  }

  function itemArtistURL(item: GalleryItem): string {
    const source = (item.source || "").toLowerCase();
    if (source === "pixiv" && item.artist_id && item.artist_id !== "none") {
      return `https://www.pixiv.net/users/${encodeURIComponent(item.artist_id)}`;
    }
    if ((source === "twitter" || source === "x") && item.artist_id && item.artist_id !== "none") {
      return `https://x.com/${encodeURIComponent(item.artist_id)}`;
    }
    return "";
  }

  function safeCardTitle(item: GalleryItem): string {
    return item.title || item.id;
  }

  function calcRatioPadding(item: GalleryItem): string {
    if (item.width > 0 && item.height > 0) {
      return `${(item.height / item.width) * 100}%`;
    }
    return "130%";
  }

  async function fetchBucket(type: OrientationType) {
    const bucket = buckets[type];
    if (bucket.loading || bucket.done) {
      return;
    }

    bucket.loading = true;
    listError.value = "";

    try {
      const endpoint = buildApiURL("/api/posts", {
        type,
        offset: bucket.offset,
        limit: BATCH_SIZE,
      });
      const rows = await $fetch<Record<string, unknown>[]>(endpoint, {
        method: "GET",
      });

      const normalized = Array.isArray(rows) ? rows.map(normalizeItem) : [];
      if (normalized.length < BATCH_SIZE) {
        bucket.done = true;
      }
      bucket.items.push(...normalized);
      bucket.offset += normalized.length;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "load failed";
      listError.value = msg;
      Snackbar.warning(`加载失败: ${msg}`);
    } finally {
      bucket.loading = false;
    }
  }

  async function ensureLoaded(type: OrientationType) {
    const bucket = buckets[type];
    if (bucket.items.length === 0 && !bucket.loading) {
      await fetchBucket(type);
    }
  }

  async function switchType(type: OrientationType) {
    activeType.value = type;
    await ensureLoaded(type);
  }

  async function loadMoreActive() {
    await fetchBucket(activeType.value);
  }

  async function initLoad() {
    loadingInit.value = true;
    await ensureLoaded(activeType.value);
    loadingInit.value = false;
  }

  function detectTheme(): "light" | "dark" {
    const stored = import.meta.client ? localStorage.getItem("theme") : null;
    if (stored === "dark" || stored === "light") {
      return stored;
    }

    if (import.meta.client && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }

    return "light";
  }

  function applyTheme(next: "light" | "dark") {
    theme.value = next;
    if (import.meta.client) {
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    }
  }

  function toggleTheme() {
    applyTheme(theme.value === "dark" ? "light" : "dark");
  }

  function resetToolsMenu() {
    toolsOpen.value = false;
  }

  function chooseSmartRandomType(): OrientationType {
    if (!import.meta.client) {
      return "all";
    }
    return window.innerWidth >= window.innerHeight ? "h" : "v";
  }

  async function openRandom(target: "all" | "smart" | OrientationType) {
    const chosen: OrientationType = target === "smart" ? chooseSmartRandomType() : clampOrientation(target);
    const url = new URL("/api/random", randomBase);
    if (chosen !== "all") {
      url.searchParams.set("type", chosen);
    }
    url.searchParams.set("format", "url");

    try {
      const responseText = await $fetch<string>(url.toString(), { responseType: "text" });
      const targetURL = String(responseText || "").trim();
      if (!targetURL) {
        Snackbar.warning("随机图暂无数据");
        return;
      }
      window.open(targetURL, "_blank", "noopener,noreferrer");
    } catch {
      Snackbar.warning("随机图暂时不可用");
    }
  }

  function clearAutoScrollTimers() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (resumeTimer) {
      clearTimeout(resumeTimer);
      resumeTimer = 0;
    }
  }

  function autoStep() {
    if (!import.meta.client || !autoScrollEnabled.value) {
      return;
    }

    if (!autoScrollPaused.value) {
      window.scrollBy({ top: AUTO_SCROLL_PX_PER_FRAME, left: 0, behavior: "auto" });

      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 700
      ) {
        void loadMoreActive();
      }
    }

    rafId = requestAnimationFrame(autoStep);
  }

  function enableAutoScroll(on: boolean) {
    autoScrollEnabled.value = on;
    if (!on) {
      clearAutoScrollTimers();
      autoScrollPaused.value = false;
      return;
    }

    if (!rafId) {
      rafId = requestAnimationFrame(autoStep);
    }
  }

  function softPauseAutoScroll() {
    if (!autoScrollEnabled.value) {
      return;
    }

    autoScrollPaused.value = true;
    if (resumeTimer) {
      clearTimeout(resumeTimer);
    }
    resumeTimer = window.setTimeout(() => {
      autoScrollPaused.value = false;
    }, INTERACTION_RESUME_DELAY_MS);
  }

  function initColumns() {
    if (!import.meta.client) {
      return;
    }
    const stored = Number(localStorage.getItem("gallery_cols") || "4");
    columns.value = Number.isFinite(stored) ? Math.min(Math.max(stored, 2), 6) : 4;
  }

  function setColumns(value: number) {
    const clamped = Math.min(Math.max(Math.floor(value), 2), 6);
    columns.value = clamped;
    if (import.meta.client) {
      localStorage.setItem("gallery_cols", String(clamped));
    }
  }

  function onWindowScroll() {
    if (!import.meta.client) {
      return;
    }

    if (
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 900
    ) {
      void loadMoreActive();
    }
  }

  onMounted(() => {
    initColumns();
    applyTheme(detectTheme());
    void initLoad();

    window.addEventListener("scroll", onWindowScroll, { passive: true });
    window.addEventListener("wheel", softPauseAutoScroll, { passive: true });
    window.addEventListener("touchmove", softPauseAutoScroll, { passive: true });
    window.addEventListener("keydown", softPauseAutoScroll, { passive: true });
  });

  onBeforeUnmount(() => {
    clearAutoScrollTimers();
    if (import.meta.client) {
      window.removeEventListener("scroll", onWindowScroll);
      window.removeEventListener("wheel", softPauseAutoScroll);
      window.removeEventListener("touchmove", softPauseAutoScroll);
      window.removeEventListener("keydown", softPauseAutoScroll);
    }
  });

  return {
    activeType,
    activeItems,
    activeBucket,
    buckets,
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
    toImageURL,
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
  };
}
