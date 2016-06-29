const aws =  require('aws-sdk')
const _ = require('lodash')

const MARKER_TAGS = ['job', 'Name']


/* CHECK IF REGIONS IS SET ? */
if(!aws.config.region){
	throw new Error('region is not set.')
}


function filterTags(tags, keys){
	return _(tags).filter((tag)=> keys.indexOf(tag.Key) >= 0).value()
}

function ec2(){
	return new Promise(function(resolve, reject){
	 new aws.EC2().describeInstances({}, function(err, data){
		 const v = _(data['Reservations']).flatMap(function(r){
			 return _.map(r['Instances'], function(instance){
				 return { id: instance['InstanceId'], tags: filterTags(instance['Tags'], MARKER_TAGS)}
			 })
		 }).value()
		 resolve(v)
	 })
	})
}

function elb(){
	return 	new Promise(function(resolve, reject){
		new aws.ELB().describeLoadBalancers({}, function(err, data){
			resolve(_.map(data['LoadBalancerDescriptions'], 'LoadBalancerName'))
		})
	}).then(function(names){
		return new Promise(function(resolve, reject){
			new aws.ELB().describeTags({LoadBalancerNames: names},
									   function(err, data){
										   if(err){
											   reject(err)
										   }
										   resolve(data['TagDescriptions'].map((lb)=>({
											   'id': lb['LoadBalancerName'],
											   'tags': filterTags(lb['Tags'], MARKER_TAGS)
										   })))
									   }
									  )
		})
	}
		   )
}

function s3(){
	const s3 = new aws.S3()
	const getTags = function(bucket){
		return new Promise(function(resolve, reject){
			s3.getBucketTagging({'Bucket': bucket.Name}, function(err, data){
				if(err){
					resolve({
						id: bucket.Name,
						tags: []
					})
				}else{
					resolve({
						id: bucket.Name,
						tags: filterTags(data['TagSet'], MARKER_TAGS)
					})
				}
			})
		})
	}
	return new Promise(function(resolve, reject){
		s3.listBuckets({}, function(err, data){
			if(err){
				reject(err)
			}else{
				resolve(data['Buckets'])
			}
		})
	}).then(function(buckets){
		return Promise.all(buckets.map(getTags))
	})
}

function rds(){
	const rds = new aws.RDS()
	return new Promise(function(resolve, reject){
		rds.describeDBInstances({}, function(err, data){
			if(err){
				reject(err)
			}else{
				resolve(data['DBInstances'])
			}
		})
	}).then(function(instances){
		return Promise.all(instances.map(function(instance){
			console.log(instance)
			return new Promise(function(resolve, reject){
				rds.listTagsForResource({ResourceName: instance.DBInstanceIdentifier}, function(err, data){
					if(err){ reject(err)}
					else{ resolve(data)}
				})
			})
		}))
	})
}

s3().then(console.log, console.log)
ec2().then(console.log, console.log)
elb().then(console.log, console.log)
rds().then(console.log, console.log)

