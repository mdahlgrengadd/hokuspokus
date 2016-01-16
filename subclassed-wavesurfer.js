//import React from 'react';
import React, {
    Component,
    PropTypes
} from 'react';
import myWavesurfer from 'react-wavesurfer';
import WavesurferRegionsPlugin from 'wavesurfer.regions.js'
import WavesurferEcho66Backend from 'backends/webaudio_PV_fast_5_live.js'
import WavesurferIrcamWavesBackend from 'backends/webaudio_myengine.js'


// Ugly, but temporary until react-wavesurfer adds regions plugin support again
class Wavesurfer extends myWavesurfer {
    constructor(props) {
        super(props);
        var _selectedRegion = null;

        this._wavesurfer.util.extend(this._wavesurfer, WavesurferRegionsPlugin);
        //this._wavesurfer.util.extend(this._wavesurfer.WebAudio, WavesurferEcho66Backend);
        this._wavesurfer.util.extend(this._wavesurfer.WebAudio, WavesurferIrcamWavesBackend);

        this._wavesurfer.on('ready', () => {
            // Regions
            if (this._wavesurfer.enableDragSelection) {
                this._wavesurfer.enableDragSelection({
                    color: 'rgba(0, 255, 0, 0.1)'
                });
            }
        })

        this.setupRegionHandling();

    }

    setupRegionHandling() {
        this._wavesurfer.on('region-update-end', (region) => {

            if (this._selectedRegion != null) {
                //Unhighligt old selection
                this._selectedRegion.update({
                    color: 'rgba(0, 255, 0, 0.1)'
                });
            }

            this._selectedRegion = region;

            // Hack: Click-to-seek
            this._wavesurfer.drawer.un('click');
            this._wavesurfer.drawer.on('click', (e, progress) => {
                setTimeout(() => {
                    var seekpos = progress * this._wavesurfer.getDuration();

                    if (this._selectedRegion != null) {

                        //Check if clicked outside last selected region...
                        if (seekpos < this._selectedRegion.start || seekpos > this._selectedRegion.end) {
                            //Unhighlight region
                            this._selectedRegion.update({
                                color: 'rgba(0, 255, 0, 0.1)'
                            });
                            this._selectedRegion = null;

                            this._wavesurfer.backend.seekTo(seekpos);
                        } else { // end if seekpos...

                            this._selectedRegion.update({
                                color: 'rgba(255, 0, 0, 0.25)'
                            });
                            this._selectedRegion = region;

                            this._wavesurfer.backend.seekTo(this._selectedRegion.start, this._selectedRegion.end);
                        }
                    } else { // end if this._selectedRegion..
                        this._wavesurfer.backend.seekTo(seekpos);
                    }

                    this._wavesurfer.drawer.progress(this._wavesurfer.backend.getPlayedPercents());
                    
                }, 0);
            });

        });

    }



  // update wavesurfer rendering manually
  // FIXME: Playback is now started in super.componentWillReceiveProps() and
  //        after that we seek to selectedRegion which will cause cracks in audio.
  componentWillReceiveProps(nextProps) {
    super.componentWillReceiveProps(nextProps);
    console.log(this._selectedRegion);

    if (this.props.playing !== nextProps.playing) {
      if (nextProps.playing && this._selectedRegion != null) {
        this._wavesurfer.backend.seekTo(this._selectedRegion.start, this._selectedRegion.end);
      }
    }
  }

}

export default Wavesurfer;