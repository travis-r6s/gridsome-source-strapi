import got, { Response } from 'got'
import consola from 'consola'
import pMap from 'p-map'
import pluralize from 'pluralize'
import { camelCase, pascalCase } from 'change-case'

// Types
import { StrapiContentTypesResponse } from './types'

const log = consola.withTag('gridsome-source-strapi')

type GridsomeSchemaResolver = Record<string, {
  type: string,
  resolve: (parent: unknown, args: unknown, context: { store: GridsomeStore }) => void
}>

interface GridsomeStoreCollection {
  addNode: (node: unknown) => void
  data: () => unknown[]
}

interface GridsomeStore {
  addCollection: (name: string) => GridsomeStoreCollection
  getCollection: (name: string) => GridsomeStoreCollection
  addSchemaResolvers: (resolvers: Record<string, GridsomeSchemaResolver>) => void
}

interface GridsomeAPI {
  loadSource: (store: unknown) => Promise<void>;
}

interface SourceConfig {
  apiURL?: string;
  concurrency?: number;
  limit?: number;
  debug?: boolean;
  prefix?: string
}

function StrapiSource (api: GridsomeAPI, config: SourceConfig): void {
  if (!config.apiURL) throw new Error('Missing gridsome-source-strapi config option `apiURL`.')

  const { concurrency = 5, limit = 100, debug = false, prefix = 'Strapi' } = config

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

    const contentTypes = data.filter(type => type.isDisplayed && type.uid.includes('application'))
    if (!contentTypes) { return log.warn('No displayed content types found in Strapi.') }

    const allContentData = await pMap(contentTypes, async type => {
      const endpoint = type.kind === 'collectionType' ? pluralize(type.apiID) : type.apiID

      try {
        if (type.kind === 'singleType') {
          if (debug) log.info(`Fetching ${type.apiID} singleton entry (/${endpoint})`)

          const entry = await strapi.get(endpoint, { resolveBodyOnly: true, responseType: 'json' })
          return [{ type, entries: [entry] }]
        }

        if (debug) log.info(`Fetching ${type.apiID} entries (/${endpoint})`)
        const entries = await strapi.paginate.all(endpoint, {
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

    for (const content of allContentData.flat()) {
      const typeName = `${prefix}${pascalCase(content.type.apiID)}`
      const collection = store.addCollection(typeName)

      for (const entry of content.entries) {
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
