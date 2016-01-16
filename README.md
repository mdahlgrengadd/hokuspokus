# Hokus Pokus
React component for time-stretching (slow down/speed up) audio. Uses react-wavesurfer, Echo66's PhaseVocoder.js and Wavesjs granular synth.

## Dependencies, need to be installed manually, i.e. "npm install babel-core" ..etc..

 -   "babel-core": "^6.4.0",
 -   "babel-loader": "^6.2.1",
 -   "babel-preset-es2015": "^6.3.13",
 -   "babel-preset-react": "^6.3.13",
 -   "jsx-loader": "^0.13.2",
 -   "react": "^0.14.6",
 -   "react-dom": "^0.14.6",
 -   "react-hot-loader": "^1.3.0",
 -   "react-wavesurfer": "^0.2.2",
 -   "waves": "wavesjs/waves",
 -   "webpack": "^1.12.11",
 -   "webpack-dev-server": "^1.14.1"

Note: react-wavesurfer includes its on react which might lead to errors with multiple instances in webpack. Delete the react which is included in react-wavesurfer/node_modules and it should work.   
  
## Using it

Type 'webpack-dev-server' in console, then point your browser to localhost:8080 

