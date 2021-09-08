export type GridsomeSchemaResolver = Record<string, {
  type: string,
  resolve: (parent: unknown, args: unknown, context: { store: GridsomeStore }) => void
}>

export interface GridsomeStoreCollection {
  typeName: string
  addNode: (node: unknown) => void
  data: () => unknown[]
}

export interface GridsomeStore {
  addCollection: (name: string) => GridsomeStoreCollection
  getCollection: (name: string) => GridsomeStoreCollection
  createReference: (typeName: string, id: string) => { id: string, typeName: string }
  addSchemaResolvers: (resolvers: Record<string, GridsomeSchemaResolver>) => void
}

export interface GridsomeAPI {
  loadSource: (store: unknown) => Promise<void>;
}

export interface StrapiContentTypesResponse {
  data: StrapiContentType[]
}

export interface StrapiContentType {
  uid: string
  isDisplayed: boolean
  apiID: string
  kind: 'collectionType' | 'singleType'
  info: {
    name: string
    description: string
    label: string
  }
  attributes: Record<string, StrapiContentTypeAttribute>
}

export interface StrapiContentTypeAttribute {
  type: 'integer' | 'string' | 'text' | 'richtext' | 'uid' | 'relation' | 'media' | 'timestamp'
  required?: boolean
  allowedTypes?: ('files' | 'images' | 'videos')[]
  model: string
  collection: string
  relationType: 'manyToOne' | 'oneToMany' | 'oneToOne' | 'manyToMany'
}

export interface StrapiMedia {
  id: number;
  name: string;
  alternativeText?: string;
  caption?: string;
  width: number;
  height: number;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: string;
  provider: string;
  created_at: string;
  updated_at: string;
}
