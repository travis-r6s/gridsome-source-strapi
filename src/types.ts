export type GridsomeSchemaResolver = Record<string, {
  type: string,
  resolve: (parent: unknown, args: unknown, context: { store: GridsomeStore }) => void
}>

export interface GridsomeStoreCollectionNode extends Record<string, unknown> {
  id: string
  internal: Record<string, string>
}

export interface GridsomeStoreCollection {
  typeName: string
  addNode: (node: unknown) => GridsomeStoreCollectionNode
  data: () => unknown[]
}

export interface GridsomeSchemaFactoryMethods {
  createUnionType: (config: {
    name: string
    types: string[]
    resolveType: (value: Record<string, string>) => string | undefined
  }) => { name: string }
  createObjectType: (config: {
    name: string
    fields: Record<string, string>
    extensions?: Record<string, boolean>,
    interfaces?: string[]
    resolve?: (value: Record<string, string>) => string | undefined
  }) => { name: string }
}

export interface GridsomeStore {
  addCollection: (name: string) => GridsomeStoreCollection
  getCollection: (name: string) => GridsomeStoreCollection
  createReference: (typeName: string, id: string) => { id: string, typeName: string }
  addSchemaResolvers: (resolvers: Record<string, GridsomeSchemaResolver>) => void
  addSchemaTypes: (types: unknown[] | string) => void
  schema: GridsomeSchemaFactoryMethods
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
  type: 'integer' | 'string' | 'text' | 'richtext' | 'uid' | 'relation' | 'media' | 'timestamp' | 'dynamiczone' | 'component'
  required?: boolean
  allowedTypes?: ('files' | 'images' | 'videos')[]
  model: string
  collection: string
  relationType: 'manyToOne' | 'oneToMany' | 'oneToOne' | 'manyToMany'
  component: string
  components: string[]
  repeatable: boolean
  multiple: boolean
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
