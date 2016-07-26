'use strict';

(function() {    
    var Q = require('q');
    var gridStore = require('mongoose-gridstore');
    var modelo = require('modelo');
    var _mongoose = require('mongoose');
    var ReadWriteLock = require('rwlock');
    var gm = require('gm').subClass({imageMagick: true});
    var fs = require('fs');
    var uuid = require('node-uuid');
    
    var _schema;    
    var _keys;
    var _lock;    
    var _options;

        
    function identify(buffer) {
        return Q.Promise(function(resolve,reject) {
            if(!buffer) {return reject('buffer parameter is missing');}
        
            var id = uuid.v4().toString();
        
            fs.writeFile(id,buffer,function(err) {
                if(err) { return reject(err);}
                gm(id).identify(function(err, data) {
                    if(err) { return reject(err);}
                    fs.unlink(id,function(err) {
                        if(err) {return reject(err);}
                        resolve(data);
                    });
                });
            });
        });    
    }

    function resize(doc, key, name, buffer) {
        return Q.Promise(function(resolve,reject) {
        
            if(!doc) {return reject('doc parameter is missing');}
            if(!key) {return reject('key parameter is missing');}
            if(!name) {return reject('name parameter is missing');}
            if(!buffer) {return reject('buffer parameter is missing');}
            
            var originalId = uuid.v4().toString();
            var resizedId = uuid.v4().toString();
            
            function attach() {
                fs.readFile(resizedId,function(err,data) {
                    if(err) {return reject(err);}
                    doc.attachments.forEach(function(attachment) {
                        if(attachment.filename == name) {
                            attachment[key] = data;                            
                        }        
                    });
                    fs.unlink(resizedId,function(err) {
                        if(err) {return reject(err);}   
                        fs.unlink(originalId, function(err) {
                            if(err) {return reject(err);}   
                            resolve();
                        });                    
                    });                
                });    
            }
            
            fs.writeFile(originalId,buffer,function(err) {
                if(err) { return reject(err);}
                
                var width  = _options.resize[key].width;
                var height = _options.resize[key].height;
                var thumbnail = _options.resize[key].thumbnail;

                if(width && height) {
                    if(thumbnail) {
                      gm(originalId)
                      .gravity('Center')
                      .thumb(width, height, resizedId, 100, function(err) {
                        if(err) return reject(err);
                        attach();
                      });
                    } else {
                      gm(originalId).resize(width,height,'!')
                      .write(resizedId, function(err) {
                        if(err) return reject(err);
                        attach();
                      });
                    }
                } else if(width) {
                    gm(originalId).resize(width)
                    .write(resizedId, function(err) {
                        if(err) return reject(err);
                        attach();                    
                    });
                    
                } else if(height) {
                    gm(originalId).resize(null,height)
                    .write(resizedId, function(err) {
                        if(err) return reject(err);
                        attach();                    
                    });    
                }
            });        
        });
    }
    
    function identifyAndResize(doc,name,buffer) {
        var that = this;
        return Q.Promise(function(resolve,reject) {
            if(!doc) {return reject('doc parameter is missing');}
            if(!name) {return reject('name parameter is missing');}
            if(!buffer) {return reject('buffer parameter is missing');}
            
            identify(buffer)
            .then(
                function(data) {
                    //add the metadata to the attachment
                    doc.attachments.forEach(function(attachment) {
                        if(attachment.filename == name) {
                            delete data.Properties;
                            attachment.metadata = data;
                        }
                    });  
                    //resize images and add to the attachment
                    var promises = [];
                    
                    if(_options.resize) {                        
                        doc.attachments.forEach(function(attachment) {
                            if(attachment.filename == name) {
                                for(var key in _options.resize) {
                                    promises.push(resize(doc, key, name, buffer));                                    
                                }
                            }
                        });
                    }
                    //execute all resize promises
                    Q.all(promises)
                    .then(function() {
                        resolve(doc);                            
                    });
                },
                function(err) {
                    reject(err);
                }
            );
        });
    }
    
    /**
     * private function that decorated the given mongoose schema
     *
     * ####Example:
     *
     *	decorateSchema(mongoose);
     *	
     * ####Note:
     *      
     * @param {Object} attachment - the attachment to be read.
     * @returns {Object} the promise
     */    
    function decorateSchema(mongoose) {                           
        /**
         * schema method addImage, returns a promise to add and image 
         *
         * ####Example:
         *
         *	kitten.addImage('kitten,jpg', buffer)
         *	.then(function(doc) {
         *      //doc contains all attachments  
         *	})
         *	.catch(function(error) {
         *	});
         *	
         * ####Note:
         *
         * it does not check for existing name!        
         *
         * @returns {Object} the promise
         */                    
        _schema.methods.addImage = function(name, buffer) { 
            var that = this;            
            return Q.Promise(function(resolve,reject) {
                if(!name) {return reject('name parameter is missing');}
                if(!buffer) {return reject('buffer parameter is missing');}

                _lock.writeLock(function(release) {
                    that.addAttachment(name,buffer)
                    .then(function() {
                        identifyAndResize(that,name,buffer)
                        .then(
                            function(doc) {
                                release();
                                resolve(doc);
                            },
                            function(err) {
                                // ImageMagick binaries not found
                                if(err.message.startsWith('Could not execute'))
                                  release();
                                  reject(err);
                                  return

                                //attachment could not be identified as an image
                                //since the buffer is added as attachment anyway
                                //we resolve it without thumbnails.
                                release();
                                resolve(that);
                            });
                    })
                    .catch(function(err) {
                        release();
                        reject(err);
                    });
                });    
            });
        };

        /**
         * schema method updateImage, returns a promise to update an image
         *
         * ####Example:
         *
         *	kitten.updateImage('kitten.jpg', buffer)
         *	.then(function(doc) {
         *      //doc contains all attachments  
         *	})
         *	.catch(function(error) {
         *	});
         *	
         * ####Note:
         *      * 
         * @returns {Object} the promise
         */                    
        _schema.methods.updateImage = function(name, buffer) { 
            var that = this;
            return Q.Promise(function(resolve,reject) {
                if(!name) {return reject('name parameter is missing');}
                if(!buffer) {return reject('buffer parameter is missing');}
    
                _lock.writeLock(function(release) {
                    that.updateAttachment(name,buffer)
                    .then(function() {
                        return identifyAndResize(that,name,buffer);
                    })
                    .then(function(doc) {
                        release();
                        resolve(doc);
                    })
                    .catch(function(err) {
                        release();
                        reject(err);
                    });
                });    
            });
        };

        /**
         * schema method removeImage, returns a promise to remove an image
         *
         * ####Example:
         *
         *	kitten.removeImage('kitten.jpg')
         *	.then(function(doc) {
         *      //doc contains the update document
         *	})
         *	.catch(function(error) {
         *	});
         *	
         * ####Note:
         *      * 
         * @returns {Object} the promise
         */                    
        _schema.methods.removeImage = function(name) {  
            return this.removeAttachment(name);
        };    

         /**
         * schema method load, returns a promise to load all attachments
         *
         * ####Example:
         *
         *	kitten.load()
         *	.then(function(doc) {
         *      //doc contains the update document
         *	})
         *	.catch(function(error) {
         *	});
         *	
         * ####Note:
         *      * 
         * @returns {Object} the promise
         */                    
        _schema.methods.load = function() {  
            var that = this;
            return Q.Promise(function(resolve,reject) {
                that.loadAttachments()            
                .then(function(doc) {
                    resolve(doc);
                })
                .catch(function(err) {
                    reject(err);    
                });    
            });
        };          

         /**
         * schema method partialLoad, returns a promise to partially load all attachments
         *
         * ####Example:
         *
         *	kitten.partialLoad()
         *	.then(function(doc) {
         *      //doc contains the partial loaded attachments
         *	})
         *	.catch(function(error) {
         *	});
         *	
         * ####Note:
         *      * 
         * @returns {Object} the promise
         */                    
        _schema.methods.partialLoad = function() {  
            var that = this;
            return Q.Promise(function(resolve,reject) {
                that.partialLoadAttachments()            
                .then(function(doc) {
                    resolve(doc);
                })
                .catch(function(err) {
                    reject(err);    
                });    
            });
        };          

         /**
         * schema method partialLoadSingleImage, returns a promise to partially load all attachments
         *
         * ####Example:
         *
         *	kitten.partialLoadSingleImage('kitten.jpg')
         *	.then(function(doc) {
         *      //doc contains the partial loaded image (only resized images)
         *	})
         *	.catch(function(error) {
         *	});
         *	
         * ####Note:
         *    
         * @param {String} name - name of the attachment
         * @returns {Object} the promise
         */                    
        _schema.methods.partialLoadSingleImage = function(name) { 
            var that = this;
            return Q.Promise(function(resolve,reject) {
                that.partialLoadSingleAttachment(name)            
                .then(function(doc) {
                    resolve(doc);
                })
                .catch(function(err) {
                    reject(err);    
                });    
            });
        };          

         /**
         * schema method loadSingleImage, returns a promise to load a single image
         *
         * ####Example:
         *
         *	kitten.loadSingleImage('kitten.jpg')
         *	.then(function(doc) {
         *      //doc contains the single image including thumbnails
         *	})
         *	.catch(function(error) {
         *	});
         *	
         * ####Note:
         *
         * @param {String} name - name of the attachment
         * @returns {Object} the promise
         */                    
        _schema.methods.loadSingleImage = function(name) {  
            var that = this;
            return Q.Promise(function(resolve,reject) {
                that.loadSingleAttachment(name)            
                .then(function(doc) {
                    resolve(doc);
                })
                .catch(function(err) {
                    reject(err);    
                });    
            });
        };                  
    }
    
    var mongooseGM = function(schema, options) {
        gridStore(schema,options);  
        
        if(!options) {
            options = {};
        }
        
        _options = options || [];
        
        //add metadata to the keys
        if(_options.keys) {
            _options.keys.splice(0,0,'metadata');
        } else {
            options.keys = ['metadata'];
        }
        //add resize placeholders
        if(_options.resize) {
            for(var key in _options.resize) {
                _options.keys.splice(0,0,key);    
            }         
        }
        
        _mongoose = options.mongoose || require('mongoose');
                        
        if (!_schema) {
            _schema = schema;
             gridStore(_schema,_options); 
             decorateSchema(_mongoose);
        }            

        if(!_lock) {
            _lock = new ReadWriteLock();
        }        
    }
    
    modelo.inherits(mongooseGM, gridStore);
    
    module.exports = mongooseGM;
})();