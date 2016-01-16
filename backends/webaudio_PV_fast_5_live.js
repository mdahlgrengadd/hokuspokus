'use strict';
const WaveSurfer = require('react-wavesurfer/node_modules/wavesurfer.js/dist/wavesurfer.cjs.js');

//http://stackoverflow.com/questions/4467539/javascript-modulo-not-behaving
Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};



////////////////////////////////////////////////////////
//PhaseVocoder.js



var BUFFER_SIZE = 1024;
var FRAME_SIZE  = 1024;


WaveSurfer.Echo66PV = {
    scriptBufferSize: BUFFER_SIZE,
    PLAYING_STATE: 0,
    PAUSED_STATE: 1,
    FINISHED_STATE: 2,

    supportsWebAudio: function () {
        return !!(window.AudioContext || window.webkitAudioContext);
    },

    getAudioContext: function () {
        if (!WaveSurfer.Echo66PV.audioContext) {
            WaveSurfer.Echo66PV.audioContext = new (
                window.AudioContext || window.webkitAudioContext
            );
        }
        return WaveSurfer.Echo66PV.audioContext;
    },

    getOfflineAudioContext: function (sampleRate) {
        if (!WaveSurfer.Echo66PV.offlineAudioContext) {
            WaveSurfer.Echo66PV.offlineAudioContext = new (
                window.OfflineAudioContext || window.webkitOfflineAudioContext
            )(1, 2, sampleRate);
        }
        return WaveSurfer.Echo66PV.offlineAudioContext;
    },

    init: function (params) {

      this._pv = new BufferedPV(FRAME_SIZE);
      
      this._newPosition = 0;

      this._canPlay = false;

      this._pv.position = 0; 



        this.params = params;
        this.ac = params.audioContext || this.getAudioContext();

        this.lastPlay = this.ac.currentTime;
        this.startPosition = 0;
        this.scheduledPause = null;

        this.states = [
            Object.create(WaveSurfer.Echo66PV.state.playing),
            Object.create(WaveSurfer.Echo66PV.state.paused),
            Object.create(WaveSurfer.Echo66PV.state.finished)
        ];

        this.createVolumeNode();
        this.createAnalyserNode();
        this.createScriptNode();
        

        this.setState(this.PAUSED_STATE);
        this.setPlaybackRate(this.params.audioRate);
    },

    disconnectFilters: function () {
        if (this.filters) {
            this.filters.forEach(function (filter) {
                filter && filter.disconnect();
            });
            this.filters = null;
            // Reconnect direct path
            this.analyser.connect(this.gainNode);
        }
    },

    setState: function (state) {
        if (this.state !== this.states[state]) {
            this.state = this.states[state];
            this.state.init.call(this);
        }
    },

    // Unpacked filters
    setFilter: function () {
        this.setFilters([].slice.call(arguments));
    },

    /**
     * @param {Array} filters Packed ilters array
     */
    setFilters: function (filters) {
        // Remove existing filters
        this.disconnectFilters();

        // Insert filters if filter array not empty
        if (filters && filters.length) {
            this.filters = filters;

            // Disconnect direct path before inserting filters
            this.analyser.disconnect();

            // Connect each filter in turn
            filters.reduce(function (prev, curr) {
                prev.connect(curr);
                return curr;
            }, this.analyser).connect(this.gainNode);
        }

    },

    createScriptNode: function () {
        if (this.ac.createScriptProcessor) {
            this.scriptNode = this.ac.createScriptProcessor(this.scriptBufferSize);
        } else {
            this.scriptNode = this.ac.createJavaScriptNode(this.scriptBufferSize);
        }

        this.scriptNode.connect(this.ac.destination);
    },


    addOnAudioProcess: function () { // audioContext, audioBuffer, frameSize, bufferSize


      var _audioCtx = this.ac;

      //this.scriptNode = _audioCtx.createScriptProcessor(BUFFER_SIZE, 2);
      
      
     // var _audioBuffer = this.buffer; //audioBuffer;

      //this._pv.set_audio_buffer(this.source.buffer, this.source.loopStart*44100, this.source.loopEnd*44100);

      var _newAlpha = 1;

      this._newPosition = 0;//this.source.loopStart*44100;//((this.ac.currentTime - this.lastPlay) * this.playbackRate).mod(this.source.loopEnd -this.source.loopStart);



      this._pv.position = 0;//this.source.loopStart*44100;//this._newPosition; 

      var my = this;
      var pv_info = {};
      this.scriptNode.onaudioprocess = function(e) {
        

        if (my._canPlay) {
                 
          pv_info = my._pv.process(e.outputBuffer);


        } 


            var time = my.getCurrentTime();

            //if (time >= my.getDuration()) {
            if(pv_info && pv_info.msg == 'done') {
                console.log(pv_info.buf_delta);
                if(!my.source.loop) {
                    // Clear output buffer before stopping audio...
                    var myArrayBuffer = my.ac.createBuffer(2, FRAME_SIZE*4, 44100);
                    var silentaudiobuf = new Float32Array(FRAME_SIZE*4);
                    myArrayBuffer.copyToChannel (silentaudiobuf,0,0);
                    myArrayBuffer.copyToChannel (silentaudiobuf,1,0);
                    my._pv.set_audio_buffer(myArrayBuffer, 0, FRAME_SIZE*4);
                    do {
                        pv_info = my._pv.process(e.outputBuffer);
                    
                    } while (!pv_info);

                    my.setState(my.FINISHED_STATE);
                    my.fireEvent('pause');

                } else { // loop
                    my._pv.set_bounds(my.source.loopStart*44100 + pv_info.buf_delta, my.source.loopEnd*44100);
                    //my._pv.position = my.source.loopStart*44100 + pv_info.buf_delta;
                }
            } else if (my.state === my.states[my.PAUSED_STATE]/*time >= my.scheduledPause*/) {
                // Clear output buffer before stopping audio...
                my.source.loop = false;
                    var myArrayBuffer = my.ac.createBuffer(2, FRAME_SIZE*4, 44100);
                    var silentaudiobuf = new Float32Array(FRAME_SIZE*4);
                    myArrayBuffer.copyToChannel (silentaudiobuf,0,0);
                    myArrayBuffer.copyToChannel (silentaudiobuf,1,0);
                    my._pv.set_audio_buffer(myArrayBuffer, 0, FRAME_SIZE*4);
                    do {
                        pv_info = my._pv.process(e.outputBuffer);
                        console.log("ertwerghw");                        
                    } while (!pv_info);
                my.setState(my.PAUSED_STATE);
                my.fireEvent('pause');
            } else if (my.state === my.states[my.PLAYING_STATE]) {
                my.fireEvent('audioprocess', time);
            }



        

      }

    },



    addOnAudioProcessBAK: function () {
        var my = this;

        this.scriptNode.onaudioprocess = function (e) {
            var time = my.getCurrentTime();

            if (time >= my.getDuration()) {
                my.setState(my.FINISHED_STATE);
                my.fireEvent('pause');
            } else if (time >= my.scheduledPause) {
                //my.setState(my.PAUSED_STATE);
                my.fireEvent('pause');
            } else if (my.state === my.states[my.PLAYING_STATE]) {
                my.fireEvent('audioprocess', time);
            }


/*
    var il = my.source.buffer.getChannelData(0);
    var ir = my.source.buffer.getChannelData(1);

    var ol = e.outputBuffer.getChannelData(0);
    var or = e.outputBuffer.getChannelData(1);

    // Fill output buffers (left & right) until the system has 
    // enough processed samples to reproduce.
    do {

        var bufL = new Float32Array(BUFFER_SIZE);
        var bufR = new Float32Array(BUFFER_SIZE);
        bufL = il.subarray(position,position+BUFFER_SIZE);
        bufR = ir.subarray(position,position+BUFFER_SIZE);

        position += phasevocoderL1.get_analysis_hop();

        // Process left input channel
        outBufferL1 = outBufferL1.concat(phasevocoderL1.process(bufL));

        // Process right input channel
        outBufferR1 = outBufferR1.concat(phasevocoderR1.process(bufR));

    } while(outBufferL1.length < BUFFER_SIZE);
    ol.set(outBufferL1.splice(0,BUFFER_SIZE));
    or.set(outBufferR1.splice(0,BUFFER_SIZE));

*/
        };
    
    },

    removeOnAudioProcess: function () {
        this.scriptNode.onaudioprocess = null;
    },

    createAnalyserNode: function () {
        this.analyser = this.ac.createAnalyser();
        //this.analyser.connect(this.gainNode);
    },

    /**
     * Create the gain node needed to control the playback volume.
     */
    createVolumeNode: function () {
        // Create gain node using the AudioContext
        if (this.ac.createGain) {
            this.gainNode = this.ac.createGain();
        } else {
            this.gainNode = this.ac.createGainNode();
        }
        // Add the gain node to the graph
        this.gainNode.connect(this.ac.destination);
    },

    /**
     * Set the gain to a new value.
     *
     * @param {Number} newGain The new gain, a floating point value
     * between 0 and 1. 0 being no gain and 1 being maximum gain.
     */
    setVolume: function (newGain) {
        this.gainNode.gain.value = newGain;
    },

    /**
     * Get the current gain.
     *
     * @returns {Number} The current gain, a floating point value
     * between 0 and 1. 0 being no gain and 1 being maximum gain.
     */
    getVolume: function () {
        return this.gainNode.gain.value;
    },

    decodeArrayBuffer: function (arraybuffer, callback, errback) {
        if (!this.offlineAc) {
            this.offlineAc = this.getOfflineAudioContext(this.ac ? this.ac.sampleRate : 44100);
        }
        this.offlineAc.decodeAudioData(arraybuffer, (function (data) {
            callback(data);
        }).bind(this), errback);
    },

    /**
     * Compute the max and min value of the waveform when broken into
     * <length> subranges.
     * @param {Number} How many subranges to break the waveform into.
     * @returns {Array} Array of 2*<length> peaks or array of arrays
     * of peaks consisting of (max, min) values for each subrange.
     */
    getPeaks: function (length) {
        var sampleSize = this.buffer.length / length;
        var sampleStep = ~~(sampleSize / 10) || 1;
        var channels = this.buffer.numberOfChannels;
        var splitPeaks = [];
        var mergedPeaks = [];

        for (var c = 0; c < channels; c++) {
            var peaks = splitPeaks[c] = [];
            var chan = this.buffer.getChannelData(c);

            for (var i = 0; i < length; i++) {
                var start = ~~(i * sampleSize);
                var end = ~~(start + sampleSize);
                var min = chan[0];
                var max = chan[0];

                for (var j = start; j < end; j += sampleStep) {
                    var value = chan[j];

                    if (value > max) {
                        max = value;
                    }

                    if (value < min) {
                        min = value;
                    }
                }

                peaks[2 * i] = max;
                peaks[2 * i + 1] = min;

                if (c == 0 || max > mergedPeaks[2 * i]) {
                    mergedPeaks[2 * i] = max;
                }

                if (c == 0 || min < mergedPeaks[2 * i + 1]) {
                    mergedPeaks[2 * i + 1] = min;
                }
            }
        }

        return this.params.splitChannels ? splitPeaks : mergedPeaks;
    },

    getPlayedPercents: function () {
        return this.state.getPlayedPercents.call(this);
    },

    disconnectSource: function () {
        if (this.source) {
            this.source.disconnect();
        }
    },

    destroy: function () {
        if (!this.isPaused()) {
            this.pause();
        }
        this.unAll();
        this.buffer = null;
        this.disconnectFilters();
        this.disconnectSource();
        this.gainNode.disconnect();
        this.scriptNode.disconnect();
        this.analyser.disconnect();
    },

    load: function (buffer) {
        this.startPosition = 0;
        this.lastPlay = this.ac.currentTime;
        this.buffer = buffer;
        this.createSource();
        

    },

    createSource: function () {
        this.disconnectSource();
        this.source = this.ac.createBufferSource();

        //adjust for old browsers.
        this.source.start = this.source.start || this.source.noteGrainOn;
        this.source.stop = this.source.stop || this.source.noteOff;

        this.source.playbackRate.value = this.playbackRate;
        this.source.buffer = this.buffer;
        //this.source.connect(this.analyser);



    },

    isPaused: function () {
        return this.state !== this.states[this.PLAYING_STATE];
    },

    getDuration: function () {
        if (!this.buffer) {
            return 0;
        }
        return this.buffer.duration;
    },

    seekTo: function (start, end) {
        this.source.loop = true; //FIXME: Should be instance variable
        
        if (start == null) {
            start = this.getCurrentTime();
            if (start >= this.getDuration()) {
                start = 0;
            }
        }
        if (end == null) {
            end = this.getDuration();
            this.source.loop = false;
        }

        this.startPosition = start;
        this.lastPlay = this.ac.currentTime;

        if (this.state === this.states[this.FINISHED_STATE]) {
            this.setState(this.PAUSED_STATE);
        }


        // When loop is true, an undesired behavior makes seeking 
        // beyond loopEnd change the position so that it fits inside 
        // loop region. This ugly fix turns off looping when seeking
        // outside loop region. (Also when playing in reverse (speed < 0), 
        // the same happens at loopStart).
        if (!this.source.loop) {
            this.source.loopStart = start;
            this.source.loopEnd = this.getDuration();
        } else {
            this.source.loopStart = start;

            //The bufferdPV plays in FRAME_SIZE chunks.
            //If the last chunk happen to overlap the loop region end,
            //it will not be played... so add one FRAME_SIZE to
            //the selection. FIXME: This should be fixed inside
            //bufferdPV.
            this.source.loopEnd = end+FRAME_SIZE*1/44100; 
        }



        this.scheduledPause = end;
        this._pv.set_audio_buffer(this.source.buffer);
        this._pv.set_bounds(this.source.loopStart*44100, this.source.loopEnd*44100);


        return { start: start, end: end };
    },

    getPlayedTime: function () {
        return this._pv.position/44100-this.source.loopStart;
        
    },

    /**
     * Plays the loaded audio region.
     *
     * @param {Number} start Start offset in seconds,
     * relative to the beginning of a clip.
     * @param {Number} end When to stop
     * relative to the beginning of a clip.
     */
    play: function (start, end) {
        // need to re-create source on each playback
        this.createSource();

        var adjustedTime = this.seekTo(start, end);

        start = adjustedTime.start;
        end = adjustedTime.end;

        this.scheduledPause = end;


        this.source.start(0, start, end - start);
        this._canPlay = true;

        this.setState(this.PLAYING_STATE);

        this.fireEvent('play');
    },

    /**
     * Pauses the loaded audio.
     */
    pause: function () {
        this.scheduledPause = null;
        //this._canPlay = false;
        this.startPosition += this.getPlayedTime();
        this.source && this.source.stop(0);

        this.setState(this.PAUSED_STATE);

        this.fireEvent('pause');
    },

    /**
    *   Returns the current time in seconds relative to the audioclip's duration.
    */
    getCurrentTime: function () {
        return this.state.getCurrentTime.call(this);
    },

    /**
     * Set the audio source playback rate.
     */
    setPlaybackRate: function (value) {

        this._pv.alpha = 1 / value;

        value = value || 1;
        if (this.isPaused()) {
            this.playbackRate = value;
        } else {
            //this.pause();
            this.playbackRate = value;
            //this.play();
        }
    }
};

WaveSurfer.Echo66PV.state = {};

WaveSurfer.Echo66PV.state.playing = {
    init: function () {
        console.log("addOnAudioProcess");
        this.addOnAudioProcess();
    },
    getPlayedPercents: function () {
        var duration = this.getDuration();
        return (this.getCurrentTime() / duration) || 0;
    },
    getCurrentTime: function () {
        return this.startPosition + this.getPlayedTime();
    }
};

WaveSurfer.Echo66PV.state.paused = {
    init: function () {
        //this.removeOnAudioProcess();
    },
    getPlayedPercents: function () {
        var duration = this.getDuration();
        return (this.getCurrentTime() / duration) || 0;
    },
    getCurrentTime: function () {
        return this.startPosition;
    }
};

WaveSurfer.Echo66PV.state.finished = {
    init: function () {
        this.removeOnAudioProcess();
        this.fireEvent('finish');
    },
    getPlayedPercents: function () {
        return 1;
    },
    getCurrentTime: function () {
        return this.getDuration();
    }
};

WaveSurfer.util.extend(WaveSurfer.Echo66PV, WaveSurfer.Observer);

export default WaveSurfer.Echo66PV;