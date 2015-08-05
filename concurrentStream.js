'use strict';

var util = require('util');
var byline = require('byline');
var through2 = require('through2');
var stream = require('stream');
var duplexer = require('duplexer');
//var json = require('stream-serializer').json;

var self;
function ConcurrentStream(inStreams) {
    self = this;
    this.streams = [];

    inStreams = inStreams || [];

    if (inStreams.length) {
        inStreams.forEach(this.appendStream.bind(this));
    }

    this.attached = false;
    this.endedStreams = 0;

    ConcurrentStream.super_.call(this, {objectMode: true});

    this.removeAllListeners('finish');
    this.removeAllListeners('prefinish');

    //this.on('finish', function() {
    //    console.log('finito');
    //});
}

util.inherits(ConcurrentStream, stream.Transform);

//ConcurrentStream.prototype._flush = function(done) {
//    console.log('flush');
//    this.emit('prefinish');
//    this.emit('end');
//    done();
//};

ConcurrentStream.prototype._getAvailableStream = function() {
    if (this.streams.length) {
        return this.streams.shift();
    } else {
        return false;
    }
};

ConcurrentStream.prototype.appendStream = function(stream) {
    this.streams.push(stream);
    this._attachEventToStream(stream);
};

ConcurrentStream.prototype._attachEventToStream = function(mystream) {
    var lineStream = new byline.LineStream();

    mystream.pipe(lineStream).on('data', function(data) {
        self.push(JSON.parse(data));
    });

    lineStream.on('finish', function() {
        console.log('stream finished');
        self.endedStreams++;

        if (self.endedStreams === self.streams.length) {
            self.push(null);
            mystream.end();
            self.emit('finish');
            console.log('EMIT END');
        }
    });
};

ConcurrentStream.prototype._transform = function(data, encoding, next) {
    var stream = this._getAvailableStream();

    if (!stream) {
        //check every 100ms for available stream

        var interval = setInterval(function() {
            var newStream = self._getAvailableStream();

            if (newStream) {
                newStream.write(data);
                self.streams.push(newStream);
                clearInterval(interval);
                next();
            }
        }, 100);
    } else {
        var writed;

        if (typeof data !== 'object') {
            throw new Error('write accepts only objects');
        }

        writed = stream.write(JSON.stringify(data) + '\n');

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

module.exports = ConcurrentStream;

//module.exports.prepare = function(networkStream, transformStream) {
//    var lineStream = new byline.LineStream();
//
//    var toObject = through2.obj(function(chunk, enc, done) {
//        console.log('here1');
//        this.push(JSON.parse(chunk));
//        done();
//    });
//
//    var toText = through2.obj(function(chunk, enc, done) {
//        console.log('here2');
//        this.push(JSON.stringify(chunk) + '\n');
//        done();
//    });
//
//    return networkStream.pipe(lineStream).pipe(toObject).pipe(transformStream).pipe(toText).pipe(networkStream);
//};

module.exports.transform = function(func) {
    //input is line separated JSON objects
    //func takes object and outputs transformed object
    //output is line separated JSON encoded strings

    var lineStream = new byline.LineStream();

    var trf2 = through2.obj(function(data, enc, done) {
        this.push(JSON.parse(data));
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

    return duplexer(lineStream, dest);
};
