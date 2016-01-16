'use strict';
var wavesAudio = require('waves-audio');
//var wavesLoaders = require('waves-loaders');
var scheduler = wavesAudio.getScheduler();

// the granularEngine is used for pitch tracking
var granularEngine = new wavesAudio.GranularEngine();

var MyEngine = require('./phasevocoder-engine.js')

scheduler.add(granularEngine);


//http://stackoverflow.com/questions/4467539/javascript-modulo-not-behaving
Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};


WaveSurfer.IrcamWaves = {
    scriptBufferSize: 256,
    PLAYING_STATE: 0,
    PAUSED_STATE: 1,
    FINISHED_STATE: 2,

    supportsWebAudio: function () {
        return !!(window.AudioContext || window.webkitAudioContext);
    },

    getAudioContext: function () {
        if (!WaveSurfer.IrcamWaves.audioContext) {
            /*
            WaveSurfer.IrcamWaves.audioContext = new (
                window.AudioContext || window.webkitAudioContext
            );*/
            WaveSurfer.IrcamWaves.audioContext = wavesAudio.audioContext;

        }
        return WaveSurfer.IrcamWaves.audioContext;
    },

    getOfflineAudioContext: function (sampleRate) {
        if (!WaveSurfer.IrcamWaves.offlineAudioContext) {
            WaveSurfer.IrcamWaves.offlineAudioContext = new (
                window.OfflineAudioContext || window.webkitOfflineAudioContext
            )(1, 2, sampleRate);
        }
        return WaveSurfer.IrcamWaves.offlineAudioContext;
    },

    init: function (params) {
        this.params = params;
        this.ac = params.audioContext || this.getAudioContext();

        this.lastPlay = this.ac.currentTime;
        this.startPosition = 0;
        this.scheduledPause = null;

        this.states = [
            Object.create(WaveSurfer.IrcamWaves.state.playing),
            Object.create(WaveSurfer.IrcamWaves.state.paused),
            Object.create(WaveSurfer.IrcamWaves.state.finished)
        ];

        this.createVolumeNode();
        this.createScriptNode();
        this.createAnalyserNode();

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

    addOnAudioProcess: function () {
        var my = this;

        this.scriptNode.onaudioprocess = function (e) {
            var time = my.getCurrentTime();

            if (time >= my.getDuration()  ||  time < 0) {
                my.setState(my.FINISHED_STATE);
                my.fireEvent('pause');
            } else if (time >= my.scheduledPause && my.playControl && !my.playControl.loop) {
                my.setState(my.PAUSED_STATE);
                my.fireEvent('pause');
            } else if (my.state === my.states[my.PLAYING_STATE]) {
                my.fireEvent('audioprocess', time);
            }

        };
    },

    removeOnAudioProcess: function () {
        this.scriptNode.onaudioprocess = null;
    },

    createAnalyserNode: function () {
        this.analyser = this.ac.createAnalyser();
        this.analyser.connect(this.gainNode);
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
        console.log("sampleStep: " + sampleStep);
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

        var self = this;


                  // get scheduler and create scheduled granular engine
                  var scheduler = wavesAudio.getScheduler();
                  self.scheduledGranularEngine = new wavesAudio.GranularEngine({
                    buffer: self.source.buffer
                  });
                  //scheduledGranularEngine.connect(audioContext.destination);

                  // create transport with play control and transported granular engine
                  self.transportedGranularEngine = new MyEngine({
                    buffer: self.source.buffer,
                    cyclic: true
                  });
                  self.playControl = new wavesAudio.PlayControl(self.transportedGranularEngine);
                  self.transportedGranularEngine.connect(self.analyser);

                  // Start the granularEngine used for pitch detection 
                  scheduler.add(self.scheduledGranularEngine);

                   //Good values for pitch detection 
                    self.scheduledGranularEngine.positionVar = 0.0;
                    self.transportedGranularEngine.positionVar = 0.01;
                    self.scheduledGranularEngine.periodAbs = 0.05;
                    self.transportedGranularEngine.periodAbs = 0.1;
                    self.scheduledGranularEngine.durationAbs = 0.5;
                    self.transportedGranularEngine.durationAbs = 0.2;
                    self.scheduledGranularEngine.resampling = 0.0;
                    self.transportedGranularEngine.resampling = 0.0;
                    self.scheduledGranularEngine.resamplingVar = 0.0;
                    self.transportedGranularEngine.resamplingVar = 0.0;

        
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
        
        var doLoop = true;
        
        if (start == null) {
            start = this.getCurrentTime();
            if (start >= this.getDuration()) {
                start = 0;
            }
        }
        if (end == null) {
            end = this.getDuration();
            doLoop = false;
        }
        //this.startPosition = start; 
        this.startPosition = 0;  
        this.lastPlay = this.ac.currentTime;

        if (this.state === this.states[this.FINISHED_STATE]) {
            this.setState(this.PAUSED_STATE);
        }
        // When loop is true, an undesired behavior makes seeking 
        // beyond loopEnd change the position so that it fits inside 
        // loop region. This ugly fix turns off looping when seeking
        // outside loop region. (Also when playing in reverse (speed < 0), 
        // the same happens at loopStart).
        if (!doLoop) {
            this.playControl.setLoopBoundaries(0, this.getDuration());
        } else {
            this.playControl.setLoopBoundaries(start, end);
        }
 
        this.playControl.seek (start);
        this.playControl.loop = doLoop;
        
        this.scheduledPause = end;
        //console.log("start: " + start + " end: " + end);    
        return { start: start, end: end };
    },

    getPlayedTime: function () {
        console.log(this.playControl.currentPosition);
        this.scheduledGranularEngine.position = this.playControl.currentPosition;
        return (this.playControl.currentPosition);//.mod(this.getDuration());
        //return (this.ac.currentTime - this.lastPlay) * this.playbackRate * this.playControl.speed;
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
        //this.createSource();

        var adjustedTime = this.seekTo(start, end);

        start = adjustedTime.start;
        end = adjustedTime.end;

        this.scheduledPause = end;

        //this.source.start(0, start, end - start);
        //play();

        //scheduler.add(this.transportedGranularEngine);

        this.playControl.start();
        this.playControl.seek (start);

        //console.log(start);

        this.setState(this.PLAYING_STATE);

        this.fireEvent('play');
    },

    /**
     * Pauses the loaded audio.
     */
    pause: function () {
        this.scheduledPause = null;

        this.startPosition += this.getPlayedTime();
        //this.source && this.source.stop(0);

        this.playControl.pause();
        //scheduler.remove(this.transportedGranularEngine);


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
        value = value || 1;

        if (this.playControl) {
            this.playControl.speed = value;
        }

        if (this.isPaused()) {
            this.playbackRate = value;
        } else {
            //this.pause();
            this.playbackRate = value;
            //this.play();
        }
    }
};

WaveSurfer.IrcamWaves.state = {};

WaveSurfer.IrcamWaves.state.playing = {
    init: function () {
        this.addOnAudioProcess();
    },
    getPlayedPercents: function () {
        var duration = this.getDuration();
        return (this.getCurrentTime() / duration) || 0;
    },
    getCurrentTime: function () {
        return this.getPlayedTime();
    }
};

WaveSurfer.IrcamWaves.state.paused = {
    init: function () {
        this.removeOnAudioProcess();
        if (this.playControl) {
            this.playControl.pause();
        }
        

    },
    getPlayedPercents: function () {
        var duration = this.getDuration();
        return (this.getCurrentTime() / duration) || 0;
    },
    getCurrentTime: function () {
        return this.getPlayedTime();
    }
};

WaveSurfer.IrcamWaves.state.finished = {
    init: function () {
        this.playControl.stop();
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

WaveSurfer.util.extend(WaveSurfer.IrcamWaves, WaveSurfer.Observer);
