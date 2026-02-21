export type OrientationType = "all" | "h" | "v";

export interface GalleryItem {
  id: string;
  preview_id: string;
  origin_id: string;
  title: string;
  artist_name: string;
  artist_id: string;
  source_url: string;
  source: string;
  tags: string;
  created_at: number;
  width: number;
  height: number;
}

export interface GalleryBucket {
  items: GalleryItem[];
  offset: number;
  loading: boolean;
  done: boolean;
}
