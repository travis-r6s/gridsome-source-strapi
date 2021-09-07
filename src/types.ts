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
}
