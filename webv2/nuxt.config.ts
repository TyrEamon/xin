// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2026-02-21",
  devtools: { enabled: true },
  css: ["@/assets/css/main.css"],
  vite: {
    ssr: {
      noExternal: ["@varlet/ui", "@varlet/icons", "dayjs"],
    },
  },
  nitro: {
    externals: {
      inline: ["@varlet/ui", "@varlet/icons", "dayjs"],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "https://pic.mtcacg.top",
      adminUploadUrl:
        process.env.NUXT_PUBLIC_ADMIN_UPLOAD_URL ||
        "https://pic.mtcacg.top/admin/upload",
      favoritesUrl:
        process.env.NUXT_PUBLIC_FAVORITES_URL ||
        "https://pic.mtcacg.top/favorites.html",
      umamiHost: process.env.NUXT_PUBLIC_UMAMI_HOST || "",
      umamiWebsiteId: process.env.NUXT_PUBLIC_UMAMI_WEBSITE_ID || "",
      galleryTitle: process.env.NUXT_PUBLIC_GALLERY_TITLE || "TyrGallery",
    },
  },
});
