var _ = require('lodash'),
  async = require('async'),
  convertResourceObjectUrls = require('app/utils/convert-resource-object-urls'),
  getRelatedResourceObjects = require('app/utils/get-related-resource-objects');

module.exports = function(req, res, data) {
  if (!data) {
    return res.status(404).send('Not Found');
  }

  let included;

  let limit = (done) => {
    if (!Array.isArray(data)) { return done(); }

    if (req.query.limit) {
      data = data.slice(0, req.query.limit);
    }

    done();
  };

  let convertUrls = (done) => {
    if (Array.isArray(data)) {
      data.map((resourceObject) => {
        return convertResourceObjectUrls(resourceObject, req);
      });
    } else {
      data = convertResourceObjectUrls(data, req);
    }

    done();
  };

  let include = (done) => {
    if (!req.query.include) { return done(); }

    var include = req.query.include.split(',');
    var relatedResourceObjects = [];
    var resourceObjects = Array.isArray(data) ? data : [data];

    async.map(resourceObjects, (resourceObject, done) => {
      getRelatedResourceObjects(resourceObject, include, req, done);
    }, (error, relatedResourceObjects) => {
      if (relatedResourceObjects) {
        relatedResourceObjects = _.flatten(relatedResourceObjects.filter((o) => o));

        if (relatedResourceObjects.length > 0) {
          included = relatedResourceObjects;
        }
      }

      relatedResourceObjects.map((relatedResourceObject) => {
        return convertResourceObjectUrls(relatedResourceObject, req);
      });

      done(error, relatedResourceObjects);
    });
  };

  async.waterfall([limit, convertUrls, include], (error) => {
    res.setHeader('Content-Type', 'application/json');

    if (error) {
      res.status(500).send('Internal Server Error');
    } else if (!data) {
      res.status(404).send('Not Found');
    } else {
      res.send({ 
        data: data,
        included: included
      });
    }
  });
};
