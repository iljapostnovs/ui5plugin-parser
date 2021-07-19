//@ts-check

'use strict';

const path = require('path');
const {
  CleanWebpackPlugin
} = require('clean-webpack-plugin');
const NpmDtsPlugin = require('npm-dts-webpack-plugin')

/**@type {import('webpack').Configuration}*/
const config = {
  plugins: [new CleanWebpackPlugin(), new NpmDtsPlugin({
    output: "dist/index.d.ts"
  })],
  target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

  entry: './src/index.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [{
      test: /\.ts$/,
      exclude: /node_modules/,
      use: [{
        loader: 'ts-loader'
      }]
    }]
  }
};
module.exports = config;