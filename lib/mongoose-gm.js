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
        var deferred = Q.defer();
        
        if(!buffer) {return deferred.reject('buffer parameter is missing');}
        
        var id = uuid.v4().toString();
        
        fs.writeFile(id,buffer,function(err) {
            if(err) {deferred.reject(err);}
            gm(id).identify(function(err, data) {
                if(err) {deferred.reject(err);}
                fs.unlink(id,function(err) {
                    if(err) {return deferred.reject(err);}
                    deferred.resolve(data);
                });
            });
        });
        
        return deferred.promise;
    }

    function resize(doc, key, name, buffer) {
        var deferred = Q.defer();
        
        if(!doc) {return deferred.reject('doc parameter is missing');}
        if(!key) {return deferred.reject('key parameter is missing');}
        if(!name) {return deferred.reject('name parameter is missing');}
        if(!buffer) {return deferred.reject('buffer parameter is missing');}
        
        var originalId = uuid.v4().toString();
        var resizedId = uuid.v4().toString();
        
        function resolve() {
            fs.readFile(resizedId,function(err,data) {
                if(err) {return deferred.reject(err);}
                doc.attachments.forEach(function(attachment) {
                    if(attachment.filename == name) {
                        attachment[key] = data;                            
                    }        
                });
                fs.unlink(resizedId,function(err) {
                    if(err) {return deferred.reject(err);}   
                    fs.unlink(originalId, function(err) {
                        if(err) {return deferred.reject(err);}   
                        deferred.resolve();
                    });                    
                });                
            });    
        }
        
        fs.writeFile(originalId,buffer,function(err) {
            if(err) {deferred.reject(err);}
            
            var width  = _options.resize[key].width;
            var height = _options.resize[key].height;
            
            if(width && height) {
                gm(originalId).resize(width,height,'!')
                .write(resizedId, function(err) {
                    if(err) return deferred.reject(err);
                    resolve();                    
                });
            } else if(width) {
                gm(originalId).resize(width)
                .write(resizedId, function(err) {
                    if(err) return deferred.reject(err);
                    resolve();                    
                });
                
            } else if(height) {
                gm(originalId).resize(null,height)
                .write(resizedId, function(err) {
                    if(err) return deferred.reject(err);
                    resolve();                    
                });    
            }
        });
        
        return deferred.promise;
    }
    
    function identifyAndResize(doc,name,buffer) {
        var deferred = Q.defer();
        
        if(!doc) {return deferred.reject('doc parameter is missing');}
        if(!name) {return deferred.reject('name parameter is missing');}
        if(!buffer) {return deferred.reject('buffer parameter is missing');}

        identify(buffer)
        .then(function(data) {
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
                deferred.resolve(doc);                            
            })            
            .catch(function(err) {
                deferred.reject(err);                            
            });      
        })
        .catch(function(err) {
            deferred.reject(err);                            
        });      
        
        return deferred.promise;
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
            var deferred = Q.defer();
         
            if(!name) {return deferred.reject('name parameter is missing');}
            if(!buffer) {return deferred.reject('buffer parameter is missing');}

            var that = this;
            
            _lock.writeLock(function(release) {
                that.addAttachment(name,buffer)
                .then(function() {
                    return identifyAndResize(that,name,buffer);
                })
                .then(function(doc) {
                    release();
                    deferred.resolve(doc);
                })
                .catch(function(err) {
                    release();
                    deferred.reject(err);
                });
            });
            
            return deferred.promise;
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
            var deferred = Q.defer();
            
            if(!name) {return deferred.reject('name parameter is missing');}
            if(!buffer) {return deferred.reject('buffer parameter is missing');}

            var that = this;
            
            _lock.writeLock(function(release) {
                that.updateAttachment(name,buffer)
                .then(function() {
                    return identifyAndResize(that,name,buffer);
                })
                .then(function(doc) {
                    release();
                    deferred.resolve(doc);
                })
                .catch(function(err) {
                    release();
                    deferred.reject(err);
                });
            });
            
            return deferred.promise;        
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
            var deferred = Q.defer();
                        
            this.loadAttachments()            
            .then(function(doc) {
                deferred.resolve(doc);
            })
            .catch(function(err) {
                deferred.reject(err);    
            });
            
            return deferred.promise;
        };          

         /**
         * schema method partialLoad, returns a promise to partially load all attachments
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
        _schema.methods.partialLoad = function() {  
            var deferred = Q.defer();
                        
            this.partialLoadAttachments()            
            .then(function(doc) {
                deferred.resolve(doc);
            })
            .catch(function(err) {
                deferred.reject(err);    
            });
            
            return deferred.promise;
        };          

         /**
         * schema method partialLoadSingleImage, returns a promise to partially load all attachments
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
         *    
         * @param {String} name - name of the attachment
         * @returns {Object} the promise
         */                    
        _schema.methods.partialLoadSingleImage = function(name) {  
            var deferred = Q.defer();
                        
            this.partialLoadSingleAttachment(name)            
            .then(function(doc) {
                deferred.resolve(doc);
            })
            .catch(function(err) {
                deferred.reject(err);    
            });
            
            return deferred.promise;
        };          

         /**
         * schema method loadSingleImage, returns a promise to load a single image
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
         *
         * @param {String} name - name of the attachment
         * @returns {Object} the promise
         */                    
        _schema.methods.loadSingleImage = function(name) {  
            var deferred = Q.defer();
                        
            this.loadSingleAttachment(name)            
            .then(function(doc) {
                deferred.resolve(doc);
            })
            .catch(function(err) {
                deferred.reject(err);    
            });
            
            return deferred.promise;
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
    
    module.exports = exports = mongooseGM;
})();