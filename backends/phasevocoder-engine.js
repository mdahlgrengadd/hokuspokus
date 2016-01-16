'use strict';

var wavesAudio = require('waves-audio');
var MAX_ALPHA = 2 ; // Max slowdown, used for calculating the maximum length of temporary buffers
function optOrDef(opt, def) {
  if(opt !== undefined)
    return opt;

  return def;
}

/**
 * @class GranularEngine
 */
class MyEngine extends wavesAudio.AudioTimeEngine {
  /**
   * @constructor
   * @param {AudioBuffer} buffer initial audio buffer for granular synthesis
   *
   * The engine implements the "scheduled" interface.
   * The grain position (grain onset or center time in the audio buffer) is optionally
   * determined by the engine's currentPosition attribute.
   */
  constructor(options) {
    super(options.audioContext);

    /**
     * Audio buffer
     * @type {AudioBuffer}
     */
    this.buffer = optOrDef(options.buffer, null);

    /**
     * Absolute grain period in sec
     * @type {Number}
     */
    this.periodAbs = optOrDef(options.periodAbs, 0.01);

    /**
     * Grain period relative to absolute duration
     * @type {Number}
     */
    this.periodRel = optOrDef(options.periodRel, 0);

    /**
     * Amout of random grain period variation relative to grain period
     * @type {Number}
     */
    this.periodVar = optOrDef(options.periodVar, 0);

    /**
     * Grain position (onset time in audio buffer) in sec
     * @type {Number}
     */
    this.position = optOrDef(options.position, 0);

    /**
     * Amout of random grain position variation in sec
     * @type {Number}
     */
    this.positionVar = optOrDef(options.positionVar, 0.003);

    /**
     * Absolute grain duration in sec
     * @type {Number}
     */
    this.durationAbs = optOrDef(options.durationAbs, 0.1); // absolute grain duration

    /**
     * Grain duration relative to grain period (overlap)
     * @type {Number}
     */
    this.durationRel = optOrDef(options.durationRel, 0);

    /**
     * Absolute attack time in sec
     * @type {Number}
     */
    this.attackAbs = optOrDef(options.attackAbs, 0);

    /**
     * Attack time relative to grain duration
     * @type {Number}
     */
    this.attackRel = optOrDef(options.attackRel, 0.5);

    /**
     * Shape of attack
     * @type {String} 'lin' for linear ramp, 'exp' for exponential
     */
    this.attackShape = optOrDef(options.attackShape, 'lin');

    /**
     * Absolute release time in sec
     * @type {Number}
     */
    this.releaseAbs = optOrDef(options.releaseAbs, 0);

    /**
     * Release time relative to grain duration
     * @type {Number}
     */
    this.releaseRel = optOrDef(options.releaseRel, 0.5);

    /**
     * Shape of release
     * @type {String} 'lin' for linear ramp, 'exp' for exponential
     */
    this.releaseShape = optOrDef(options.releaseShape, 'lin');

    /**
     * Offset (start/end value) for exponential attack/release
     * @type {Number} offset
     */
    this.expRampOffset = optOrDef(options.expRampOffset, 0.0001);

    /**
     * Grain resampling in cent
     * @type {Number}
     */
    this.resampling = optOrDef(options.resampling, 0);

    /**
     * Amout of random resampling variation in cent
     * @type {Number}
     */
    this.resamplingVar = optOrDef(options.resamplingVar, 0);

    /**
     * Linear gain factor
     * @type {Number}
     */
    this.gain = optOrDef(options.gain, 1);

    /**
     * Whether the grain position refers to the center of the grain (or the beginning)
     * @type {Bool}
     */
    this.centered = optOrDef(options.centered, true);

    /**
     * Whether the audio buffer and grain position are considered as cyclic
     * @type {Bool}
     */
    this.cyclic = optOrDef(options.cyclic, false);

    /**
     * Portion at the end of the audio buffer that has been copied from the beginning to assure cyclic behavior
     * @type {Number}
     */
    this.wrapAroundExtension = optOrDef(options.wrapAroundExtension, 0);

    this.outputNode = this.audioContext.createGain();












          this._canPlay = false;
          this._pv = new BufferedPV(4096*2);
          this._pv.alpha = 2;
          
          //console.log("THIS.BUFFER: " +this.buffer.duration);
          this._pv.set_audio_buffer(this.buffer);

          this.renderbuffer = this.audioContext.createBuffer(2, 1024*4, 44100);

          this.outputbuffer = this.audioContext.createBuffer(2, this.buffer.duration*MAX_ALPHA*44100, 44100);

          this.setupScriptProcessor()

  }

    setupScriptProcessor() {
    var audioContext = this.audioContext;


        if (audioContext.createScriptProcessor) {
            this.scriptNode = audioContext.createScriptProcessor(1024*4);
        } else {
            this.scriptNode = audioContext.createJavaScriptNode(1024*4);
        }

        this.scriptNode.connect(this.outputNode);



      this._newPosition = 0;//this.source.loopStart*44100;//((this.ac.currentTime - this.lastPlay) * this.playbackRate).mod(this.source.loopEnd -this.source.loopStart);



      //this._pv.position = 0;//this.source.loopStart*44100;//this._newPosition; 

      var my = this;
      var pv_info = {};
      this.scriptNode.onaudioprocess = function(e) {

        for (var i=0;i<2;i++) {
        if (my._canPlay) {
            

          //my._pv.position = my._newPosition;
          //my._pv.position = (my._pv.position)% ( 10*44100 - 13*44100);
          my._pv.set_bounds(my._pv.position, my._pv.position+1024*4);
          pv_info = my._pv.process(my.renderbuffer);
          var il = my.renderbuffer.getChannelData(0); 
          var ir = my.renderbuffer.getChannelData(1);
          var ol = my.outputbuffer.getChannelData(0);
          var or = my.outputbuffer.getChannelData(1);
          ol.set(il, my._pv.position*my._pv.alpha);
          or.set(ir, my._pv.position*my._pv.alpha);
          
        } else {
          //console.log("DoneAudio!");
        }


      }

      }
  }

  /**
   * Get buffer duration (excluding wrapAroundExtension)
   * @return {Number} current buffer duration
   */
  get bufferDuration() {
    if (this.buffer) {
      var bufferDuration = this.buffer.duration;

      if (this.wrapAroundExtension)
        bufferDuration -= this.wrapAroundExtension;

      return bufferDuration;
    }

    return 0;
  }

  // TimeEngine attribute
  get currentPosition() {
    var master = this.master;

    if (master && master.currentPosition !== undefined)
      return master.currentPosition;

    return this.position;
  }

  // TimeEngine method (scheduled interface)
  advanceTime(time) {
    time = Math.max(time, this.audioContext.currentTime);
    return time + this.trigger(time);
  }

  /**
   * Trigger a grain
   * @param {Number} time grain synthesis audio time
   * @return {Number} period to next grain
   *
   * This function can be called at any time (whether the engine is scheduled or not)
   * to generate a single grain according to the current grain parameters.
   */
  trigger(time) {
    var audioContext = this.audioContext;
    var grainTime = time || audioContext.currentTime;
    var grainPeriod = this.periodAbs;
    var grainPosition = this.currentPosition;
    var grainDuration = this.durationAbs;

    if (this.buffer) {
      var resamplingRate = 1.0;

      // calculate resampling
      if (this.resampling !== 0 || this.resamplingVar > 0) {
        var randomResampling = (Math.random() - 0.5) * 2.0 * this.resamplingVar;
        resamplingRate = Math.pow(2.0, (this.resampling + randomResampling) / 1200.0);
      }

      grainPeriod += this.periodRel * grainDuration;
      grainDuration += this.durationRel * grainPeriod;

      // grain period randon variation
      if (this.periodVar > 0.0)
        grainPeriod += 2.0 * (Math.random() - 0.5) * this.periodVar * grainPeriod;

      // center grain
      if (this.centered)
        grainPosition -= 0.5 * grainDuration;

      // randomize grain position
      if (this.positionVar > 0)
        grainPosition += (2.0 * Math.random() - 1) * this.positionVar;

      var bufferDuration = this.bufferDuration;

      // wrap or clip grain position and duration into buffer duration
      if (grainPosition < 0 || grainPosition >= bufferDuration) {
        if (this.cyclic) {
          var cycles = grainPosition / bufferDuration;
          grainPosition = (cycles - Math.floor(cycles)) * bufferDuration;

          if (grainPosition + grainDuration > this.buffer.duration)
            grainDuration = this.buffer.duration - grainPosition;
        } else {
          if (grainPosition < 0) {
            grainTime -= grainPosition;
            grainDuration += grainPosition;
            grainPosition = 0;
          }

          if (grainPosition + grainDuration > bufferDuration)
            grainDuration = bufferDuration - grainPosition;
        }
      }

      // make grain
      if (this.gain > 0 && grainDuration >= 0.001) {
        // make grain envelope
        var envelope = audioContext.createGain();
        var attack = this.attackAbs + this.attackRel * grainDuration;
        var release = this.releaseAbs + this.releaseRel * grainDuration;

        if (attack + release > grainDuration) {
          var factor = grainDuration / (attack + release);
          attack *= factor;
          release *= factor;
        }

        var attackEndTime = grainTime + attack;
        var grainEndTime = grainTime + grainDuration;
        var releaseStartTime = grainEndTime - release;

        envelope.gain.value = 1;

        if (this.attackShape === 'lin') {
          envelope.gain.setValueAtTime(0.0, grainTime);
          envelope.gain.linearRampToValueAtTime(this.gain, attackEndTime);
        } else {
          envelope.gain.setValueAtTime(this.expRampOffset, grainTime);
          envelope.gain.exponentialRampToValueAtTime(this.gain, attackEndTime);
        }

        if (releaseStartTime > attackEndTime)
          envelope.gain.setValueAtTime(this.gain, releaseStartTime);

        if (this.releaseShape === 'lin') {
          envelope.gain.linearRampToValueAtTime(0.0, grainEndTime);
        } else {
          envelope.gain.exponentialRampToValueAtTime(this.expRampOffset, grainEndTime);
        }


        envelope.connect(this.outputNode);

        




        // make source
        var source = audioContext.createBufferSource();

        source.buffer = this.outputbuffer;

        source.playbackRate.value = resamplingRate;
        source.connect(envelope);






        this._canPlay = true;

          


        //this._newPosition = Math.round(grainPosition*44100);



        source.start(grainTime, grainPosition*1);
        source.stop(grainTime + grainDuration / resamplingRate);




      }
    }

    return grainPeriod;
  }
}

module.exports = MyEngine;