'use strict';
var wavesAudio = require('waves-audio');

function optOrDef(opt, def) {
  if(opt !== undefined)
    return opt;

  return def;
}

class MyEngine extends wavesAudio.PlayerEngine {
  constructor(options) {
    super(options);
      this.scriptNode = {};
      
      this._canPlay = false;
      this._newPosition = 0;

      

      //this._pv.position = 0; 

      this.setupScriptProcessor();

  }

  setupScriptProcessor() {
    var audioContext = this.audioContext;


        if (audioContext.createScriptProcessor) {
            this.scriptNode = audioContext.createScriptProcessor(1024*4);
        } else {
            this.scriptNode = audioContext.createJavaScriptNode(1024*4);
        }

        this.scriptNode.connect(this.__gainNode);



      var _newAlpha = 1;

      this._newPosition = 0;//this.source.loopStart*44100;//((this.ac.currentTime - this.lastPlay) * this.playbackRate).mod(this.source.loopEnd -this.source.loopStart);



      //this._pv.position = 0;//this.source.loopStart*44100;//this._newPosition; 

      var my = this;
      var pv_info = {};
      this.scriptNode.onaudioprocess = function(e) {

          
        if (my._canPlay) {
            


          //my._pv.position = (my._pv.position)% ( 10*44100 - 13*44100);
          pv_info = my._pv.process(e.outputBuffer);

        } 


      

      }
  }

  __start(time, position, speed) {
    var audioContext = this.audioContext;

    if (this.buffer) {
      var bufferDuration = this.buffer.duration;

      if (this.__cyclic && (position < 0 || position >= bufferDuration)) {
        var phase = position / bufferDuration;
        position = (phase - Math.floor(phase)) * bufferDuration;
      }

      if (position >= 0 && position < bufferDuration && speed > 0) {
        this.__envNode = audioContext.createGain();
        //this.__envNode.gain.setValueAtTime(0, time);
        //this.__envNode.gain.linearRampToValueAtTime(1, time + this.fadeTime);
        this.__envNode.connect(this.__gainNode);

        this.__bufferSource = audioContext.createBufferSource();
        this.__bufferSource.buffer = this.buffer;
        this.__bufferSource.playbackRate.value = speed;
        this.__bufferSource.loop = this.__cyclic;
        this.__bufferSource.loopStart = 0;
        this.__bufferSource.loopEnd = bufferDuration;
        this.__bufferSource.start(time, position);
        //this.__bufferSource.connect(this.__envNode);

       
        // PhaseVocoder.js by Echo66
        console.log("__START");
        
        var self = this;
        var s = Math.round(this.master.__playControl.loopStart*44100);//this.__bufferSource.loopStart;//Math.floor ((position*44100+self.__bufferSource.loopStart*44100)/4096) *4096;
        var e = Math.round(this.master.__playControl.loopEnd*44100);//Math.floor ((self.__bufferSource.loopEnd*44100)/4096) *4096;
        console.log(e/44100);
        if(self._pv) self._pv.set_bounds(s, e);

        if(!this._pv) {
          this._pv = new BufferedPV(4096*2);
          this._pv.alpha = 1/speed;
          
          self._pv.set_audio_buffer(self.__bufferSource.buffer);
          self._pv.set_bounds(s, e);
          self._pv.position = s;

          this._canPlay = true;
        } else {

          this._pv.alpha = 1/speed;
        }
        

        
        
        


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
    console.log(position);
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