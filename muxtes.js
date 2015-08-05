'use strict';

var MuxDemux = require('mux-demux')
var http = require('http')
var request = require('request')


http.createServer(function (req, res) {

    req.pipe(MuxDemux(function(stream) {
        stream.on('data', function(data) {
            console.log(data);
        });
    })).pipe(req);

  //var mdm2 = MuxDemux()
  //mdm2.on('connection', function (stream) {
  //  stream.on('data', function (date) {
  //    console.log(date)
  //  })
  //})
  //req.pipe(mdm2).pipe(res)

}).listen(8642, function () {

  var mdm1 = MuxDemux()
  var con = request({uri: 'http://localhost:8642', method: 'POST'})
  con.pipe(mdm1).pipe(con)
  var ds = mdm1.createWriteStream('times')

  setInterval(function () {
    ds.write({date: new Date().toString()})
  }, 1e3)

})
