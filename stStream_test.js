'use strict';

var stream = require('stream');
//var through2 = require('through2');
var net = require('net');
var stStream = require('./stStream.js');
//var ConcurrentStream = require('./concurrentStream.js');

describe('Stream Duplex test', function() {
    it('should send and transform data', function(doneTest) {
        var transform1 = stStream.transform(function(obj, e, done) {
            obj.msg = obj.msg + ' - first transform';
            this.push(obj);
            done();
        });

        var transform2 = stStream.transform(function(obj, e, done) {
            obj.msg = obj.msg + ' - second transform';
            this.push(obj);
            done();
        });

        var myStream = stStream.combine([transform1, transform2]);

        myStream.write({msg: 'hello'});
        myStream.write({msg: 'hello2'});
        myStream.write({msg: 'hello3'});
        myStream.end();

        myStream.on('data', function(objData) {
            console.log(objData);
        }).on('finish', function() {
            doneTest();
        });
    });

    it('should test', function(doneTest) {
        var transform1 = stStream.transform(function(data, enc, done) {
            data.msg = data.msg + ':stream1';
            this.push(data);
            done();
        });

        var server1 = net.createServer(function(data) {
            var transformStream = stStream.transform(function(obj, e, done) {
                obj.msg = obj.msg + ':server1';
                this.push(obj);
                done();
            });

            data.pipe(transformStream).pipe(data);

            //setTimeout(function() {
            //    data.end();
            //}, 100);
        });
        server1.listen(3001);

        var client1 = net.connect(3001);

        var cd = stStream.combine([client1, transform1]);

        cd.write({'msg': 'hello'});
        cd.write({'msg': 'hello2'});
        cd.write({'msg': 'hello3'});
        cd.end();

        cd.on('data', function(d) {
            console.log('data received');
            console.log(d);
        }).on('finish', function() {
            console.log('finished');
            doneTest();
        });

        //dest.on('finish', function() {
        //    console.log('FINISH EVENT FIRED');
        //});

        //dest.on('end', function() {
        //    console.log('END EVENT FIRED');
        //});
    });
});
