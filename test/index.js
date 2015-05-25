'use strict';
var should = require('chai').should();
var fs = require('fs');
var mongoose = require('mongoose');
var gm = require('../index.js');
var URI = 'mongodb://localhost/test';

var kittenSchema;

describe('Schema decoration',function() {   
    var kitten;
    
    before(function(done) {
        mongoose.connect(URI, function(err){
            if (err) {
              return done(err);
            } 
          
            kittenSchema = new mongoose.Schema({
                name: {type:String, default:''}
            });
            
            var options = {
                resize: {           
                    small: { 
                        width: 256,
                        height: 256,
                    },            
                    medium: {
                        width: 1600
                    }
                },
                keys: ['isKittenLicense']
            };
            
            kittenSchema.plugin(gm, options);
            var Kitten = mongoose.model('Kitten', kittenSchema);
            kitten = new Kitten();   
            done();
       });
    });       
    
    it('should decorate with an attachments array', function() {
       kitten.should.have.property('attachments'); 
       kitten.attachments.should.be.an('Array');
    });
    it('should decorate with a addAttachment function', function() {
       kitten.should.have.property('addAttachment'); 
       kitten.addAttachment.should.be.a('Function');
    });
    it('should decorate with a updateAttachment function', function() {
       kitten.should.have.property('updateAttachment'); 
       kitten.updateAttachment.should.be.a('Function');
    });
    it('should decorate with a loadAttachments function', function() {
       kitten.should.have.property('loadAttachments'); 
       kitten.loadAttachments.should.be.an('Function');
    });
    it('should decorate with a removeAttachment function', function() {
       kitten.should.have.property('removeAttachment'); 
       kitten.removeAttachment.should.be.an('Function');
    });
    it('should decorate with a addImage function', function() {
       kitten.should.have.property('addImage'); 
       kitten.addImage.should.be.an('Function');
    });
    it('should decorate with a updateImage function', function() {
       kitten.should.have.property('updateImage'); 
       kitten.updateImage.should.be.an('Function');
    });
    it('should decorate with a removeImage function', function() {
       kitten.should.have.property('removeImage'); 
       kitten.removeImage.should.be.an('Function');
    });
    it('should decorate with a load function', function() {
       kitten.should.have.property('load'); 
       kitten.load.should.be.an('Function');
    });
    after(function(done) {
        mongoose.connection.close(function(err) {
            if(err) {
                return done(err);
            }
            done();
        });
    });    
});

describe('Example', function() {
    var kitten;
    
    before(function(done) {
       mongoose.connect(URI, function(err){
            if (err) {
              return done(err);
            } 
            var Kitten = mongoose.model('Kitten', kittenSchema);
            kitten = new Kitten();   
            done();
       });
    });

    it('should add attachment license.pdf', function(done) {
        fs.readFile('test/license.pdf',function(err,data) {
            if(err) return done(err);
            kitten.addAttachment('license.pdf', data)
            .then(function(doc) {
                doc.attachments[0].isKittenLicense = true;
                return doc.save();
            })
            .then(kitten.loadAttachments.bind(kitten))
            .then(function(doc) {
                if(doc.attachments.length != 1) return done('attachment not added');
                if(doc.attachments[0].filename != 'license.pdf') return done('filename <> license.pdf');                
                if(doc.attachments[0].buffer.length != data.length) return done('content not saved');                
                if(!doc.attachments[0].isKittenLicense) return done('key isKittenLicense not saved');                
                done();
            })
            .catch(function(err) {
                done(err);
            })
            .done();
        });
    });

    it('should add image kitten.jpg including metadata', function(done) {
        fs.readFile('test/kitten.jpg',function(err,data) {
            if(err) return done(err);
            kitten.addImage('kitten.jpg', data)
            .then(function(doc) {
                if(doc.attachments.length != 2) return done('attachment not added');
                if(doc.attachments[1].filename != 'kitten.jpg') return done('filename <> kitten.jpg');                
                if(doc.attachments[1].buffer.length != data.length) return done('content not saved');                
                if(!doc.attachments[1].metadata) return done('metadata not found');                
                if(doc.attachments[1].small.length <= 0) return done('small image not found');                
                if(doc.attachments[1].medium.length <=0) return done('medium image not found');                
                
                done();
            })
            .catch(function(err) {
                done(err);
            })
            .done();
        });
    });
    
    it('should save and read back all attachments', function(done) {
        kitten.save()
        .then(function(doc) {
            doc.load()
            .then(function(doc) {
                if(doc.attachments.length != 2) return done('attachment not added');
                if(doc.attachments[1].filename != 'kitten.jpg') return done('filename <> kitten.jpg');                
                if(!doc.attachments[1].metadata) return done('metadata not found');                
                if(doc.attachments[1].small.length <= 0) return done('small image not found');                
                if(doc.attachments[1].medium.length <=0) return done('medium image not found');                
                done();
            })
            .catch(function(err) {
                done(err);
            });
        });
    });

    it('should update image kitten.jpg including metadata', function(done) {
        var original_metadata = kitten.attachments[1].metadata;
        
        fs.readFile('test/another-kitten.jpg',function(err,data) {
            if(err) return done(err);
            kitten.updateImage('kitten.jpg', data)
            .then(function(doc) {
                if(doc.attachments.length != 2) return done('attachment not added');
                if(doc.attachments[1].filename != 'kitten.jpg') return done('filename <> kitten.jpg');                
                if(doc.attachments[1].buffer.length != data.length) return done('content not saved');                
                if(!doc.attachments[1].metadata) return done('metadata not found');                
                if(doc.attachments[1].small.length <= 0) return done('small image not found');                
                if(doc.attachments[1].medium.length <=0) return done('medium image not found');                
                if(doc.attachments[1].metadata.Filesize == original_metadata.Filesize) return done('metadata not changed.');
                done();
            })
            .catch(function(err) {
                done(err);
            })
            .done();
        });
    });
    
    it('should remove image attachment', function(done) {
        kitten.removeImage('kitten.jpg')
        .then(function(doc) {
            doc.load()
            .then(function(doc) {
                if(doc.attachments.length != 1) return done('attachment not added');
                if(doc.attachments[0].filename != 'license.pdf') return done('wrong attachment removed');                
                done();
            })
            .catch(function(err) {
                done(err);
            });
        });
    });
    
    after(function(done) {
        mongoose.connection.close(function(err) {
            if(err) {
                return done(err);
            }
            done();
        });
    });        
});
