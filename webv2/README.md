# xin webv2 (Nuxt 4 + Varlet)

`webv2` is a standalone Vue/Nuxt frontend for the xin gallery stack.
It does **not** modify the existing `web` folder.

## Features in this version

- Top bar with ALL / 横图 / 竖图 filters
- Infinite loading from `/api/posts`
- Masonry-like multi-column cards
- Theme switch (light/dark) with local storage persistence
- Viewer open on card click (Varlet `ImagePreview`)
- Floating quick tools:
  - auto scroll
  - random image
  - smart random (based on screen orientation)
  - back to top

## Runtime env (public)

Use `.env` (or platform env vars):

```bash
NUXT_PUBLIC_API_BASE=https://pic.mtcacg.top
NUXT_PUBLIC_ADMIN_UPLOAD_URL=https://pic.mtcacg.top/admin/upload
NUXT_PUBLIC_FAVORITES_URL=https://pic.mtcacg.top/favorites.html
NUXT_PUBLIC_UMAMI_HOST=https://umamii.zeabur.app
NUXT_PUBLIC_UMAMI_WEBSITE_ID=943c1a9a-d9f8-4d67-9cee-ac1448f53703
NUXT_PUBLIC_GALLERY_TITLE=TyrGallery
```

## Local preview

Install:

```bash
pnpm install
```

Dev server (custom host/port):

```bash
pnpm dev -- --host 0.0.0.0 --port 4321
```

Open:
- `http://localhost:4321/gallery`
- `http://localhost:4321/gallery.html`

## Build

```bash
pnpm build
pnpm preview
```

Static export (for Pages-like hosting):

```bash
pnpm generate
```

Generated static files: `.output/public`
