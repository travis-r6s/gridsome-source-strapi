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
