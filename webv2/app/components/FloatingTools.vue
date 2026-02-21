<script setup lang="ts">
defineProps<{
  open: boolean;
  autoEnabled: boolean;
  autoPaused: boolean;
}>();

const emit = defineEmits<{
  toggleOpen: [];
  toggleAuto: [];
  backTop: [];
  randomAll: [];
  randomSmart: [];
}>();
</script>

<template>
  <div class="floating-tools" :class="{ open, 'is-auto': autoEnabled, 'is-paused': autoPaused }">
    <div class="floating-tools-menu">
      <button
        class="floating-tools-action action-auto"
        type="button"
        aria-label="自动滚动"
        @click="emit('toggleAuto')"
      >
        <span class="icon-wrap" v-if="autoEnabled">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 8v8" />
            <path d="M14 8v8" />
          </svg>
        </span>
        <span class="icon-wrap" v-else>
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.4 7.5c-.84-.56-1.9.06-1.9 1.04v6.92c0 .98 1.06 1.6 1.9 1.04l5.2-3.46a1.23 1.23 0 0 0 0-2.08z" fill="currentColor" stroke="none" />
          </svg>
        </span>
      </button>

      <button class="floating-tools-action action-random-all" type="button" aria-label="随机图" @click="emit('randomAll')">
        <span class="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 6h4l2.2 3.2 2.6 4.1L15 17h5" />
            <path d="M17.5 4.5H20v2.5" />
            <path d="M20 4.5l-3.6 3.6" />
            <path d="M4 18h4l2.2-3.2" />
            <path d="M17.5 19.5H20V17" />
            <path d="M20 19.5l-3.6-3.6" />
          </svg>
        </span>
      </button>

      <button class="floating-tools-action action-random-smart" type="button" aria-label="智能随机" @click="emit('randomSmart')">
        <span class="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3.5l1.7 3.9 3.9 1.7-3.9 1.7-1.7 3.9-1.7-3.9-3.9-1.7 3.9-1.7z" />
            <path d="M18.6 14.4l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8z" />
          </svg>
        </span>
      </button>

      <button class="floating-tools-action action-top" type="button" aria-label="回顶" @click="emit('backTop')">
        <span class="icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6.8 13.6L12 8.5l5.2 5.1" />
            <path d="M6.8 18.2L12 13l5.2 5.2" />
          </svg>
        </span>
      </button>
    </div>

    <button class="floating-tools-trigger" type="button" :aria-expanded="open ? 'true' : 'false'" @click="emit('toggleOpen')">
      <span class="icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </span>
    </button>
  </div>
</template>
