'use strict';
self.importScripts('PV.js', 'complex.js', 'real.js');

////////////////////////////////////////////////////////
//PhaseVocoder.js



var BUFFER_SIZE = 1024*4;

//var context = new webkitAudioContext();

//var g_buffer = context.createBuffer(2, BUFFER_SIZE, context.sampleRate);

//var node1 = context.createScriptProcessor(BUFFER_SIZE, 2, 2);
//var node2 = context.createScriptProcessor(BUFFER_SIZE, 2, 2);

var alpha = 1; var position = 0; var position2 = 0; var outpos = 0;

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


self.onmessage = function(e) {
  console.log(e.data[0]);
  position = 0;
  outpos = 0;
  var source = e.data;
  var endData = 0;
  setAlpha(2);

              var il = source[0];//source.buffer.getChannelData(0);
            var ir = source[1];//.buffer.getChannelData(1);
            var buf_size = Math.floor(source[0].length*alpha/4)*4;
            //var buffer1 = new ArrayBuffer(source[0].length); // Make it a little bigger just in case
            var ol = new Float32Array(buf_size);
            //var buffer2 = new ArrayBuffer(source[1].length); // Make it a little bigger just in case
            var or = new Float32Array(buf_size);

    while (position < source[0].length ) { // source.buffer.duration*alpha-1) {
            //console.log(position/44100 +" : " + outpos/44100 + "  ( " + (source[0].length / 44100) / 2 + " )");


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
                
                var l = outBufferL1.splice(0,BUFFER_SIZE);
                var r = outBufferR1.splice(0,BUFFER_SIZE);
                
                endData = outpos+l.length - ol.length;

                if ( endData < 0) {
                    ol.set(l, outpos );
                    or.set(r, outpos );
                    outpos += BUFFER_SIZE;
                } else {
                    ol.set(l.splice(0,BUFFER_SIZE-endData), outpos );
                    or.set(r.splice(0,BUFFER_SIZE-endData), outpos );

                    console.log("EndData : " +endData)
                    break;
                }




        };

        postMessage([ol, or]);
        self.close();

}

