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
