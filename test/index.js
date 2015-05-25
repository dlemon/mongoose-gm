'use strict';
var should = require('chai').should();

var mongoose = require('mongoose');
var gm = require('../index.js');
var URI = 'mongodb://localhost/test';

var kitten;
var kittenSchema;

describe('Schema decoration',function() {

    before(function(done) {
       mongoose.connect(URI, function(err){
            if (err) {
              return done(err);
            } 
          
            kittenSchema = new mongoose.Schema({
                name: {type:String, default:''}
            });
            
            kittenSchema.plugin(gm, {keys:['property1', 'property2']});
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

    after(function(done) {
        mongoose.connection.close(function(err) {
            if(err) {
                return done(err);
            }
            done();
        });
    });    
});
