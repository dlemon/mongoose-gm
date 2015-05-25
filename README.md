![alt tag](https://travis-ci.org/dlemon/mongoose-gridstore.svg?branch=master) [![NPM version][npm-version-image]][npm-url]  [![MIT License][license-image]][license-url] [![NPM downloads][npm-downloads-image]][npm-url]

# mongoose-gm
Promise based mongoose plugin for storing/manipulating images in gridstore.

## Installation

```shell
npm install mongoose-gm
```

## Usage
This module is an extension to mongoose-gridstore. This release offers automatic resizing of images, and adds the resized buffers to the attachment.

### mongoose-gridstore
All functionality of mongoose-gridstore is inherited. Full API of mongoose-gridstore is added to your schema. See the mongoose-gridstore README.

### gm
This module depends on gm, which in turn depends on the imagemagick CLI installed. Without it, it does not work. See the gm README.

## Example

This is a full example mixing in the mongoose-gridstore API. 
Loading of document buffers is not shown in this example.

```javascript
var mongoose  = require('mongoose');
var gm = require('mongoose-gm');

var kittenSchema = new mongoose.Schema({
    name: {type:String, default:''}
});

var options = {
    resize: {
        thumbnail: { 
            width: 256,
            height: 256
        },            
        full: {
            width: 1600 //maintain aspect ratio
        }
    },
    
    keys: ['isKittenLicense']
};

kittenSchema.plugin(gm, options);
var Kitten = mongoose.model('Kitten', kittenSchema);
var kitten = new Kitten();

kitten.addAttachment('license.pdf', licenseBuffer)
.then(kitten.addImage('kitten.jpg', imageBuffer).bind(kitten))
.then(function(doc) {       
    doc.attachments.forEach(function(attachment) {            
        if (attachment.name == 'license.pdf') {
            attachment.isKittenLicense = true;  //example of extra keys supplied in options.
        }
        console.log(attachment);
    });       

    return true;
})
.then(kitten.save.bind(kitten))
.then(kitten.load.bind(kitten)) //must be called after a save or query (see below)
.catch(function(err) {
    throw err;
})
.done();


Kitten.find({}, function(err,docs) {
    //since mongoose middle ware does not allow post manipulation you need to load your
    //attachments explicitly after a save or query.   
    docs.forEach(function(doc) {
        doc.load()
        .catch(function(err) {
            throw err;
        })
        .done();
    });    
});
```

## Schema Decoration
```javascript
var mongoose  = require('mongoose');
var gm = require('mongoose-gm');

var kittenSchema = new mongoose.Schema({
    name: {type:String, default:''}
});

kittenSchema.plugin(gm);
var Kitten = mongoose.model('Kitten', kittenSchema);
```

### plugin options
Automatic resizing and storing of resized images is supported by the option resize:

```javascript
var mongoose  = require('mongoose');
var gm = require('mongoose-gm');

var kittenSchema = new mongoose.Schema({
    name: {type:String, default:''}
});

var options = {
    resize: {
        small: { 
            width: 256,
            height: 256
        },            
        medium: {
            width: 1600 //resize with aspect ratio of original image
        }
    }
};

kittenSchema.plugin(gm, options);
```

### resized images
Resized images are automatically stored in your attachment with the specified keys in resize options:

```javascript
fs.readFile('kitten.jpg', function (err, data) {
    if (err) throw err;
    var kitten = new Kitten();
    kitten.addImage('kitten.jpg', data)
    .then(function(doc) {
        doc.attachments.forEach(function(attachment) {
            if (attachment.filename == 'kitten.jpg') {
                console.log(attachment.small);  //buffer containing small resized image
                console.log(attachment.medium); //buffer containing medium resized image
            }
        });
    });  
    .catch(function(err) {
        throw err;
    })
    .done();
});

### Image meta data
Image meta data is automatically stored as property in the attachment:

```javascript
fs.readFile('kitten.jpg', function (err, data) {
    if (err) throw err;
    var kitten = new Kitten();
    kitten.addImage('kitten.jpg', data)
    .then(function(doc) {
        doc.attachments.forEach(function(attachment) {
            if (attachment.filename == 'kitten.jpg') {
                console.log(attachment.metadata);
            }
        });
    })
    .catch(function(err) {
        throw err;
    })
    .done();
});
```

## API
The module decorates your schema with the following functions:

### addImage(name,buffer)
Add an attachment with name and buffer. The image and resized images as specified in the options of the plugin are stored in gridstore.

```javascript
var kitten = new Kitten();

kitten.addImage('kitten.jpg', data)
.then(kitten.save.bind(kitten))
.then(kitten.loadAttachments)   //mongoose-gridstore inherited function.
.then(function(doc) {
    doc.attachments.forEach(function(attachment) {
        if (attachment.filename == 'kitten.jpg') {
            console.log('metadata', attachment.metadata);
            console.log('image buffer', attachment.buffer);
            console.log('image mimetype', attachment.mimetype);
            console.log('image name', attachment.filename);
            console.log('Thumbnail buffer, if specified in options.resize', attachment.resize.thumbnail);
        }
    });
})
.catch(function(err) {
    throw err;
})
.done();
```

### updateImage(name,buffer)
Update an attachment with name with the new buffer. The image and resized images as specified in the options of the plugin are stored in gridstore.

```javascript
kitten.updateImage('kitten.jpg', data)
.then(function(doc) {
    doc.attachments.forEach(function(attachment) {
        console.log(attachment);
    });
})
.catch(function(err) {
    throw err;
})
.done();
```

### removeImage(name)
Remove the image from the attachments and gridstore.

```javascript
kitten.removeImage('kitten.jpg')
.then(function(doc) {
    doc.attachments.forEach(function(attachment) {
        console.log(attachment);
    });
})
.catch(function(err) {
    throw err;
})
.done();
```

### load()
Load all attachments including images from the gridstore

```javascript
kitten.load()
.then(function(doc) {
    doc.attachments.forEach(function(attachment) {
        console.log(attachment);
    });
})
.catch(function(err) {
    throw err;
})
.done();
```

### Test
Above scenarios have been tested and can be found in the test directory of the node module. 
You can verify the package by executing mocha test in the root of the module.

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: license.txt

[npm-url]: https://npmjs.org/package/mongoose-gm
[npm-version-image]: https://img.shields.io/npm/v/mongoose-gm.svg?style=flat
[npm-downloads-image]: https://img.shields.io/npm/dm/mongoose-gm.svg?style=flat
