<script setup lang="ts">
import type { GalleryItem } from "~/types/gallery";

defineProps<{
  item: GalleryItem;
  previewUrl: string;
  sourceUrl: string;
  artistUrl: string;
  ratioPadding: string;
  title: string;
}>();

const emit = defineEmits<{
  open: [];
}>();
</script>

<template>
  <article class="grid-item" @click="emit('open')">
    <div class="ratio-box" :style="{ paddingBottom: ratioPadding }">
      <img class="card-image" :src="previewUrl" :alt="title" loading="lazy" decoding="async" />
    </div>

    <div class="card-overlay">
      <div>
        <div class="card-title">{{ title }}</div>
        <a
          v-if="artistUrl"
          class="card-artist"
          :href="artistUrl"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
        >
          {{ item.artist_name || "Arts" }}
        </a>
        <div v-else class="card-artist">{{ item.artist_name || "Arts" }}</div>
      </div>

      <div class="card-actions">
        <a
          v-if="sourceUrl"
          class="action-link"
          :href="sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="原链接"
          @click.stop
        >
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13.9L8.6 15.3a3.4 3.4 0 1 1-4.8-4.8l3-3a3.4 3.4 0 0 1 4.8 0" />
            <path d="M14 10.1l1.4-1.4a3.4 3.4 0 0 1 4.8 4.8l-3 3a3.4 3.4 0 0 1-4.8 0" />
            <path d="M8.8 15.2l6.4-6.4" />
          </svg>
        </a>
        <a
          class="action-link"
          :href="previewUrl"
          download
          aria-label="下载图片"
          @click.stop
        >
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 4.3v10.7" />
            <path d="M7.7 11.6L12 16l4.3-4.4" />
            <path d="M5 18.7h14" />
          </svg>
        </a>
      </div>
    </div>
  </article>
</template>
