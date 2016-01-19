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
        this._wavesurfer.WebAudio.setProcessingCallback( (pos) => {
            //console.log("processing: "+pos);
        });

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
  componentWillReceiveProps(nextProps) {
    if (this.props.audioFile !== nextProps.audioFile) {
      this._loadAudio(nextProps.audioFile);
    }
    if (typeof nextProps.pos === 'number' && this._fileLoaded) {
      this._seekTo(nextProps.pos);
      console.log("subclassSeek: "+nextProps.pos);
    }
    /*if (nextProps.regions) {
      const _regionsToDelete = this._wavesurfer.regions.list;
      nextProps.regions.forEach((region) => {
        // update region
        if (region.id && this._wavesurfer.regions.list[region.id]) {
          this._wavesurfer.regions.list[region.id].update(region);
        } else {
          // new region
          this.wavesurfer.addRegion(region);
        }
      });
      if (_regionsToDelete.length) {
        _regionsToDelete.forEach((regionToDelete) => {
          this._wavesurfer.regions.list[regionToDelete.id].remove();
        });
      }
    }*/
    if (this.props.playing !== nextProps.playing) {
      if (nextProps.playing) {
        this._wavesurfer.backend.play();
        if(this._selectedRegion != null) {
            this._wavesurfer.backend.seekTo(this._selectedRegion.start, this._selectedRegion.end);
        }

      } else {
        this._wavesurfer.pause();
      }
    }
  }
}

// Default in super is pos = 0, which will reset the player on pause.
// Override it so that play/pause resumes from last played position.
Wavesurfer.defaultProps.pos = undefined; 

export default Wavesurfer;