<script setup lang="ts">
import { computed, ref } from "vue";
import type { OrientationType } from "~/types/gallery";

const props = defineProps<{
  title: string;
  logoSrc: string;
  favoritesUrl: string;
  adminUploadUrl: string;
  activeType: OrientationType;
  columns: number;
  theme: "light" | "dark";
}>();

const emit = defineEmits<{
  switchType: [type: OrientationType];
  setColumns: [value: number];
  toggleTheme: [];
}>();

const columnsOpen = ref(false);

const options: { label: string; value: OrientationType }[] = [
  { label: "ALL", value: "all" },
  { label: "横图", value: "h" },
  { label: "竖图", value: "v" },
];

const indicatorStyle = computed(() => {
  const index = options.findIndex((item) => item.value === props.activeType);
  const width = 86;
  return {
    transform: `translateX(${Math.max(0, index) * width}px)`,
    width: `${width}px`,
  };
});

function iconTheme() {
  if (props.theme === "dark") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.7A8.5 8.5 0 1 1 11.3 3a6.7 6.7 0 1 0 9.7 9.7z"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.5 12H2.3M21.7 12h-2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/></svg>';
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand">
        <a class="brand-logo-link" :href="favoritesUrl" title="喜欢页">
          <img class="brand-logo" :src="logoSrc" alt="logo" />
        </a>
        <span class="title">{{ title }}</span>
      </div>

      <div class="controls">
        <div class="segmented">
          <span class="seg-indicator" :style="indicatorStyle" />
          <button
            v-for="item in options"
            :key="item.value"
            class="seg-btn"
            :class="{ active: item.value === activeType }"
            type="button"
            @click="emit('switchType', item.value)"
          >
            {{ item.label }}
          </button>
        </div>

        <div class="cols-control" @mouseleave="columnsOpen = false">
          <button class="icon-btn" type="button" aria-label="列数设置" @click="columnsOpen = !columnsOpen">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="7" height="7" />
              <rect x="14" y="4" width="7" height="7" />
              <rect x="3" y="15" width="7" height="7" />
              <rect x="14" y="15" width="7" height="7" />
            </svg>
          </button>

          <div class="cols-panel" :class="{ open: columnsOpen }">
            <div class="cols-row">
              <span>列数</span>
              <span>{{ columns }}</span>
            </div>
            <input
              class="cols-range"
              type="range"
              min="2"
              max="6"
              :value="columns"
              @input="emit('setColumns', Number(($event.target as HTMLInputElement).value))"
            />
            <div class="cols-ticks" aria-hidden="true">
              <span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
            </div>
          </div>
        </div>

        <a class="icon-btn admin-link" :href="adminUploadUrl" target="_blank" rel="noopener noreferrer" aria-label="管理员后台">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.5l7.5 3v6.7c0 4.3-3 7.7-7.5 9.3-4.5-1.6-7.5-5-7.5-9.3V5.5l7.5-3z" />
            <path d="M9.2 12.3l1.8 1.8 3.8-3.8" />
          </svg>
          <span>Admin</span>
        </a>

        <button
          class="icon-btn theme-btn"
          type="button"
          aria-label="切换主题"
          @click="emit('toggleTheme')"
          v-html="iconTheme()"
        />
      </div>
    </div>
  </header>
</template>
