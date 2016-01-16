//import React from 'react';
import React, {
    Component,
    PropTypes
} from 'react';
import myWavesurfer from 'react-wavesurfer';
import WavesurferRegionsPlugin from 'wavesurfer.regions.js'
import WavesurferIrcamBackend from 'backends/webaudio_PV_fast_5_live.js'

// Ugly, but temporary until react-wavesurfer adds regions plugin support again
class Wavesurfer extends myWavesurfer {
    constructor(props) {
        super(props);

        var _selectedRegion = null;

        this._wavesurfer.util.extend(this._wavesurfer, WavesurferRegionsPlugin);
        this._wavesurfer.util.extend(this._wavesurfer, WavesurferIrcamBackend);

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

        var wavesurfer = this._wavesurfer;
        var selectedRegion = this._selectedRegion;

        wavesurfer.on('region-update-end', function(region) {


            if (selectedRegion != null) {
                //console.log(selectedRegion)
                //Unhighligt old selection
                selectedRegion.update({
                    color: 'rgba(0, 255, 0, 0.1)'
                });
            }

            //region.start = Math.floor( region.start*44100 / 4096 ) * 4096 / 44100
            //region.end = Math.floor( region.end*44100 / 4096 ) * 4096 / 44100
            console.log("REGION LOOP MOD" + ((region.end - region.start) * 44100) % 4096);
            selectedRegion = region;
            // Hack: Click-to-seek
            wavesurfer.drawer.un('click');
            wavesurfer.drawer.on('click', function(e, progress) {
                setTimeout(function() {

                    var seekpos = progress * wavesurfer.getDuration();

                    if (selectedRegion != null) {

                        //Check if clicked outside last selected region...
                        if (seekpos < selectedRegion.start || seekpos > selectedRegion.end) {
                            //Unhighlight region
                            selectedRegion.update({
                                color: 'rgba(0, 255, 0, 0.1)'
                            });
                            selectedRegion = null;

                            wavesurfer.backend.seekTo(seekpos);
                        } else { // end if seekpos...

                            selectedRegion.update({
                                color: 'rgba(255, 0, 0, 0.25)'
                            });
                            selectedRegion = region;

                            wavesurfer.backend.seekTo(selectedRegion.start, selectedRegion.end);
                        }
                    } else { // end if selectedRegion..
                        wavesurfer.backend.seekTo(seekpos);
                    }

                    wavesurfer.drawer.progress(wavesurfer.backend.getPlayedPercents());

                }, 0);
            });

        });

    }

}



/**
 * @description Capitalise the first letter of a string
 */
function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * @description Throws an error if the prop is defined and not an integer or not positive
 */
function positiveIntegerProptype(props, propName, componentName) {
    let n = props[propName];
    if (n !== undefined && (typeof n !== 'number' || n !== parseInt(n, 10) || n < 0)) {
        return new Error('Invalid `' + propName + '` supplied to `' + componentName + '`' +
            ', expected a positive integer');
    }
}

Wavesurfer.propTypes = {
    playing: PropTypes.bool,
    pos: PropTypes.number,
    audioFile: function(props, propName, componentName) {
        const prop = props[propName];
        if (prop && typeof prop !== 'string' && !prop instanceof Blob && !prop instanceof File) {
            return new Error('Invalid `' + propName + '` supplied to `' + componentName +
                '` expected either string or file/blob');
        }
    },
    regions: PropTypes.array,
    options: PropTypes.shape({
        audioRate: PropTypes.number,
        backend: PropTypes.oneOf(['WebAudio', 'MediaElement', 'IrcamWaves']),
        barWidth: function(props, propName, componentName) {
            const prop = props[propName];
            if (prop !== undefined && typeof prop !== 'number') {
                return new Error('Invalid `' + propName + '` supplied to `' + componentName +
                    '` expected either undefined or number');
            }
        },
        cursorColor: PropTypes.string,
        cursorWidth: positiveIntegerProptype,
        dragSelection: PropTypes.bool,
        fillParent: PropTypes.bool,
        height: positiveIntegerProptype,
        hideScrollbar: PropTypes.bool,
        interact: PropTypes.bool,
        loopSelection: PropTypes.bool,
        mediaControls: PropTypes.bool,
        minPxPerSec: positiveIntegerProptype,
        normalize: PropTypes.bool,
        pixelRatio: PropTypes.number,
        progressColor: PropTypes.string,
        scrollParent: PropTypes.bool,
        skipLength: PropTypes.number,
        waveColor: PropTypes.string,
        autoCenter: PropTypes.bool
    })
};

export default Wavesurfer;