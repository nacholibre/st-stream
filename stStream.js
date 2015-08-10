'use strict';

var util = require('util');
var stream = require('stream');
var duplexer = require('duplexer');
var through2 = require('through2');
var byline = require('byline');

var self;
var realEnd = null;
function StStream(inStreams) {
    self = this;

    this.streams = [];

    inStreams = inStreams || [];

    if (inStreams.length) {
        inStreams.forEach(this.appendStream.bind(this));
    }

    this.allStreams = inStreams;

    StStream.super_.call(this, {objectMode: true});

    this.endedStreams = 0;

    //this.removeAllListeners('finish');

    //this.on('finish', function() {
    //    console.log('Finished writing stuff!!');
    //});

    //self.on('end', function() {
    //    console.log('eeeended');
    //    //mystream.end();
    //});
}

util.inherits(StStream, stream.Duplex);

realEnd = StStream.prototype.end;

//ConcurrentDuplex.prototype.end = function() {
//    stream.Duplex.end.bind(this);
//    //this.emit('end');
//};

//ConcurrentDuplex.prototype._flush = function(done) {
//    console.log('flush');
//};

StStream.prototype.end = function(chunk, encoding, cb) {
    //var streamsCount = this.allStreams.length;

    //send message to end
    this.allStreams.forEach(function(stream) {
        stream.write(JSON.stringify({noMoreDataComing: true}) + '\n');
        //stream.on('end', function() {
        //});
        //console.log(stream);
    });

    var finishInterval = setInterval(function() {
        //console.log(self.endedStreams);
        if (self.endedStreams === self.streams.length) {
            realEnd.bind(self)(chunk, encoding, cb);
            clearInterval(finishInterval);
        }
    }, 100);
};

StStream.prototype._read = function() {
    if (self.endedStreams === self.streams.length) {
        this.push(null);
    }
    //console.log('read');
    //this.read();
};

StStream.prototype._getAvailableStream = function() {
    if (this.streams.length) {
        return this.streams.shift();
    } else {
        return false;
    }
};

StStream.prototype.appendStream = function(stream) {
    this.streams.push(stream);
    this._attachEventToStream(stream);
};

StStream.prototype._attachEventToStream = function(mystream) {
    var lineStream = new byline.LineStream();

    var dest = mystream.pipe(lineStream).on('data', function(data) {
        self.push(JSON.parse(data));
        //self.nextTransform();
    });

    //mystream.on('end', function() {
    //    console.log('stream ended');
    //});

    dest.on('finish', function() {
        //console.log('stream finished');
        self.endedStreams++;

        //if (self.endedStreams === self.streams.length) {
        //    self.push(null);

        //    //self.flushDone();
        //}
    });
};

StStream.prototype._write = function(data, e, next) {
    var stream = this._getAvailableStream();
    //console.log('write data');

    var preparedJSONData = JSON.stringify(data) + '\n';

    if (!stream) {
        //check every 100ms for available stream
        var streamAvailableInterval = setInterval(function() {
            var newStream = self._getAvailableStream();

            if (newStream) {
                newStream.write(preparedJSONData);
                self.streams.push(newStream);
                clearInterval(streamAvailableInterval);
                next();
            }
        }, 100);
    } else {
        var writed;

        if (typeof data !== 'object') {
            throw new Error('write accepts only objects');
        }

        writed = stream.write(preparedJSONData);

        if (writed) {
            this.streams.push(stream);
        } else {
            stream.once('drain', function() {
                self.streams.push(stream);
            });
        }

        next();
    }
};

//module.exports = StStream;

module.exports.combine = function(streams) {
    return new StStream(streams);
};

module.exports.transform = function(func, noMoreDataCB) {
    //input is line separated JSON objects
    //func takes object and outputs transformed object
    //output is line separated JSON encoded strings

    var lineStream = new byline.LineStream();

    var doneAll = function() {
        lineStream.push(null);
    };

    var trf2 = through2.obj(function(data, enc, done) {
        var parsed = JSON.parse(data);

        if (parsed.noMoreDataComing) {
            if (noMoreDataCB) {
                noMoreDataCB(doneAll);
            } else {
                doneAll();
            }
        } else {
            this.push(parsed);
        }

        done();
    });

    //lineStream.on('data', function(d) {
    //    console.log(d.toString());
    //});

    var trf3 = through2.obj(function(data, enc, done) {
        this.push(JSON.stringify(data)+'\n');
        done();
    });

    var mytrf = through2.obj(func);

    var dest = lineStream.pipe(trf2).pipe(mytrf).pipe(trf3);

    var returnedStream = duplexer(lineStream, dest);

    returnedStream.pause = function() {
        lineStream.pause();
    };

    returnedStream.resume = function() {
        lineStream.resume();
    };

    return returnedStream;
};
