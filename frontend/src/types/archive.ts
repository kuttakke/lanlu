export interface Archive {
  arcid: string;
  title: string;
  filename: string;
  summary: string;
  tags: string;
  pagecount: number;
  progress: number;
  isnew: string;
  extension: string;
  lastreadtime: number;
  size: number;
}

export interface SearchResponse {
  data: Archive[];
  draw: number;
  recordsFiltered: number;
  recordsTotal: number;
}

export interface SearchParams {
  filter?: string;
  category?: string;
  start?: number;
  count?: number;
  sortby?: string;
  order?: string;
}

export interface RandomParams {
  filter?: string;
  category?: string;
  count?: number;
  newonly?: boolean;
  untaggedonly?: boolean;
}

export interface ArchiveMetadata {
  arcid: string;
  isnew: string;
  pagecount: number;
  progress: number;
  tags: string;
  lastreadtime: number;
  title: string;
}