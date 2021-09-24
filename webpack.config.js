const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

let devMode = process.env.NODE_ENV === 'development';

let config = {
  entry: {
    index: './src/index',
  },
  output: {
    path: __dirname + '/bundle/dist',
    filename: '[name].js',
  },
  devServer: {
    contentBase: './bundle/dist',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: "css-loader",
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  [
                    'postcss-preset-env',
                  ],
                ],
              },
            },
          },
          {
            loader: "less-loader",
          },
        ],
      },
      {
        test: /(\.jpg)|(\.jpeg)|(\.gif)|(\.png)|(\.ico)|(\.webp)$/,
        use: 'file-loader?name=[hash].[ext]',
      },
      {
        test: /\.html?$/,
        use: 'file-loader?name=[name].[ext]',
      },
    ],
  },
  devtool: 'cheap-module-source-map',
  plugins: [
    new MiniCssExtractPlugin(),
  ],
  optimization: {
  },
};

if(!devMode) {
  config.optimization.minimizer = [
    new CssMinimizerPlugin(),
  ];
}

module.exports = config;
