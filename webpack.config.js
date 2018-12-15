const CleanWebpackPlugin = require("clean-webpack-plugin");
const JavaScriptObfuscator = require("webpack-obfuscator");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const Dotenv = require("dotenv-webpack");
const TerserPlugin = require("terser-webpack-plugin");

const pathsToClean = ["dist"];

module.exports = {
  entry: ["babel-polyfill", "./src/index.js"],
  target: "node",
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ["babel-loader"]
      }
    ]
  },
  resolve: {
    extensions: ["*", ".js"]
  },
  output: {
    path: __dirname + "/dist",
    publicPath: "/",
    filename: "CamAgent.js"
  },
  optimization: {
    minimizer: [new TerserPlugin()]
  },
  plugins: [
    new Dotenv(),
    // new CleanWebpackPlugin(pathsToClean),
    new CopyWebpackPlugin([
      { from: "./src/ssl", to: "./ssl" },
      { from: "./src/config.prod.json", to: "./config.json" },
    ]),
    new JavaScriptObfuscator()
  ]
};
