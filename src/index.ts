import consola from 'consola'
import got, { Response } from 'got'
import pMap from 'p-map'
import pluralize from 'pluralize'
import { camelCase, pascalCase } from 'change-case'

// Helpers
import ImageDownloader from './images'

// Types
import { GridsomeAPI, GridsomeStore, StrapiContentTypesResponse, StrapiContentType } from './types'

const log = consola.withTag('gridsome-source-strapi')

export interface SourceConfig {
  apiURL?: string
  concurrency?: number
  limit?: number
  debug?: boolean
  prefix?: string
  components: boolean
  images: {
    concurrency?: number
    dir?: string
    cache?: boolean
    key?: string
  } | false
}

function StrapiSource (api: GridsomeAPI, config: SourceConfig): void {
  const { apiURL, concurrency = 5, limit = 100, debug = false, prefix = 'Strapi', images = false, components = false } = config

  if (!apiURL) throw new Error('Missing gridsome-source-strapi config option `apiURL`.')
  if (!prefix.trim()) throw new Error('Missing gridsome-source-strapi config option `prefix`.')

  const strapi = got.extend({
    prefixUrl: config.apiURL,
    resolveBodyOnly: true,
    responseType: 'json'
  })

  const createTypeName = (type: string) => `${prefix}${pascalCase(type)}`

  api.loadSource(async (store: GridsomeStore) => {
    let contentTypes: StrapiContentType[] = []
    let componentTypes: StrapiContentType[] = []

    try {
      const { data } = await strapi.get<StrapiContentTypesResponse>('content-manager/content-types', {
        responseType: 'json',
        resolveBodyOnly: true
      })
      contentTypes = data
    } catch (error) {
      log.error(`Could not fetch content types - ensure you have enabled the 'findcontenttypes' read permission under the 'Content Manager' section for the Public user in the Strapi admin: ${apiURL}/admin/settings/users-permissions/roles/`)
      throw new Error('Missing permissions.')
    }

    if (components) {
      try {
        const { data } = await strapi.get<StrapiContentTypesResponse>('content-manager/components', {
          responseType: 'json',
          resolveBodyOnly: true
        })
        componentTypes = data
      } catch (error) {
        log.error(`Could not fetch component types - ensure you have enabled the 'findcomponents' read permissions under the 'Content Manager' section for the Public user in the Strapi admin: ${apiURL}/admin/settings/users-permissions/roles/`)
      }
    }

    const imageCollection = store.addCollection(`${prefix}Image`)
    const imageDownloader = ImageDownloader({ apiURL, collection: imageCollection, images })

    const filteredContentTypes = contentTypes.filter(type => type.isDisplayed && type.uid.includes('application'))
    if (!filteredContentTypes) { return log.warn('No displayed content types found in Strapi.') }

    const allContentData = await pMap(filteredContentTypes, async type => {
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

    await pMap(allContentData.flat(), async content => {
      const typeName = createTypeName(content.type.apiID)
      const collection = store.addCollection(typeName)

      if (debug) log.info(`Adding ${typeName} to store...`)

      const imageFields = Object.entries(content.type.attributes)
        .filter(([_, attribute]) => attribute.type === 'media' && attribute.allowedTypes?.includes('images'))
        .map(([key]) => key)

      const relationFields = Object.entries(content.type.attributes)
        .filter(([_, attribute]) => attribute.type === 'relation')

      const dynamicFields = Object.entries(content.type.attributes)
        .filter(([_, attribute]) => attribute.type === 'dynamiczone')

      await pMap(content.entries, async entry => {
        const imagesToDownload = imageFields.map(key => {
          const image = Reflect.get(entry, key)
          return { key, ...image }
        })

        if (images && imagesToDownload.length) {
          imageDownloader.download(imagesToDownload)

          for (const image of imagesToDownload) {
            const nodeRef = store.createReference(imageCollection.typeName, image.id.toString())
            Reflect.set(entry, image.key, nodeRef)
          }
        }

        const relations = relationFields.flatMap(([key, attribute]) => {
          const typeName = createTypeName(attribute.model || attribute.collection)

          const relation = Reflect.get(entry, key)
          if (!relation || (Array.isArray(relation) && !relation.length)) return []

          if (attribute.relationType === 'oneToOne' || attribute.relationType === 'manyToOne') {
            return [[key, store.createReference(typeName, relation.id.toString())]]
          }

          if (attribute.relationType === 'oneToMany' || attribute.relationType === 'manyToMany') {
            const relations = relation.map((item: { id: string }) => store.createReference(typeName, item.id.toString()))
            return [[key, relations]]
          }

          if (debug) log.warn(`Found no relation handler for ${key} on ${typeName} (${attribute.relationType})`)

          return []
        })

        const dynamics = dynamicFields.map(([key]) => {
          const components: Record<string, string>[] = Reflect.get(entry, key) || []

          const componentNodes = components.flatMap(component => {
            const componentType = componentTypes.find(type => type.uid === component.__component)
            if (!componentType) return []

            const collection = store.addCollection(createTypeName(component.__component))

            if (debug) log.info(`Adding ${typeName} to store...`)

            const imageFields = Object.entries(componentType.attributes)
              .filter(([_, attribute]) => attribute.type === 'media' && attribute.allowedTypes?.includes('images'))
              .map(([key]) => key)

            const relationFields = Object.entries(componentType.attributes)
              .filter(([_, attribute]) => attribute.type === 'relation')

            const dynamicFields = Object.entries(componentType.attributes)
              .filter(([_, attribute]) => attribute.type === 'dynamiczone')

            console.log('images', imageFields)
            console.log('relation', relationFields)
            console.log('dynamic', dynamicFields)

            const node = collection.addNode({ ...component, component: component.__component })
            return [node]
          })

          return [key, componentNodes]
        })

        collection.addNode({
          ...entry,
          ...Object.fromEntries(relations),
          ...Object.fromEntries(dynamics)
        })
      })

      if (dynamicFields.length) {
        const unionTypes = dynamicFields.map(([key, attribute]) => {
          const types: [string, string][] = attribute.components.map(name => [name, createTypeName(name)])
          const typesMap = new Map<string, string>(types)

          const typeName = createTypeName(`${content.type.apiID}${key}`)

          const unionType = store.schema.createUnionType({
            name: typeName,
            types: types.map(([_name, typeName]) => typeName),
            resolveType: value => typesMap.get(value.__component)
          })

          const resolver = [key, {
            type: `[${typeName}]`,
            resolve: (parent: Record<string, string>) => Reflect.get(parent, key)
          }]

          return { key, resolver, unionType }
        })

        store.addSchemaTypes(unionTypes.map(({ unionType }) => unionType))
        store.addSchemaResolvers({
          [ typeName ]: Object.fromEntries(unionTypes.map(({ resolver }) => resolver))
        })
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
    })
  })
}

module.exports = StrapiSource
