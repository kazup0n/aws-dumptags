const aws =  require('aws-sdk')
const _ = require('lodash')

const MARKER_TAGS = ['job', 'Name']

function filterTags(tags, keys){
	return _(tags).filter((tag)=> keys.indexOf(tag.Key) >= 0).value()
}

const ec2 = ()=> new Promise(function(resolve, reject){
	 new aws.EC2().describeInstances({}, function(err, data){
		 const v = _(data['Reservations']).flatMap(function(r){
			 return _.map(r['Instances'], function(instance){
				 return { id: instance['InstanceId'], tags: filterTags(instance['Tags'], MARKER_TAGS)}
			 })
		 }).value()
		 resolve(v)
	 })
})


const elb = ()=> new Promise(function(resolve, reject){
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

elb().then(console.log)
ec2().then(console.log)
