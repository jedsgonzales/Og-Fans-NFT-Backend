const path = require('path');
const nodeExternals = require('webpack-node-externals');

/**
 * note: this webpack config is generating ogfans lib
 */

module.exports = {
  entry: ["./src/index.ts"],

  devtool: 'inline-source-map',

  target: 'node',

  externals: [nodeExternals()],

  optimization: {
    nodeEnv: false
  },
  
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: '[name].js',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    library: 'OGFansLib',
  },

  module: {
    rules: [
      {
        test: /\.(png|jpg|gif|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {}
          }
        ]
      },
      /* {
        test: /\.js$|\.es6|\.jsx$/,
        loader: 'babel-loader'
      }, */
      { 
        test: /\.tsx?$|\.js$|\.es6|\.jsx$/, 
        loader: "ts-loader",
        include: [
          path.resolve(__dirname, 'src/')
        ],
        options: {
          logLevel: 'error'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.es6', '.js', '.jsx', '.ts', '.tsx'],
    modules: ['node_modules']
  }
};
