'use strict';
var Waves = require('waves');
var wavesAudio = Waves.audio;
//var this.timeStretch = 1.0 ; // Max slowdown, used for calculating the maximum length of temporary buffers
const SCRIPT_BUFFER = 1024*4;

function optOrDef(opt, def) {
  if(opt !== undefined)
    return opt;

  return def;
}

class MyEngine extends wavesAudio.PlayerEngine {
  constructor(options) {
    super(options);
      this.scriptNode = {};
      
          this._canPlay = true;
          this._bgRenderDone = false;
          this._pv = new BufferedPV(4096*2);
          this.timeStretch = optOrDef(options.timeStretch, 2);
          this._pv.alpha = this.timeStretch;
          this._newPosition = undefined;

          this._pv.set_audio_buffer(this.buffer);

          this.renderbuffer = this.audioContext.createBuffer(2, SCRIPT_BUFFER, 44100);

          this.outputbuffer = this.audioContext.createBuffer(2, this.buffer.duration*this.timeStretch*44100, 44100);

          this.setupScriptProcessor()

  }
  getBgProcessedPercent () {
    var res = 0;
    if (this._bgRenderDone) {
      res =  1
    } else {
      res = this._pv.position / (this.outputbuffer.duration *44100 / this.timeStretch);
    }
    return res;
  }

  setupScriptProcessor() {
    var audioContext = this.audioContext;


        if (audioContext.createScriptProcessor) {
            this.scriptNode = audioContext.createScriptProcessor(SCRIPT_BUFFER);
        } else {
            this.scriptNode = audioContext.createJavaScriptNode(SCRIPT_BUFFER);
        }

        this.scriptNode.connect(this.outputNode);



      //this._newPosition = 0;//this.source.loopStart*44100;//((this.ac.currentTime - this.lastPlay) * this.playbackRate).mod(this.source.loopEnd -this.source.loopStart);



      //this._pv.position = 0;//this.source.loopStart*44100;//this._newPosition; 

      var my = this;
      var pv_info = {};
      this.scriptNode.onaudioprocess = function(e) {

        // Do it twice per cycle to be ahead of granular synth that reads this output buffer.
        for (var i=0;i<2;i++) {
        if (my._canPlay && !my._bgRenderDone) {

          //my._pv.set_bounds(my._pv.position, my._pv.position+SCRIPT_BUFFER);

          pv_info = my._pv.process(my.renderbuffer);
          var il = my.renderbuffer.getChannelData(0); 
          var ir = my.renderbuffer.getChannelData(1);
          var ol = my.outputbuffer.getChannelData(0);
          var or = my.outputbuffer.getChannelData(1);
          if (my._pv.position*my._pv.alpha+il.length<=ol.length) {
            ol.set(il, my._pv.position*my._pv.alpha);
            or.set(ir, my._pv.position*my._pv.alpha);
          } else {
            console.log("Background phasecocoder done...");
            my._bgRenderDone = true;
          }
          
        }


      }

      }
  }
  __start(time, position, speed) {
    var audioContext = this.audioContext;
    if (this.buffer) {
      var bufferDuration = this.outputbuffer.duration;

      if (this.__cyclic && (position < 0 || position >= bufferDuration)) {
        var phase = position / bufferDuration;
        position = (phase - Math.floor(phase)) * bufferDuration;
      }

      if (position >= 0 && position < bufferDuration && speed > 0) {
        this.__envNode = audioContext.createGain();
        this.__envNode.gain.setValueAtTime(0, time);
        this.__envNode.gain.linearRampToValueAtTime(1, time + this.fadeTime);
        this.__envNode.connect(this.__gainNode);

        this.__bufferSource = audioContext.createBufferSource();
        this.__bufferSource.buffer = this.outputbuffer;
        this.__bufferSource.playbackRate.value = speed;
        this.__bufferSource.loop = this.__cyclic;
        this.__bufferSource.loopStart = 0;
        this.__bufferSource.loopEnd = bufferDuration;
        this.__bufferSource.start(time, position);
        this.__bufferSource.connect(this.__envNode);

        this._canPlay = true;


      }
    }
  }

  __halt(time) {
    if (this.__bufferSource) {
      this.__envNode.gain.cancelScheduledValues(time);
      this.__envNode.gain.setValueAtTime(this.__envNode.gain.value, time);
      this.__envNode.gain.linearRampToValueAtTime(0, time + this.fadeTime);
      this.__bufferSource.stop(time + this.fadeTime);

      this.__bufferSource = null;
      this.__envNode = null;
    }
  }

  // TimeEngine method (speed-controlled interface)
  syncSpeed(time, position, speed, seek) {
    var lastSpeed = this.__speed;
    if (speed !== lastSpeed || seek) {
      if (seek || lastSpeed * speed < 0) {
        this.__halt(time);
        this.__start(time, position, speed);
      } else if (lastSpeed === 0 || seek) {
        this.__start(time, position, speed);
      } else if (speed === 0) {
        this.__halt(time);
      } else if (this.__bufferSource) {
        this.__bufferSource.playbackRate.setValueAtTime(speed, time);
      }

      this.__speed = speed;
    }
  }

  /**
   * Set whether the audio buffer is considered as cyclic
   * @param {Bool} cyclic whether the audio buffer is considered as cyclic
   */
  set cyclic(cyclic) {
    if (cyclic !== this.__cyclic) {
      var time = this.currentTime;
      var position = this.currentosition;

      this.__halt(time);
      this.__cyclic = cyclic;

      if (this.__speed !== 0)
        this.__start(time, position, this.__speed);
    }
  }

  /**
   * Get whether the audio buffer is considered as cyclic
   * @return {Bool} whether the audio buffer is considered as cyclic
   */
  get cyclic() {
    return this.__cyclic;
  }

  /**
   * Set gain
   * @param {Number} value linear gain factor
   */
  set gain(value) {
    var time = this.currentTime;
    this.__gainNode.cancelScheduledValues(time);
    this.__gainNode.setValueAtTime(this.__gainNode.gain.value, time);
    this.__gainNode.linearRampToValueAtTime(0, time + this.fadeTime);
  }

  /**
   * Get gain
   * @return {Number} current gain
   */
  get gain() {
    return this.__gainNode.gain.value;
  }

  /**
   * Get buffer duration
   * @return {Number} current buffer duration
   */
  get bufferDuration() {
    if(this.buffer)
      return this.buffer.duration;

    return 0;
  }
}


module.exports = MyEngine;