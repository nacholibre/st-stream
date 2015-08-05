'use strict';

var ConcurrentStream = require('./concurrentStream.js');
var stream = require('stream');
var net = require('net');
var sinon = require('sinon');
var assert = require('assert');

describe.only('Concurrent Stream', function() {
    it('should send and receive', function(done) {
        var receiveCB = sinon.spy();
        //var endCB = sinon.spy();

        //var stream1 = crateLocalTransformStream('stream1');
        //var stream2 = crateLocalTransformStream('stream2');

        var transform1 = ConcurrentStream.transform(function(data, enc, done) {
            data.msg = data.msg + ':stream1';
            this.push(data);
            done();
        });

        var transform2 = ConcurrentStream.transform(function(data, enc, done) {
            data.msg = data.msg + ':stream2';
            this.push(data);
            done();
        });

        var cs = new ConcurrentStream([transform1, transform2]);

        //var dummyPass = new stream.PassThrough({objectMode: true});
        var dummyPass = new stream.PassThrough({objectMode: true});

        dummyPass.pipe(cs).on('data', function(data) {
            receiveCB(data);
        }).on('finish', function() {
            console.log('ENDED');
            assert(receiveCB.calledWith({'msg': 'hello:stream1'}) === true);
            assert(receiveCB.calledWith({'msg': 'hello2:stream2'}) === true);
            assert(receiveCB.calledWith({'msg': 'hello3:stream1'}) === true);

            sinon.assert.callCount(receiveCB, 3);
            done();
        });

        dummyPass.write({'msg': 'hello'});
        dummyPass.write({'msg': 'hello2'});
        dummyPass.write({'msg': 'hello3'});
        dummyPass.end();
    });

    it('should send and receive over network', function(done) {
        var receiveCB = sinon.spy();

        var server1 = net.createServer(function(data) {
            data.pipe(ConcurrentStream.transform(function(obj, e, done) {
                obj.msg = obj.msg + ':server1';
                this.push(obj);
                data.end();

                done();
            })).pipe(data);
        });
        server1.listen(3001);

        var server2 = net.createServer(function(data) {
            data.pipe(ConcurrentStream.transform(function(obj, e, done) {
                obj.msg = obj.msg + ':server2';
                this.push(obj);
                data.end();

                done();
            })).pipe(data);
        });
        server2.listen(3002);

        var client1 = net.connect(3001);
        var client2 = net.connect(3002);

        var cs = new ConcurrentStream([client1, client2]);

        var dummyPass = new stream.PassThrough({objectMode: true});

        dummyPass.write({'msg': 'hello'});
        dummyPass.write({'msg': 'hello2'});
        dummyPass.end();

        cs.on('finish', function() {
            console.log('FINISH EVENT FIRED');
        });

        cs.on('end', function() {
            console.log('END EVENT FIRED');
        });

        dummyPass.pipe(cs).on('data', function(data) {
            console.log(data);
            receiveCB(data);
        }).on('end', function() {
            console.log('ENDED');
            sinon.assert.calledWith(receiveCB, { msg: 'hello:server1' });
            sinon.assert.calledWith(receiveCB, { msg: 'hello2:server2' });

            sinon.assert.callCount(receiveCB, 2);

            done();
        });
    });
});
