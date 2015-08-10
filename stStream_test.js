'use strict';

var sinon = require('sinon');
var net = require('net');
var stStream = require('./stStream.js');

describe('st stream main tests', function() {
    it('should send and transform data from local stream', function(doneTest) {
        var dataSpy = sinon.spy();

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
            dataSpy(objData);
        }).on('finish', function() {
            sinon.assert.calledWith(dataSpy, {msg: 'hello - first transform'});
            sinon.assert.calledWith(dataSpy, {msg: 'hello2 - second transform'});
            sinon.assert.calledWith(dataSpy, {msg: 'hello3 - first transform'});
            sinon.assert.calledThrice(dataSpy);
            doneTest();
        });
    });

    it.skip('should send and receive on multiple network streams', function(doneTest) {
        var dataSpy = sinon.spy();

        var server1 = net.createServer(function(data) {
            var transformStream = stStream.transform(function(obj, e, done) {
                obj.msg = obj.msg + ':server1';
                this.push(obj);
                done();
            });

            data.pipe(transformStream).pipe(data);
        });
        server1.listen(3001);

        var client1 = net.connect(3001);

        var server2 = net.createServer(function(data) {
            var transformStream = stStream.transform(function(obj, e, done) {
                obj.msg = obj.msg + ':server2';
                this.push(obj);
                done();
            });

            data.pipe(transformStream).pipe(data);
        });
        server2.listen(3002);

        var client2 = net.connect(3002);

        var cd = stStream.combine([client1, client2]);

        cd.write({'msg': 'hello'});
        cd.write({'msg': 'hello2'});
        cd.write({'msg': 'hello3'});
        cd.end();

        var receivedDataServers = {};
        cd.on('data', function(d) {
            var splitted = d.msg.split(':');
            dataSpy(d);
        }).on('finish', function() {
            sinon.assert.calledWith(dataSpy, {msg: 'hello:server1'});
            sinon.assert.calledWith(dataSpy, {msg: 'hello2:server1'});
            sinon.assert.calledWith(dataSpy, {msg: 'hello3:server1'});
            sinon.assert.calledThrice(dataSpy);

            doneTest();
        });
    });

    it('should send and receive over network stream', function(doneTest) {
        var dataSpy = sinon.spy();

        //var transform1 = stStream.transform(function(data, enc, done) {
        //    data.msg = data.msg + ':stream1';
        //    this.push(data);
        //    done();
        //});

        var server1 = net.createServer(function(data) {
            var transformStream = stStream.transform(function(obj, e, done) {
                obj.msg = obj.msg + ':server1';
                this.push(obj);
                done();
            });

            data.pipe(transformStream).pipe(data);
        });
        server1.listen(3001);

        var client1 = net.connect(3001);

        var cd = stStream.combine([client1]);

        cd.write({'msg': 'hello'});
        cd.write({'msg': 'hello2'});
        cd.write({'msg': 'hello3'});
        cd.end();

        cd.on('data', function(d) {
            dataSpy(d);
        }).on('finish', function() {
            sinon.assert.calledWith(dataSpy, {msg: 'hello:server1'});
            sinon.assert.calledWith(dataSpy, {msg: 'hello2:server1'});
            sinon.assert.calledWith(dataSpy, {msg: 'hello3:server1'});
            sinon.assert.calledThrice(dataSpy);

            doneTest();
        });
    });

    it('should end stream on stream.push(null)', function(doneTest) {
    });
});
