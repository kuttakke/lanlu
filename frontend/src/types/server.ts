export interface ServerInfo {
  archives_per_page: number;
  cache_last_cleared: number;
  debug_mode: boolean;
  has_password: boolean;
  motd: string;
  name: string;
  nofun_mode: boolean;
  server_resizes_images: boolean;
  server_tracks_progress: boolean;
  total_archives: number;
  total_pages_read: number;
  version: string;
  version_desc: string;
  version_name: string;
}