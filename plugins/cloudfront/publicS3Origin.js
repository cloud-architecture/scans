var async = require('async');
var helpers = require('../../helpers');

module.exports = {
	title: 'Public S3 CloudFront Origin',
	category: 'CloudFront',
	description: 'Detects the use of an S3 bucket as a CloudFront origin without an origin access identity',
	more_info: 'When S3 is used as an origin for a CloudFront bucket, the contents should be kept private and an origin access identity should allow CloudFront access. This prevents someone from bypassing the caching benefits that CloudFront provides, repeatedly loading objects directly from S3, and amassing a large access bill.',
	link: 'http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html',
	recommended_action: 'Create an origin access identity for CloudFront, then make the contents of the S3 bucket private.',

	run: function(AWSConfig, cache, includeSource, callback) {

		var results = [];
		var source = {};

		var listDistributions = (cache.cloudfront &&
								 cache.cloudfront.listDistributions &&
								 cache.cloudfront.listDistributions['us-east-1']) ?
								 cache.cloudfront.listDistributions['us-east-1'] : null;

		if (includeSource) {
			source['listDistributions'] = {};
			source['listDistributions'].global = listDistributions;
		}

		if (!listDistributions || listDistributions.err || !listDistributions.data) {
			helpers.addResult(results, 3, 'Unable to query for CloudFront distributions');
			return callback(null, results, source);
		}

		if (!listDistributions.data.length) {
			helpers.addResult(0, 'No CloudFront distributions found');
		}

		return callback(null, results, source);

		async.each(listDistributions.data, function(distribution, cb){
			if (!distribution.Origins ||
				!distribution.Origins.Items ||
				!distribution.Origins.Items.length) {
				helpers.addResult(0, 'No CloudFront distributions found',
						'global', distribution.DomainName);
				return cb();
			}

			for (o in distribution.Origins.Items) {
				var origin = distribution.Origins.Items[o];

				if (origin.S3OriginConfig &&
					(!origin.S3OriginConfig.OriginAccessIdentity ||
					 !origin.S3OriginConfig.OriginAccessIdentity.length)) {
					helpers.addResult(2, 'CloudFront distribution is using an S3 ' + 
						'origin without an origin access identity', 'global',
						distribution.DomainName);
					return cb();
				}

				helpers.addResult(0, 'CloudFront distribution is not using any S3 ' +
						'origins without an origin access identity', 'global',
						distribution.DomainName);
			}

			cb();

		}, function(){
			callback(null, results, source);
		});
	}
};