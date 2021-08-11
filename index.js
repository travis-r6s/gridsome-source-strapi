const axios = require('axios')
const fs = require('fs-extra')
const path = require('path')
const { trimEnd, upperFirst, camelCase } = require('lodash')

const query = require('./helpers/query')
const ImageDownloader = require('./helpers/images')

module.exports = function (api, options) {
  api.loadSource(async ({ addCollection }) => {
    const { queryLimit, contentTypes, singleTypes, loginData } = options
    const apiURL = trimEnd(options.apiURL, '/')
    let jwtToken = null

    console.log(`Fetching data from Strapi (${apiURL})`)

    // Check if loginData is set.
    if (loginData.identifier && loginData.password) {
      // Define API endpoint.
      const loginEndpoint = `${apiURL}/auth/local`

      // Make API request.
      try {
        const loginResponse = await axios.post(loginEndpoint, loginData)

        if (loginResponse.data) {
          jwtToken = loginResponse.data.jwt
        }
      } catch (e) {
        console.error('Strapi authentication error: ' + e)
      }
    }

    let images = { paths: [], dir: './src/assets/strapi', cache: true, key: 'downloaded' }

    if (options.images) {
      if (typeof options.images !== 'object') throw new Error('The images configuration option should either be an array of paths, or an object with a paths key specified.')

      if (Array.isArray(options.images)) images.paths = options.images
      else if (!options.images.paths || !Array.isArray(options.images.paths)) throw new Error('The images.paths field should exist, and be an array of strings.')
      else images = { ...images, ...options.images }

      const dirPath = path.resolve(images.dir)
      await fs.ensureDir(dirPath)
    }

    const imageCollection = addCollection('StrapiImage')
    const downloadImages = ImageDownloader({ apiURL, images, imageCollection })

    const fetchContentTypes = contentTypes.map(resourceName => {
      const typeName = upperFirst(camelCase(`${options.typeName} ${resourceName}`))
      const collection = addCollection({ typeName, dateField: 'created_at' })
      return query({ apiURL, resourceName, jwtToken, queryLimit, isSingleType: false })
        .then(async docs => {
          await Promise.all(docs.map(async doc => {
            const updatedDoc = await downloadImages(doc, resourceName)
            collection.addNode(updatedDoc)
          }))
        })
    })

    const fetchSingleTypes = singleTypes.map(resourceName => {
      const typeName = upperFirst(camelCase(`${options.typeName} ${resourceName}`))
      const collection = addCollection({ typeName, dateField: 'created_at' })
      return query({ apiURL, resourceName, jwtToken, queryLimit, isSingleType: true })
        .then(async doc => {
          const updatedDoc = await downloadImages(doc, resourceName)
          collection.addNode(updatedDoc)
        })
    })

    return Promise.all([
      Promise.all(fetchContentTypes),
      Promise.all(fetchSingleTypes)
    ])
  })
}

module.exports.defaultOptions = () => ({
  apiURL: 'http://localhost:1337',
  contentTypes: [],
  singleTypes: [],
  loginData: {},
  queryLimit: 100,
  typeName: 'Strapi'
})
