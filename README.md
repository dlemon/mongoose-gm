![alt tag](https://travis-ci.org/dlemon/mongoose-gm.svg?branch=master) [![NPM version][npm-version-image]][npm-url]  [![MIT License][license-image]][license-url] [![NPM downloads][npm-downloads-image]][npm-url]

# mongoose-gm
Promise based mongoose plugin for storing/manipulating images in gridstore.

## Installation

```shell
npm install mongoose-gm
```

## Usage
This module is an extension to mongoose-gridstore. This release offers automatic resizing of images, and adds it as attachment to the schema.

### mongoose-gridstore
All functionality of mongoose-gridstore is inherited. Full API of mongoose-gridstore is added to your schema. See the mongoose gridstore README.md for the API.

### imagemagick
This module depends on imagemagick, which in turn depends on the imagemagick CLI installed. Without it, it does not work. See the README.md of imagemagick for details.

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
        //any imagemagick option can be filled in.
        //srcPath, dstPath is *not* required since we are manipulating db images.
        thumbnail: { 
            quality: 0.8,
            format: 'jpg',
            progressive: false,
            width: 256,
            height: 256,
            strip: true,
            filter: 'Lagrange',
            sharpening: 0.2
        },            
        full: {
            quality: 1.0,
            format: 'jpg',
            progressive: false,
            width: 1600,
            strip: true,
            filter: 'Lagrange',
        }
    }
}

kittenSchema.plugin(gm, options);
var Kitten = mongoose.model('Kitten', kittenSchema);

var kitten = new Kitten();

kitten.addImage('kitten.jpg', data)
    .then(function(doc) {
        doc.attachments.forEach(function(attachment) {
            if (attachment.filename == 'kitten.jpg') {
                // attachment.buffer contains the original image
                // attachment.resize.thumbnail contains the buffer with the resized thumbnail options
                // attachment.resize.full contains the buffer with the resized full options
            }
        });
    });
```

### automatic metadata
Metadata of the image is automatically stored as property in the attachment:

```javascript
var kitten = new Kitten();

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
        });  
    });
});
```

## API
The module decorates your schema with the following functions:

### addImage(name,buffer)
Add an attachment with name and buffer. The image and resized images as specified in the options of the plugin are stored in gridstore.

```javascript
var kitten = new Kitten();

kitten.addImage('kitten.jpg', data)
    .then(function(doc) {
        return kitten.save();        
    })
    .then(kitten.loadAttachments)   //mongoose-gridstore inherited function.
    .then(function(doc) {
        doc.attachments.forEach(function(attachment) {
            if (attachment.filename == 'kitten.jpg') {
                console.log(attachment.metadata);
                console.log('my image buffer', attachment.buffer);
                console.log('my image mimetype', attachment.mimetype);
                console.log('my filename', attachment.filename);
                console.log('my thumbnail buffer, if specified in options', attachment.resize.thumbnail);
            }
        });
    })
    .catch(function(err) {
        throw err;
    });
```

### updateImage(name,buffer)
Update an attachment with name with the new buffer. The image and resized images as specified in the options of the plugin are stored in gridstore.

```javascript
var kitten = new Kitten();

kitten.updateImage('kitten.jpg', data)
    .then(function(doc) {
        doc.attachments.forEach(function(attachment) {
            if (attachment.filename == 'kitten.jpg') {
                console.log(attachment.metadata);
                console.log('my image buffer', attachment.buffer);
                console.log('my image mimetype', attachment.mimetype);
                console.log('my filename', attachment.filename);
                console.log('my thumbnail buffer, if specified in options', attachment.resize.thumbnail);
            }
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
var kitten = new Kitten();

kitten.removeImage('kitten.jpg')
    .then(function(doc) {
        return kitten.save();        
    })
    .catch(function(err) {
        throw err;
    })
    .done();
```

## Example

This is a full example mixing in the mongoose-gridstore API. 
Loading of document buffers is not shown in this example!

```javascript
var mongoose  = require('mongoose');
var gm = require('mongoose-gm');

var kittenSchema = new mongoose.Schema({
    name: {type:String, default:''}
});

var options = {
    resize: {
        //any imagemagick option can be filled in.
        //srcPath, dstPath is *not* required since we are manipulating db images.
        thumbnail: { 
            quality: 0.8,
            format: 'jpg',
            progressive: false,
            width: 256,
            height: 256,
            strip: true,
            filter: 'Lagrange',
            sharpening: 0.2
        },            
        full: {
            quality: 1.0,
            format: 'jpg',
            progressive: false,
            width: 1600,
            strip: true,
            filter: 'Lagrange',
        }
    },
    
    keys: ['isKittenLicense']
}

kittenSchema.plugin(gm, options);
var Kitten = mongoose.model('Kitten', kittenSchema);
var kitten = new Kitten();

kitten.addAttachment('license.pdf', licenseBuffer)
    .then(kitten.addImage('kitten.jpg', imageBuffer))
    .then(function(doc) {       
        doc.attachments.forEach(function(attachment) {            
            if (attachment.name == 'license.pdf') {
                attachment.isKittenLicense = true;  //example of extra keys supplied in options.
            }
            console.log(attachment);
        });       

        return true;
    })
    .then(kitten.save)
    .then(kitten.loadAttachments) //must be called after a save or query (see below)
    .catch(function(err) {
        throw err;
    })
    .done();


Kitten.find({}, function(err,docs) {
    //since mongoose middle ware does not allow post manipulation you need to load your
    //attachments explicitly after a save or query!
    
    docs.forEach(function(doc) {
        doc.loadAttachments().done();
    });    
});
```

## Test
This module contains mocha tests in the test directory that includes a test of the example.

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: license.txt

[npm-url]: https://npmjs.org/package/mongoose-gm
[npm-version-image]: https://img.shields.io/npm/v/mongoose-gm.svg?style=flat
[npm-downloads-image]: https://img.shields.io/npm/dm/mongoose-gm.svg?style=flat
