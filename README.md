# @travisreynolds/gridsome-source-strapi

> Forked [Strapi](https://strapi.io/) source plugin for Gridsome, with image downloading

## Install

- `yarn add @travisreynolds/gridsome-source-strapi`
- `npm install @travisreynolds/gridsome-source-strapi`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@travisreynolds/gridsome-source-strapi',
      options: {
        apiURL: 'http://localhost:1337',
        prefix: 'Strapi' // Default is 'Strapi'
        debug: true // Adds verbose logs
        images: true // Use all defaults
        images: { // OR
          dir: './src/assets/strapi', // Optional, default
          key: 'downloaded', // Optional, default
          cache: true // Optional, default
        }
      }
    }
  ]
}
```

## Strapi Permissions

You will need to enable a couple of Strapi permissions to enable this plugin to work correctly. To do this, login to your Strapi instance, and navigate to the **Settings** page. Select the **Roles** page under _Users & Permissions Plugin_, and click on the **Public** role.
Scroll down to _Permissions_, and look for the _Content Manager_ section - click to open if necessary, and check the **findcomponents** option (under _Components_) and the **findcontenttypes** option (under _Content-Types_). Finally, click the **Save** button to save your changes.

## Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `apiURL` | `String` | `` | Required - the URL to your Strapi instance. |
| `prefix` | `String` | `Strapi` | All types that this plugin will create will be prefixed with this. |
| `debug` | `Boolean` | `false` | Enabled verbose logging - for example what types are being downloaded. |
| `limit` | `Number` | `100` | How many items should be fetched in one API call. |
| `concurrency` | `Number` | `10` | How many content types should be fetched at once. |

## Image Downloads

This plugin supports image downloading, to allow you to use `g-image` - this also means you can host Strapi locally, with no need to host it online or use an image CDN for media access.

To enable this functionality, simply add an `images` config option with either a boolean `true` to use all defaults, or an object to use custom options.

There are some additional options if you need, to specify where the images should be downloaded to (this path can be added to `.gitignore`), as well as the GraphQL field the downloaded image is accessible under, and whether to cache images or re-download them every time.

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `dir` | `String` | `./src/assets/strapi` | A relative path to where images should be downloaded to. |
| `key` | `String` | `downloaded` | What the field that contains the downloaded image should be called. |
| `cache` | `Boolean` | `true` | Whether to cache images, or re-download each time. |
| `concurrency` | `Number` | `10` | How many images should be downloaded at once. |

## Dynamic Zones

This plugin also supports Strapi's Dynamic Zones feature - it will turn the field into a [Union type](https://graphql.org/learn/schema/#union-types), to allow you to use GraphQL to query the available components inside the dynamic zone. You can use the [GraphQL explorer](http://localhost:8080/___explorer) to check what types you can query.

For example, if there is a `Page` type in Strapi, which has a Dynamic Zone under the key `content` with two components `Hero` and `FeaturedPost`:

`StrapiPage.vue`

```vue
<template>
  <Layout>
    <h1>{{ page.title }}</h1>
    <br />
    <component
      v-for="(component, i) in page.content"
      :key="i"
      :is="findComponent(component.__typename)"
      v-bind="component" />
  </Layout>
</template>

<script>
// Blocks
import HeroBlock from '@/components/blocks/HeroBlock.vue'
import FeaturedPostBlock from '@/components/blocks/FeaturedPostBlock.vue'

const componentsMap = new Map([
  ['StrapiSectionsHero', HeroBlock],
  ['StrapiSectionsFeaturedPost', FeaturedPostBlock]
])

export default {
  name: 'Page',
  computed: {
    page () { return this.$page.strapiPage }
  },
  methods: {
    getComponent (key) {
      return componentsMap.get(key)
    }
  }
}
</script>

<page-query>
query Page ($id: ID!) {
  strapiPage (id: $id) {
    id
    title
    content {
      __typename

      ... on StrapiSectionsHero {
        id
        title
        subtitle
        backgroundImage {
          alt
          downloaded
        }
      }

      ... on StrapiSectionsFeaturedPost {
        id
        title
        path
        featuredImage {
          alt
          downloaded
        }
      }
    }
  }
}
</page-query>
```

`FeaturedPost.vue`
```vue
<template>
  <g-link :to="path">
    <h3>{{ title }}</h3>
    <g-image v-if="featuredImage" :src="featuredImage.downloaded" :alt="featuredImage.alt" />
  </g-link>
</template>

<script>
export default {
  name: 'FeaturedPost',
  props: {
    title: {
      type: String,
      default: ''
    },
    path: {
      type: String,
      default: ''
    },
    featuredImage: {
      type: Object,
      default: () => null
    }
  }
}
</script>

```
