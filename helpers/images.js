
const fs = require('fs-extra')
const path = require('path')
const stream = require('stream')
const { default: got } = require('got')
const { get, set } = require('lodash')
const { promisify } = require('util')

const pipeline = promisify(stream.pipeline)

module.exports = ({ apiURL, images, imageCollection }) => async (doc, resourceName) => {
  const imagePaths = images.paths.filter(path => path.includes(resourceName)).map(path => path.replace(`${resourceName}.`, ''))

  await Promise.all(imagePaths.map(async imagePath => {
    const image = get(doc, imagePath)
    if (!image) return

    const imageUrl = `${apiURL}${image.url}`
    const filePath = path.resolve(images.dir, image.name)

    let imageNode = imageCollection.getNodeById(image.id)
    if (!imageNode) {
      imageNode = imageCollection.addNode({
        ...image,
        [ images.key ]: filePath
      })
    }

    set(doc, imagePath, imageNode)

    const fileExists = await fs.pathExists(filePath)
    if (fileExists && images.cache) return

    await pipeline(
      got.stream(imageUrl),
      fs.createWriteStream(filePath)
    )
  }))

  return doc
}
