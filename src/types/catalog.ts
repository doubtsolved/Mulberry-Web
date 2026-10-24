export interface Mirror {
  provider: string;
  repo?: string;
  url: string;
  isEncrypted: boolean;
  format?: string;
}

export interface BookDownload {
  mirrors: Mirror[];
  telegram?: {
    deepLink: string;
  };
}

export interface BookItem {
  id: string;
  title: string;
  author: string;
  edition?: string;
  prof?: string;
  year?: string;
  subject?: string;
  type: string;
  tags?: string[];
  totalPages?: number;
  sizeMb?: number;
  coverUrl?: string;
  download?: BookDownload;
  uploader?: string;
}

export interface CatalogData {
  version: number;
  lastUpdated: number;
  filters: {
    profs: string[];
    types: string[];
    subjects: string[];
  };
  books: BookItem[];
}

export interface DownloadedBookMeta {
  id: string;
  title: string;
  author: string;
  type: string;
  sizeMb: number;
  totalPages: number;
  coverUrl: string;
  filename: string;
  downloadedAt: number;
  lastReadPage: number;
}

export interface DownloadedBooksStore {
  version: number;
  lastSync: number;
  folderName: string;
  books: DownloadedBookMeta[];
}

export interface UserProfile {
  academicRole: string;
  dailyUploadLimit: number;
  displayName: string;
  institution: string;
  lastUpdated: number;
  selectedProf: string;
  vipBadgeLabel: string;
  vipCode: string;
  vipTier: string;
}

export type ActiveTab = 'library' | 'desk' | 'settings';
