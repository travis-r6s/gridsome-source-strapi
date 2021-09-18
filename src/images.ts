
import fs from 'fs-extra'
import path from 'path'
import stream from 'stream'
import got from 'got'
import { promisify } from 'util'
import PQueue from 'p-queue'
import pMap from 'p-map'

// Types
import { StrapiMedia, GridsomeStoreCollection } from './types'
import { SourceConfig } from '.'

const pipeline = promisify(stream.pipeline)

interface Options {
  apiURL: string
  collection: GridsomeStoreCollection
  images: SourceConfig['images']
}

interface ImageDownloader {
  download: (images: { key: string, image: StrapiMedia | StrapiMedia[] }[]) => Promise<void[]>
}

function ImageDownloader ({ apiURL, images, collection }: Options): ImageDownloader {
  const { dir = './src/assets/strapi', cache = true, key = 'downloaded', concurrency = 20 } = images || {}

  const queue = new PQueue({ concurrency })

  if (images) fs.ensureDirSync(dir)

  return {
    download: async images => {
      const flattenedImages = images.flatMap(({ image }) => image)

      return pMap(flattenedImages, async image => {
        const imageUrl = `${apiURL}${image.url}`
        const filePath = path.resolve(dir, image.name)

        const nodeExists = collection.getNodeById(image.id.toString())
        if (!nodeExists) {
          collection.addNode({
            ...image,
            [ key ]: filePath
          })
        }

        const fileExists = await fs.pathExists(filePath)
        if (fileExists && cache) return

        await queue.add(() => pipeline(
          got.stream(imageUrl),
          fs.createWriteStream(filePath)
        ))
      }, { concurrency })
    }
  }
}

export default ImageDownloader
