import React from 'react';
import ReactDOM from 'react-dom';
import Wavesurfer from 'subclassed-wavesurfer.js';


class RegionsExample extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      regions: [{
        id: 'One',
        start: 0,
        end: 3
      }, {
        id: 'Two',
        start: 4,
        end: 7
      }, {
        id: 'Three',
        start: 9,
        end: 13
      }]
    };

    // Handle Playback
    this.state = {
      playing: false
    };
    this.handleTogglePlay = this.handleTogglePlay.bind(this);
  }

  handleTogglePlay() {
    this.setState({
      playing: !this.state.playing
    });
  }

  render() {
    const process = (e) => {
      //do something...
    };

    const waveOptions = {
      backend: 'WebAudio',
      audioRate: 0.5,
      scrollParent: true,
      height: 140,
      progressColor: '#6c718c',
      waveColor: '#c4c8dc',
      normalize: true
    };


    return (
      <div className='example'>
        <p>With regions plugin enabled</p>
        <button onClick={this.handleTogglePlay}>toggle play</button>
          <Wavesurfer
            audioFile={this.props.audioFile}
            regions={this.state.regions}
            options={waveOptions}
            playing={this.state.playing}
            //onAudioprocess={process}
          />
      </div>
    );
  }
}


class ExampleParent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      audioFile:'./resources/demo.wav'
    };
  }
  render () {
    return (
      <div className='example-list'>
        <h1>react-wavesurfer examples</h1>
        <RegionsExample audioFile={this.state.audioFile} />
      </div>
    );
  }
}


ReactDOM.render(<ExampleParent />, document.getElementById('app'));
