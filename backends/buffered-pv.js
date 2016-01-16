function BufferedPV(frameSize) {

    var _frameSize = frameSize || 4096;
    var _pvL = new PhaseVocoder(_frameSize, 44100); _pvL.init();
    var _pvR = new PhaseVocoder(_frameSize, 44100); _pvR.init();
    var _bufferL, _bufferR;
    var _loopStart, _loopEnd;
    var _position = 0;
    var _newAlpha = 1;

    var _midBufL = new CBuffer(Math.round(_frameSize * 2));
    var _midBufR = new CBuffer(Math.round(_frameSize * 2));

    

    this.process = function(outputAudioBuffer) {

        if (!_bufferL || !_bufferR) 
            return;

        var sampleCounter = 0;

        var il = _bufferL;
        var ir = _bufferR;
        var ol = outputAudioBuffer.getChannelData(0);
        var or = outputAudioBuffer.getChannelData(1);


        while (_midBufR.size > 0 && sampleCounter < outputAudioBuffer.length) {
          var i = sampleCounter++;
          ol[i] = _midBufL.shift();
          or[i] = _midBufR.shift();
        }
        
        if (sampleCounter == outputAudioBuffer.length)
          return;

        do {

          var bufL = il.subarray(_position, _position + _frameSize);
          var bufR = ir.subarray(_position, _position + _frameSize);


          if (_newAlpha != undefined && _newAlpha != _pvL.get_alpha()) {
            _pvL.set_alpha(_newAlpha);
            _pvR.set_alpha(_newAlpha);
            _newAlpha = undefined;
          }

          /* LEFT */
          _pvL.process(bufL, _midBufL);
          _pvR.process(bufR, _midBufR);



          for (var i=sampleCounter; _midBufL.size > 0 && i < outputAudioBuffer.length; i++) {
            ol[i] = _midBufL.shift();
            or[i] = _midBufR.shift();
          }

          sampleCounter += _pvL.get_synthesis_hop();

          _position += _pvL.get_analysis_hop();
          

        } while (sampleCounter < outputAudioBuffer.length && _position + _frameSize < _loopEnd);
          
          if (_position + _frameSize >= _loopEnd) { 
            // Return the amount to skip when looping when in/out buffers differ in size.
             return { msg: 'done', buf_delta: Math.round(_position + _frameSize - _loopEnd)} 
          }; 

    }
    this.set_bounds = function(loopStart, loopEnd) {
        _position = loopStart;
        _loopStart = loopStart;
        _loopEnd = loopEnd;
    }

    this.set_audio_buffer = function(newBuffer) {

        _bufferL = newBuffer.getChannelData(0);
        _bufferR = newBuffer.getChannelData(0);
        _position = 0;
        _loopStart = 0;
        _loopEnd = newBuffer.duration;

        
    }

    Object.defineProperties(this, {
        'position' : {
            get : function() {
                return _position;
            }, 
            set : function(newPosition) {
                _position = newPosition;
            }
        }, 
        'alpha' : {
            get : function() {
                return _pvL.get_alpha();
            }, 
            set : function(newAlpha) {
                _newAlpha = newAlpha;
            }
        }



    });
}