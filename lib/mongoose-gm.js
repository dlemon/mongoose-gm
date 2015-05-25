'use strict';

(function() {    
    var Q = require('q');
    var gridStore = require('mongoose-gridstore');
    var modelo = require('modelo');
    var _mongoose = require('mongoose');
    var ReadWriteLock = require('rwlock');
    
    var _schema;    
    var _keys;
    var _lock;    
    var _options;

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
        };        
    }
    
    var gm = function(schema, options) {
        gridStore(schema,options);  
        if(!options) {
            options = {};
        }
        
        _keys = options.keys || [];
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
    
    
    
    modelo.inherits(gm, gridStore);
    
    module.exports = exports = gm;
})();