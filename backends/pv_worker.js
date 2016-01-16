'use strict';
self.importScripts('complex.js', 'real.js', 'PV_fast.js');

var BUFFER_SIZE = 2048;
var div = 1;
var sample_rate = 44100;
var pvL = new PhaseVocoder(BUFFER_SIZE/div, sample_rate); pvL.init();
var pvR = new PhaseVocoder(BUFFER_SIZE/div, sample_rate); pvR.init();
var pv3 = new PhaseVocoder(BUFFER_SIZE/div, sample_rate); pv3.init();
var audioDataL = [];
var audioDataR = [];
var myInterval;
var outBufferL = [];
var outBufferR = [];
var position = 0;
var alphas = [];
var last_alpha = 1;

/*
 * Message format: [type, channel, op-data1, ..., op-dataN] 
 */
onmessage = function(e) {
    var type = e.data.type;
    // console.log(e);

    if (type=="set-alpha") {

        alphas.push(e.data.alpha);
        console.log("added new alpha: " + e.data.alpha);

    } else if (type=="play") {
          var endData = 0;
            var outpos = 0;
            var buf_size = Math.floor(audioDataL.length*last_alpha);
            //var buffer1 = new ArrayBuffer(source[0].length); // Make it a little bigger just in case
            var ol = new Float32Array(buf_size*2);
            //var buffer2 = new ArrayBuffer(source[1].length); // Make it a little bigger just in case
            var or = new Float32Array(buf_size*2);

        //myInterval = setInterval(function () {
            console.log("bugsize="+buf_size)
        while (outpos < buf_size*2) {
            // console.log("processing");

            do {
                if (alphas.length!=0) {
                    last_alpha = alphas.splice(0,1)[0];
                    console.log("using new alpha: " + last_alpha);
                }
                pvL.set_alpha(last_alpha);
                pvR.set_alpha(last_alpha);

                var bufL = new Float32Array(BUFFER_SIZE);
                var bufR = new Float32Array(BUFFER_SIZE);
                bufL = audioDataL.subarray(position, position+BUFFER_SIZE);
                bufR = audioDataR.subarray(position, position+BUFFER_SIZE);

                position += pvL.get_analysis_hop();

                // Process left input channel
                outBufferL = outBufferL.concat(pvL.process(bufL));

                // Process right input channel
                outBufferR = outBufferR.concat(pvR.process(bufR));

            } while(outBufferL.length < BUFFER_SIZE);

            //postMessage({
            //    left: outBufferL.splice(0,BUFFER_SIZE),
            //    right: outBufferR.splice(0,BUFFER_SIZE)
            //})
                var l = outBufferL.splice(0,BUFFER_SIZE);
                var r = outBufferR.splice(0,BUFFER_SIZE);
                
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

                console.log(position + " - " + outpos);

        //}, 1/(1024/sample_rate));
        }
        console.log("POOOOOOOOOSSSSTTT!!!");
        console.log(ol.length);
            postMessage({
                left: ol,//.slice(0,audioDataL.length*2),
                right: or//.slice(0,audioDataL.length*2)
            });

            self.close();


    } else if (type=="pause") {

        clearInterval(myInterval);

    } else if (type=="position") {

        outBufferL = [];
        outBufferR = [];
        position = 0;
        pvL.reset_phases_and_overlap_buffers();
        pvR.reset_phases_and_overlap_buffers();

    } else {

        audioDataL = new Float32Array(e.data.left);
        audioDataR = new Float32Array(e.data.right);
        console.log("loaded into the worker");

    }
}