'use strict';


//var wavesAudio = require('waves-audio');
//var wavesLoaders = require('waves-loaders');
//var wavesBasicControllers = require('waves-basic-controllers');
//var scheduler = wavesAudio.getScheduler();
//var granularEngine = new wavesAudio.GranularEngine();

//scheduler.add(granularEngine);

// This example shows a `GranularEngine` with a few parameter controls driven by a `Scheduler` and a `PlayControl`.





////////////////////////////////////////////////////////
//PhaseVocoder.js



var BUFFER_SIZE = 1024*4;

var context = new webkitAudioContext();

var g_buffer = context.createBuffer(2, BUFFER_SIZE, context.sampleRate);

var node1 = context.createScriptProcessor(BUFFER_SIZE, 2, 2);
var node2 = context.createScriptProcessor(BUFFER_SIZE, 2, 2);

var alpha = 2; var position = 0; var position2 = 0;

var phasevocoderL1 = new PhaseVocoder(BUFFER_SIZE/2, 44100); phasevocoderL1.init();
var phasevocoderR1 = new PhaseVocoder(BUFFER_SIZE/2, 44100); phasevocoderR1.init();

var phasevocoderL2 = new PhaseVocoder(BUFFER_SIZE/2, 44100); phasevocoderL2.init();
var phasevocoderR2 = new PhaseVocoder(BUFFER_SIZE/2, 44100); phasevocoderR2.init();

var phasevocoderL3 = new PhaseVocoder(BUFFER_SIZE/2, 44100); phasevocoderL3.init();
var phasevocoderR3 = new PhaseVocoder(BUFFER_SIZE/2, 44100); phasevocoderR3.init();

var outBufferL1 = [];
var outBufferR1 = [];

var outBufferL2 = [];
var outBufferR2 = [];

// Semitones from C to C D E F G A B
var SEMITONES = [ 0, 2, 4, 5, 7, 9, 11 ]
// Chromatic melodic scale
var CHROMATIC = [ 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B' ]

function fromMidi (midi) {
  var name = CHROMATIC[midi % 12]
  var oct = Math.floor(midi / 12) - 1
  return name + oct
}

function fromFreq (freq, tuning) {
  tuning = tuning || 440
  var lineal = 12 * ((Math.log(freq) - Math.log(tuning)) / Math.log(2))
  var midi = Math.round(69 + lineal)
  return fromMidi(midi)
}



function createCORSRequest(method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {

    // Check if the XMLHttpRequest object has a "withCredentials" property.
    // "withCredentials" only exists on XMLHTTPRequest2 objects.
    xhr.open(method, url, true);

  } else if (typeof XDomainRequest != "undefined") {

    // Otherwise, check if XDomainRequest.
    // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
    xhr = new XDomainRequest();
    xhr.open(method, url);

  } else {

    // Otherwise, CORS is not supported by the browser.
    xhr = null;

  }
  return xhr;
}




// function loadSample (stream_url) {

//              //var track = results.tracks.items[0];
//             //var stream_url = track.stream_url + (/\?/.test(track.stream_url) ? '&' : '?') + 'consumer_key=' + apiKey;
//             var previewUrl = stream_url; //preview_url



//             var request = createCORSRequest('GET', previewUrl);
//             if (!request) {
//               alert("error");
//               throw new Error('CORS not supported');
//             }
//             //request.setRequestHeader('Accept-Encoding', '');

//             //var request = new XMLHttpRequest();
//             //request.open('GET', previewUrl, true);
//             request.responseType = 'arraybuffer';
//             request.onload = function() {
//         console.log('url loaded');
//         context.decodeAudioData(request.response, function(decodedData) {
//             g_buffer = decodedData;
//         });
//     }

//     console.log('reading url');
//     request.send();
// }

//loadSample('https://api.soundcloud.com/tracks/219080995/stream?client_id=29690ca16f22593e7a6cf615d8fb8e33');

//loadSample('https://api.soundcloud.com/tracks/100485761/stream?client_id=29690ca16f22593e7a6cf615d8fb8e33');


//loadSample('https://api.soundcloud.com/tracks/213330659/stream?client_id=29690ca16f22593e7a6cf615d8fb8e33');


node1.onaudioprocess = function (e) {


    var il = g_buffer.getChannelData(0);
    var ir = g_buffer.getChannelData(1);

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
    
    /*var estimate = YINDetector(outBufferL1);
    if (estimate.freq > 0) {
        notename = fromFreq(estimate.freq)
        console.log(estimate.freq);
        $("#notename").text(notename);
    }*/


    /* Copy samples to the internal buffer */
/*
pitch.input(outBufferL1);

pitch.process();

var tone = pitch.findTone();

if (tone === null) {
    console.log('No tone found!');
} else {
            notename = fromFreq(tone.freq)
        console.log(tone.freq);
        $("#notename").text(notename);
    //console.log('Found a tone, frequency:', tone.freq, 'volume:', tone.db);
}
*/




};

node2.onaudioprocess = function (e) {

    var il = buffer.getChannelData(0);
    var ir = buffer.getChannelData(1);

    var ol = e.outputBuffer.getChannelData(0);
    var or = e.outputBuffer.getChannelData(1);

    // Fill output buffers (left & right) until the system has 
    // enough processed samples to reproduce.
    do {

        var bufL = new Float32Array(BUFFER_SIZE);
        var bufR = new Float32Array(BUFFER_SIZE);
        bufL = il.subarray(position2, position2+BUFFER_SIZE);
        bufR = ir.subarray(position2, position2+BUFFER_SIZE);

        position2 += phasevocoderL2.get_analysis_hop();

        // Process left input channel
        outBufferL2 = outBufferL2.concat(phasevocoderL2.process(bufL));

        // Process right input channel
        outBufferR2 = outBufferR2.concat(phasevocoderR2.process(bufR));

    } while(outBufferL2.length < BUFFER_SIZE);

    ol.set(outBufferL2.splice(0,BUFFER_SIZE));
    or.set(outBufferR2.splice(0,BUFFER_SIZE));



};


function setAlpha(newAlpha) {
    alpha = newAlpha;
    phasevocoderL1.set_alpha(newAlpha);
    phasevocoderR1.set_alpha(newAlpha);
}

function setAlpha2(newAlpha) {
    phasevocoderL2.set_alpha(newAlpha);
    phasevocoderR2.set_alpha(newAlpha);
}

function setPosition(v) {
    if(v===undefined) return;
    resetPVs2();
    //outBufferL = [];
    //outBufferR = [];

    position = Math.round(44100 * v);//Math.round(buffer.length * v);
    console.log("pos: "+position + "v="+v);
    position2 =  Math.round(44100 * v);//Math.round(buffer.length * v);
}

function resetPVs() {
    phasevocoderL1.reset();
    phasevocoderR1.reset();
}

function resetPVs2() {
    phasevocoderL1.reset2();
    phasevocoderR1.reset2();
}

function vocplay() {
    node1.connect(context.destination);
    //node2.connect(context.destination);
}

function pause() {
    node1.disconnect();
    node2.disconnect();
}
/*
document.addEventListener('DOMContentLoaded', function () {
    var toggleActive = function (e, toggle) {
        e.stopPropagation();
        e.preventDefault();
        // toggle ? e.target.classList.add('wavesurfer-dragover') :
        //     e.target.classList.remove('wavesurfer-dragover');
    };

    var handlers = {
        // Drop event
        drop: function (e) {
            toggleActive(e, false);

            // Load the file into wavesurfer
            if (e.dataTransfer.files.length) {
                pause();
                position = 0;
                resetPVs();

                var my = this;
                // Create file reader
                var reader = new FileReader();
                reader.addEventListener('progress', function (e) {
                    console.log(e);
                });
                reader.addEventListener('load', function (e) {
                    document.getElementById('filename').innerHTML = "<b>" + filename + "</b> loaded";
                    context.decodeAudioData(e.target.result, function(decodedData) {
                        buffer = decodedData;
                    });
                });
                reader.addEventListener('error', function () {
                    console.error('Error reading file');
                });

                var filename = e.dataTransfer.files[0].name;
                reader.readAsArrayBuffer(e.dataTransfer.files[0].slice());

            } else {
                console.error('Not a file');
            }
        },

        // Drag-over event
        dragover: function (e) {
            toggleActive(e, true);
        },

        // Drag-leave event
        dragleave: function (e) {
            toggleActive(e, false);
        }
    };

    var dropTarget = document.querySelector('#drop');
    Object.keys(handlers).forEach(function (event) {
        dropTarget.addEventListener(event, handlers[event]);
    });
});




*/




WaveSurfer.PhaseVocoder = {
    scriptBufferSize: BUFFER_SIZE,
    PLAYING_STATE: 0,
    PAUSED_STATE: 1,
    FINISHED_STATE: 2,

    supportsWebAudio: function () {
        return !!(window.AudioContext || window.webkitAudioContext);
    },

    getAudioContext: function () {
        if (!WaveSurfer.PhaseVocoder.audioContext) {
            WaveSurfer.PhaseVocoder.audioContext = new (
                window.AudioContext || window.webkitAudioContext
            );
        }
        return WaveSurfer.PhaseVocoder.audioContext;
    },

    getOfflineAudioContext: function (sampleRate) {
        if (!WaveSurfer.PhaseVocoder.offlineAudioContext) {
            WaveSurfer.PhaseVocoder.offlineAudioContext = new (
                window.OfflineAudioContext || window.webkitOfflineAudioContext
            )(1, 2, sampleRate);
        }
        return WaveSurfer.PhaseVocoder.offlineAudioContext;
    },

    init: function (params) {
        this.params = params;
        this.ac = params.audioContext || this.getAudioContext();

        this.lastPlay = this.ac.currentTime;
        this.startPosition = 0;
        this.scheduledPause = null;

        this.states = [
            Object.create(WaveSurfer.PhaseVocoder.state.playing),
            Object.create(WaveSurfer.PhaseVocoder.state.paused),
            Object.create(WaveSurfer.PhaseVocoder.state.finished)
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

            if (time >= my.getDuration()) {
                my.setState(my.FINISHED_STATE);
                my.fireEvent('pause');
            } else if (time >= my.scheduledPause) {
                my.setState(my.PAUSED_STATE);
                my.fireEvent('pause');
            } else if (my.state === my.states[my.PLAYING_STATE]) {
                my.fireEvent('audioprocess', time);
            }








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

        self = this;

                    self.startPosition = 0;
        self.lastPlay = this.ac.currentTime;
        self.buffer = buffer;
        self.createSource();

              setAlpha(2.0);

/*
    var audioCtx = new AudioContext();
    var offlineCtx = new OfflineAudioContext(2,44100*buffer.duration*alpha,44100);


    // use XHR to load an audio track, and
    // decodeAudioData to decode it and OfflineAudioContext to render it
    var source = offlineCtx.createBufferSource();
    var dest = offlineCtx.createBufferSource();
    dest.buffer = offlineCtx.createBuffer(2, 44100*buffer.duration*alpha, 44100);
    var outpos = 0;



(function() {
    //offlineCtx.decodeAudioData(buffer, function(buf) {
    //source = offlineCtx.createBufferSource();

     var node0 = offlineCtx.createScriptProcessor(BUFFER_SIZE, 2, 2);
      source.buffer = buffer; //buf;
      
      //source.connect(node);
      node0.connect(offlineCtx.destination);

      //node0.onaudioprocess = function (e) {
        while (outpos / 44100 < source.buffer.duration*alpha-1) {
            console.log(outpos/44100 +" : " + source.buffer.duration);

            var il = source.buffer.getChannelData(0);
            var ir = source.buffer.getChannelData(1);

            var ol = dest.buffer.getChannelData(0);
            var or = dest.buffer.getChannelData(1);

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

            ol.set(outBufferL1.splice(0,BUFFER_SIZE), outpos);
            or.set(outBufferR1.splice(0,BUFFER_SIZE), outpos);
            outpos += BUFFER_SIZE;

        };

      

      //source.start(0);

      //source.loop = true;
      //offlineCtx.startRendering().then(function(renderedBuffer) {
      //  console.log('Rendering completed successfully');




        (function() {
              var audioContext = wavesAudio.audioContext;
              var loader = new wavesLoaders.AudioBufferLoader(); // instantiate loader
              var containerId = '#granular-engine-container';

              // load audio file
              //loader.load("test2.mp3")
              //  .then(function(loaded) {
                  // get scheduler and create scheduled granular engine
                  var scheduler = wavesAudio.getScheduler();
                  var scheduledGranularEngine = new wavesAudio.GranularEngine({
                    buffer: dest.buffer
                  });
                  scheduledGranularEngine.connect(audioContext.destination);

                  // create transport with play control and transported granular engine
                  var transportedGranularEngine = new wavesAudio.GranularEngine({
                    buffer: dest.buffer,
                    cyclic: true
                  });
                  var playControl = new wavesAudio.PlayControl(transportedGranularEngine);
                  transportedGranularEngine.connect(audioContext.destination);

                  // create GUI elements
                  new wavesBasicControllers.Title("Granular Engine in Scheduler", containerId);

                  new wavesBasicControllers.Toggle("Enable", false, containerId, function(value) {
                    if (value)
                      scheduler.add(scheduledGranularEngine);
                    else
                      scheduler.remove(scheduledGranularEngine);
                  });

                  new wavesBasicControllers.Slider("Position", 0, dest.buffer.duration, 0.010, 0, "sec", 'large', containerId, function(value) {
                    scheduledGranularEngine.position = value;
                  });

                  new wavesBasicControllers.Title("Granular Engine with Play Control", containerId);

                  new wavesBasicControllers.Toggle("Play", false, containerId, function(value) {
                    if (value)
                      playControl.start();
                    else
                      playControl.stop();
                  });

                  var speedSlider = new wavesBasicControllers.Slider("Speed", -2, 2, 0.01, 1, "", '', containerId, function(value) {
                    playControl.speed = value;
                    speedSlider.value = playControl.speed;
                  });

                  new wavesBasicControllers.Title("Common Parameters", containerId);

                  new wavesBasicControllers.Slider("Position Var", 0, 0.200, 0.001, 0.01, "sec", '', containerId, function(value) {
                    scheduledGranularEngine.positionVar = value;
                    transportedGranularEngine.positionVar = value;
                  });

                  new wavesBasicControllers.Slider("Period", 0.001, 0.500, 0.001, 0.01, "sec", '', containerId, function(value) {
                    scheduledGranularEngine.periodAbs = value;
                    transportedGranularEngine.periodAbs = value;
                  });

                  new wavesBasicControllers.Slider("Duration", 0.010, 0.500, 0.001, 0.250, "sec", '', containerId, function(value) {
                    scheduledGranularEngine.durationAbs = value;
                    transportedGranularEngine.durationAbs = value;
                  });

                  new wavesBasicControllers.Slider("Resampling", -2400, 2400, 1, 0, "cent", '', containerId, function(value) {
                    scheduledGranularEngine.resampling = value;
                    transportedGranularEngine.resampling = value;
                  });

                  new wavesBasicControllers.Slider("Resampling Var", 0, 1200, 1, 0, "cent", '', containerId, function(value) {
                    scheduledGranularEngine.resamplingVar = value;
                    transportedGranularEngine.resamplingVar = value;
                  });

                //});
            })();





      //}).catch(function(err) {
      //    console.log('Rendering failed: ' + err);
      //    // Note: The promise should reject when startRendering is called a second time on an OfflineAudioContext
      //});
    //}); //decodeAudioData
  })();


        this.startPosition = 0;
        this.lastPlay = this.ac.currentTime;
        this.buffer = dest.buffer;
        this.createSource();





*/



    },

    createSource: function () {
        this.disconnectSource();
        this.source = this.ac.createBufferSource();

        //adjust for old browsers.
        this.source.start = this.source.start || this.source.noteGrainOn;
        this.source.stop = this.source.stop || this.source.noteOff;

        this.source.playbackRate.value = this.playbackRate;
        //console.log(g_buffer);
        this.source.buffer = this.buffer;
        g_buffer = this.buffer;
        this.source.connect(this.analyser);

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
        this.scheduledPause = null;
        setPosition(start); 

        if (start == null) {
            start = this.getCurrentTime();
            if (start >= this.getDuration()) {
                start = 0;
            }
        }
        if (end == null) {
            end = this.getDuration();
        }

        this.startPosition = start;
        this.lastPlay = this.ac.currentTime;

        if (this.state === this.states[this.FINISHED_STATE]) {
            this.setState(this.PAUSED_STATE);
        }

        return { start: start, end: end };
    },

    getPlayedTime: function () {
        return (this.ac.currentTime - this.lastPlay) * this.playbackRate / alpha;
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

        //this.source.start(0, start, end - start);
        setAlpha(2);
        this.setState(this.PLAYING_STATE);
        vocplay();
        this.fireEvent('play');
    },

    /**
     * Pauses the loaded audio.
     */
    pause: function () {
        this.scheduledPause = null;

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
        value = value || 1;
        if (this.isPaused()) {
            this.playbackRate = value;
        } else {
            this.pause();
            this.playbackRate = value;
            this.play();
        }
    }
};

WaveSurfer.PhaseVocoder.state = {};

WaveSurfer.PhaseVocoder.state.playing = {
    init: function () {
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

WaveSurfer.PhaseVocoder.state.paused = {
    init: function () {
        this.removeOnAudioProcess();
    },
    getPlayedPercents: function () {
        var duration = this.getDuration();
        return (this.getCurrentTime() / duration) || 0;
    },
    getCurrentTime: function () {
        return this.startPosition;
    }
};

WaveSurfer.PhaseVocoder.state.finished = {
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

WaveSurfer.util.extend(WaveSurfer.PhaseVocoder, WaveSurfer.Observer);
