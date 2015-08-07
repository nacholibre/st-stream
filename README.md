# st-stream
```javascript
var stStream = require('st-stream');

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
    console.log('All done');
});
```


Output

    { msg: 'hello - first transform' }
    { msg: 'hello2 - second transform' }
    { msg: 'hello3 - first transform' }
    All done
