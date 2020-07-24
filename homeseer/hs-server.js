const Promise = require('promise');
const Axios = require('axios');

module.exports = function(RED) {
	
	var servers = {};
	
	function HsServerNode(config) {
        var node = this;
		console.log("HsServerNode");
        console.log(config);
        RED.nodes.createNode(node,config);
		node.host = config.host;
		node.port = config.port;
		node.allDevices = [];
		
		node.getEndpoint = function() {
            return this.host + ':' + this.port;
        },
		
		node.getAllDevices = function() {
			console.log("getAllDevices");
			Axios.get('http://' + node.getEndpoint() + '/json?request=getstatus', {}).then( (response) => {
				node.allDevices = response.data.Devices;
			}).catch( err => {
				console.log("NODE ERROR");
				console.log(err.message);
			});
		};
		
		node.controlDeviceByValue = function(deviceRef, value) {
			console.log("controlDeviceByValue");
			return new Promise( (resolve, reject) => {
				Axios.get('http://' + node.getEndpoint() + '/json?request=controldevicebyvalue&ref='+ deviceRef +'&value=' + value, {}).then( (response) => {
					resolve(response.data);
				}).catch( err => {
					reject(err);
				});
			});
		};
		
		node.controlDeviceByLabel = function(deviceRef, label) {
			console.log("controlDeviceByLabel");
			return new Promise( (resolve, reject) => {
				Axios.get('http://' + node.getEndpoint() + '/json?request=controldevicebylabel&ref='+ deviceRef +'&label=' + label, {}).then( (response) => {
					resolve(response.data);
				}).catch( err => {
					reject(err);
				});
			});
		};
		
		node.getAllDevices();
		servers[node.getEndpoint()] = node;
    }
    RED.nodes.registerType("hs-server",HsServerNode);
	
	// Get Root Devices
	RED.httpAdmin.get('/homeseer/devices', function(req, res) {
		console.log("Http request: devices ");
		if(!req.query.host) {
			return res.status(500).send("Missing HS Server Host");
	    }
		else if(!req.query.port) {
			return res.status(500).send("Missing HS Server Port");
	    }
		else
		{
			const endpoint = req.query.host + ':' + req.query.port;
			const server = servers[endpoint];
			
			if(server){
				if(req.query.forceRefresh === 'true'){
					server.getAllDevices();
				}
				const rootDevices = server.allDevices.filter(device => (device.relationship == 0 || device.relationship == 2 || device.relationship == 3));
				res.status(200).send(rootDevices);
			} else {
				res.status(404).send("Unknown HS Server: " + endpoint);
			}
		}
	});
	
	// Get Features for one root device
	RED.httpAdmin.get('/homeseer/features', function(req, res) {
		console.log("Http request: features ");
		if(!req.query.host) {
			return res.status(500).send("Missing HS Server Host");
	    }
		else if(!req.query.port) {
			return res.status(500).send("Missing HS Server Port");
	    }
		else if(!req.query.deviceref) {
			return res.status(500).send("Missing Device Ref#");
	    }
		else
		{
			const endpoint = req.query.host + ':' + req.query.port;
			const server = servers[endpoint];
			
			if(server){
				const rootDevice = server.allDevices.find(device => device.ref == req.query.deviceref);
				if(rootDevice) {
					const features = server.allDevices.filter(feature => rootDevice.associated_devices.includes(feature.ref));
					res.status(200).send(features);
				}else {
					res.status(500).send("Unknown Device: " + req.query.deviceref);
				}
			} else {
				res.status(404).send("Unknown HS Server: " + endpoint);
			}
		}
	});
	
	
}