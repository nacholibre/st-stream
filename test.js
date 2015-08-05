'use strict';

var stream = require('stream');
var through2 = require('through2');

var pass = new stream.PassThrough();

var dest = pass.pipe(through2.obj(function(obj, enc, done) {
    console.log('here1');
    this.push(JSON.parse(obj));
    done();
})).pipe(through2.obj(function(obj, enc, done) {
    console.log('here2');
    this.push(obj);
    done();
}));

pass.write(JSON.stringify({'hello': 'world'}));

dest.on('data', function(data) {
    console.log(data);
});
