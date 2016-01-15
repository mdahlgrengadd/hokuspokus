const path =  require('path');
const webpack =  require('webpack');

module.exports = {
  devtool: 'eval',

  entry: [
    'webpack-dev-server/client?http://localhost:8080',
    'webpack/hot/only-dev-server',
    './index.jsx'
  ],

  output: {
    path: path.join(__dirname, 'build'),
    filename: 'bundle.js',
    publicPath: '/'
  },

  plugins: [
    new webpack.HotModuleReplacementPlugin()
    //new webpack.NoErrorsPlugin()
  ],

  resolve: {
    modulesDirectories: ['node_modules', './'],
    extensions: ['', '.js', '.jsx'],
   // alias: {
   //   wavesurfer: 'wavesurfer.js/dist/wavesurfer.cjs'
   // }
  },

  eslint: {
    configFile: './.eslintrc',
    quiet: false,
    failOnWarning: true,
    failOnError: true
  },

  module: {
    loaders: [
      { test: /\.jsx?$/, exclude: /node_modules/, loaders: ['react-hot', 'babel-loader'], include: path.join(__dirname, './') },
      { test: /\.js$/, loader: 'eslint-loader', exclude: /[node_modules|vendor]/ }
    ]
  }
};
