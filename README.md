![alt tag](https://travis-ci.org/dlemon/mongoose-gridstore.svg?branch=master) [![NPM version][npm-version-image]][npm-url]  [![MIT License][license-image]][license-url] [![NPM downloads][npm-downloads-image]][npm-url]

# mongoose-gm
Promise based mongoose plugin for storing/manipulating base64 images in gridstore.

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

## Granularity
You have the ability to partially/fully load all images or do the same for a single image. 

## Schema Decoration
```javascript
var mongoose  = require('mongoose');
var mongooseGM = require('mongoose-gm');

var kittenSchema = new mongoose.Schema({
    name: {type:String, default:''}
});

kittenSchema.plugin(mongooseGM);
var Kitten = mongoose.model('Kitten', kittenSchema);
```

### plugin options
Automatic resizing and storing of resized images is supported by the option resize:

```javascript
var mongoose   = require('mongoose');
var mongooseGM = require('mongoose-gm');

var kittenSchema = new mongoose.Schema({
    name: {type:String, default:''}
});

var options = {
    resize: { 
        small: { //adds 'small' property to the attachment containing the buffer with resized 256x256 image
            width: 256,
            height: 256
        },            
        medium: { //adds 'medium' property to the attachment containing resized 1600 width image.
            width: 1600 //resize with aspect ratio of original image
        }
    },
    keys : ['property1', 'property2'], //optional, additonal keys that you want to add to the attachment object
    mongoose: mongoose //optional, the mongoose instance your app is using. Defaults to latest version.
};

kittenSchema.plugin(mongooseGM, options);
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
```

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

### example
A simple use case example is added at the end of the API description.


## API
The module decorates your schema with the following functions:

### addImage(name,buffer)
Add an attachment with name and buffer. The image and resized images as specified in the options of the plugin are stored in gridstore.

```javascript
var kitten = new Kitten();

kitten.addImage('kitten.jpg', data)
.then(function(doc) {
    //kitten now contains the attachment. promise returns the doc for further promise chaining/
})
.catch(function(err) {
    throw err;
})
.done();
```

### Accessing attachments

```javascript
kitten.attachments.forEach(function(attachment) {
    console.log(attachment);
});
```

#### Attachment object

```javascript
var attachment = {
    filename: '',           //as specified in your addAttachment call
    buffer: new Buffer(''), //base64 encoded buffer containing the image
    mimetype:'',            //mimetype of the image
    metadata:''             //meta data of the image
};

//based on options of the plugin, the attachment will contain additional keys you've supplied in the options.
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

### partialLoad()
partially load all attachments from the gridstore

```javascript
kitten.partialLoad()
.then(function(doc) {
    doc.attachments.forEach(function(attachment) {
        console.log(attachment); //attachment buffer is empty, contains only keys,filename,mimetype and metadata
    });
})
.catch(function(err) {
    throw err;
})
.done();
```

### loadSingleImage(name)
fully loads a single image into the attachments array

```javascript
kitten.loadSingleImage('kitten.jpg')
.then(function(doc) {
    doc.attachments.forEach(function(attachment) {
        if (attachment.filename == 'kitten.jpg') {
            console.log(attachment); //fully loaded attachment
        }
    });
})
.catch(function(err) {
    throw err;
})
.done();
```

### partialLoadSingleImage(name)
partially loads a single Image into the attachments array

```javascript
kitten.partialLoadSingleImage('kitten.jpg')
.then(function(doc) {
    doc.attachments.forEach(function(attachment) {
        if (attachment.filename == 'kitten.jpg') {
            console.log(attachment); //partial loaded attachment, buffer.length == 0;
        }
    });
})
.catch(function(err) {
    throw err;
})
.done();
```

## Example

This is a full example mixing in the mongoose-gridstore API. 

```javascript
var mongoose   = require('mongoose');
var mongooseGM = require('mongoose-gm');
var fs         = require('fs');

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
            width: 1600 //maintain aspect ratio
        }
    },
    
    keys: ['isKittenLicense']
};

kittenSchema.plugin(mongooseGM, options);

var Kitten = mongoose.model('Kitten', kittenSchema);
var kitten = new Kitten();

//add a pdf to the kitten object. 
//Use the mongoose-gridstore API

fs.readFile('test/license.pdf',function(err,data) {
    if(err) {throw err;}
    kitten.addAttachment('license.pdf', data)
    .then(function(doc) {
        doc.attachments[0].isKittenLicense = true;
        return doc.save();
    })
    .catch(function(err) {
        throw err;
    })
    .done();
});
 
//add a picture of the kitten to the kitten object. 
//Use the mongoose-gm API

fs.readFile('test/kitten.jpg',function(err,data) {
    if(err) {throw err;}
    kitten.addImage('kitten.jpg', data)
    .then(function(doc) {
        return doc.save();
    })
    .catch(function(err) {
        throw err;
    })
    .done();
});
 
Kitten.find({}, function(err,docs) {
    //since mongoose middleware does not allow post manipulation you need to load your
    //attachments explicitly after a save or query.   
    docs.forEach(function(doc) {
        doc.load()
        .then(function(doc) {
            doc.attachments.forEach(function(attachment) {
                console.log(attachment.filename);
                console.log(attachment.mimetype);
                console.log(attachment.buffer.length);
                if(attachment.metadata){ console.log(attachment.metadata); }
            });            
        })
        .catch(function(err) {
            throw err;
        })
        .done();
    });    
});
```

### Test
Above scenarios have been tested and can be found in the test directory of the node module. 
You can verify the package by executing mocha test in the root of the module.

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: license.txt

[npm-url]: https://npmjs.org/package/mongoose-gm
[npm-version-image]: https://img.shields.io/npm/v/mongoose-gm.svg?style=flat
[npm-downloads-image]: https://img.shields.io/npm/dm/mongoose-gm.svg?style=flat
