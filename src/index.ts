import got, { Response } from 'got'
import consola from 'consola'
import pMap from 'p-map'
import pluralize from 'pluralize'
import { camelCase, pascalCase } from 'change-case'
import ImageDownloader from './images'

// Types
import { StrapiContentTypesResponse, StrapiMedia } from './types'

const log = consola.withTag('gridsome-source-strapi')

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

export interface SourceConfig {
  apiURL?: string;
  concurrency?: number;
  limit?: number;
  debug?: boolean;
  prefix?: string
  images: {
    concurrency?: number
    dir?: string
    cache?: boolean
    key?: string
  } | false
}

function StrapiSource (api: GridsomeAPI, config: SourceConfig): void {
  const { apiURL, concurrency = 5, limit = 100, debug = false, prefix = 'Strapi', images = false } = config

  if (!apiURL) throw new Error('Missing gridsome-source-strapi config option `apiURL`.')
  if (!prefix.trim()) throw new Error('Missing gridsome-source-strapi config option `prefix`.')

  const strapi = got.extend({
    prefixUrl: config.apiURL,
    resolveBodyOnly: true,
    responseType: 'json'
  })

  api.loadSource(async (store: GridsomeStore) => {
    const { data } = await strapi.get<StrapiContentTypesResponse>('content-manager/content-types', {
      responseType: 'json',
      resolveBodyOnly: true
    })

    const imageCollection = store.addCollection(`${prefix}Image`)
    const imageDownloader = ImageDownloader({ apiURL, collection: imageCollection, images })

    const contentTypes = data.filter(type => type.isDisplayed && type.uid.includes('application'))
    if (!contentTypes) { return log.warn('No displayed content types found in Strapi.') }

    const allContentData = await pMap(contentTypes, async type => {
      const endpoint = type.kind === 'collectionType' ? pluralize(type.apiID) : type.apiID

      try {
        if (type.kind === 'singleType') {
          if (debug) log.info(`Fetching ${type.apiID} singleton entry (/${endpoint})`)

          const entry = await strapi.get<Record<string, unknown>>(endpoint, { resolveBodyOnly: true, responseType: 'json' })
          return [{ type, entries: [entry] }]
        }

        if (debug) log.info(`Fetching ${type.apiID} entries (/${endpoint})`)
        const entries = await strapi.paginate.all<Record<string, unknown>>(endpoint, {
          resolveBodyOnly: true,
          responseType: 'json',
          searchParams: { _limit: limit },
          pagination: {
            paginate: (_response, allItems, currentItems) => {
              if (currentItems.length < limit) return false
              return { searchParams: { _limit: limit, _start: allItems.length } }
            }
          }
        })

        log.info(`Fetched ${entries.length} entries of the ${type.apiID} type`)

        return [{ type, entries }]
      } catch (err) {
        const error = err as Error & { response: Response }
        log.error(`Failed to fetch ${type.apiID} content type - ${error.response.statusCode}`)

        return []
      }
    }, { concurrency })

    for await (const content of allContentData.flat()) {
      const typeName = `${prefix}${pascalCase(content.type.apiID)}`
      const collection = store.addCollection(typeName)

      const imageFields = Object.entries(content.type.attributes)
        .filter(([_, attribute]) => attribute.type === 'media' && attribute.allowedTypes?.includes('images'))
        .map(([key]) => key)

      for await (const entry of content.entries) {
        const imagesToDownload: (StrapiMedia & { key: string })[] = imageFields.map(key => {
          const image = Reflect.get(entry, key)
          return { key, ...image }
        })
        if (images && imagesToDownload.length) {
          imageDownloader(imagesToDownload)
          for (const image of imagesToDownload) {
            const nodeRef = store.createReference(imageCollection.typeName, image.id.toString())
            Reflect.set(entry, image.key, nodeRef)
          }
        }

        collection.addNode(entry)
      }

      if (content.type.kind === 'singleType') {
        store.addSchemaResolvers({
          Query: {
            [ camelCase(typeName) ]: {
              type: typeName,
              resolve: (_parent, _args, context) => {
                const collection = context.store.getCollection(typeName)
                const [firstNode] = collection.data()
                return firstNode
              }
            }
          }
        })
      }
    }
  })
}

module.exports = StrapiSource
