# @travisreynolds/gridsome-source-strapi

> Forked [Strapi](https://strapi.io/) source plugin for Gridsome, with image downloading

## Install

- `yarn add @travisreynolds/gridsome-source-strapi`
- `npm install @travisreynolds/gridsome-source-strapi`

## Usage

```js
export default {
  plugins: [
    {
      use: '@travisreynolds/gridsome-source-strapi',
      options: {
        apiURL: 'http://localhost:1337',
        queryLimit: 1000, // Defaults to 100
        contentTypes: ['article', 'author'],
        singleTypes: ['impressum'],
        // Possibility to login with a Strapi user,
        // when content types are not publicly available (optional).
        loginData: {
          identifier: '',
          password: ''
        },
        images: { // Optional
          paths: ['article.image', 'article.writer.picture', 'author.picture'], // Required
          dir: './src/assets/strapi', // Optional, default
          key: 'downloaded', // Optional, default
          cache: true // Optional, default
        }
      }
    }
  ]
}
```

## Image Download

This plugin supports image downloading, to allow you to use `g-image` - this also means you can host Strapi locally, with no need to host it online or use an image CDN for media access.
To enable it, simply add an `images` key with an array of paths to images in your types. For example, if you have a `post` type, with a field called `image`, then you would specify the path as `post.image`. You can also add nested paths (using the [Lodash `get`](https://lodash.com/docs/4.17.15#get) syntax) - for example `post.author.picture`.

There are some additional options if you need, to specify where the images should be downloaded to (this path can be added to `.gitignore`), as well as the GraphQL field the downloaded image is accessible under, and whether to cache images, or redownload them every time.

| Name | Type | Description |
|------|------|-------------|---|---|
| `paths` | `String[]` | An array of image paths. |
| `dir` | `String` | A relative path to where images should be downloaded to. |
| `key` | `String` | What the field that contains the downloaded image should be called. |
| `cache` | `Boolean` | Whether to cache images, or re-download each time. |
