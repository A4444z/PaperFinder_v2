export interface Web {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web: Web;
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}

export interface Reference {
  title: string;
  authors: string[];
  publicationDate: string;
  uri: string;
  abstract?: string;
}

export interface SearchResult {
  summary: string;
  references: Reference[];
}