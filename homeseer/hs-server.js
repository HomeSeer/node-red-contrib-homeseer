const Promise = require('promise');
const Axios = require('axios');
const Events = require('events');

module.exports = function(RED) {
	
	var servers = [];
	
	function HsServerNode(config) {
        var node = this;
		console.log("HsServerNode");
        console.log(config);
        RED.nodes.createNode(node,config);
		node.host = config.host;
		node.port = config.port;
		node.allDevices = [];
		node.allEvents = [];
		node.eventEmitter = new Events.EventEmitter();
		
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
		
		node.getAllEvents = function() {
			console.log("getAllEvents");
			Axios.get('http://' + node.getEndpoint() + '/json?request=getevents', {}).then( (response) => {
				node.allEvents = response.data.Events;
			}).catch( err => {
				console.log("NODE ERROR");
				console.log(err.message);
			});
		};
		
		node.controlDeviceByValue = function(deviceRef, value) {
			console.log("controlDeviceByValue");
			return new Promise( (resolve, reject) => {
				Axios.get('http://' + node.getEndpoint() + '/json?request=controldevicebyvalue&ref='+ deviceRef +'&value=' + value, {}).then( (response) => {
					if(response.data.Devices && response.data.Devices.length == 1){
						resolve(response.data.Devices[0]);
					} else {
						reject("Unexpected response");
						console.log(response.data);
					}
				}).catch( err => {
					reject(err);
				});
			});
		};
		
		node.controlDeviceByLabel = function(deviceRef, label) {
			console.log("controlDeviceByLabel");
			return new Promise( (resolve, reject) => {
				Axios.get('http://' + node.getEndpoint() + '/json?request=controldevicebylabel&ref='+ deviceRef +'&label=' + label, {}).then( (response) => {
					if(response.data.Devices && response.data.Devices.length == 1){
						resolve(response.data.Devices[0]);
					} else {
						reject("Unexpected response");
						console.log(response.data);
					}
				}).catch( err => {
					reject(err);
				});
			});
		};
		
		node.runEvent = function(eventId) {
			console.log("runEvent id=" + eventId);
			return new Promise( (resolve, reject) => {
				Axios.get('http://' + node.getEndpoint() + '/json?request=runevent&id='+ eventId, {}).then( (response) => {
					resolve(response.data);
				}).catch( err => {
					reject(err);
				});
			});
		};
		
		node.getDeviceStatus = function(deviceRef) {
			console.log("getDeviceStatus ref=" + deviceRef);
			return new Promise( (resolve, reject) => {
				Axios.get('http://' + node.getEndpoint() + '/json?request=getstatus&ref='+ deviceRef, {}).then( (response) => {
					if(response.data.Devices && response.data.Devices.length == 1){
						resolve(response.data.Devices[0]);
					} else {
						reject("Unexpected response");
						console.log(response.data);
					}
				}).catch( err => {
					reject(err);
				});
			});
		};
		
		node.getAllDevices();
		node.getAllEvents();
		servers.push(node);
		
		node.on('close', function()
		{
			console.log("server close");
			//remove the server from the server array
			servers = servers.filter(s => s.id != node.id);
		});
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
			const server = servers.find(s => s.host == req.query.host && s.port == req.query.port);
			
			if(server){
				if(req.query.forceRefresh === 'true'){
					server.getAllDevices();
				}
				const rootDevices = server.allDevices.filter(device => (device.relationship == 0 || device.relationship == 2 || device.relationship == 3));
				res.status(200).send(rootDevices);
			} else {
				res.status(404).send("Unknown HS Server: " + req.query.host + + ':' + req.query.port);
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
			const server = servers.find(s => s.host == req.query.host && s.port == req.query.port);
			
			if(server){
				const rootDevice = server.allDevices.find(device => device.ref == req.query.deviceref);
				if(rootDevice) {
					const features = server.allDevices.filter(feature => rootDevice.associated_devices.includes(feature.ref));
					res.status(200).send(features);
				}else {
					res.status(500).send("Unknown Device: " + req.query.deviceref);
				}
			} else {
				res.status(404).send("Unknown HS Server: " + req.query.host + + ':' + req.query.port);
			}
		}
	});
	
	// Get Events
	RED.httpAdmin.get('/homeseer/events', function(req, res) {
		console.log("Http request: events ");
		if(!req.query.host) {
			return res.status(500).send("Missing HS Server Host");
	    }
		else if(!req.query.port) {
			return res.status(500).send("Missing HS Server Port");
	    }
		else
		{
			const server = servers.find(s => s.host == req.query.host && s.port == req.query.port);
			
			if(server){
				if(req.query.forceRefresh === 'true'){
					server.getAllEvents();
				}
				res.status(200).send(server.allEvents);
			} else {
				res.status(404).send("Unknown HS Server: " + req.query.host + + ':' + req.query.port);
			}
		}
	});
	
	// Receive updates from homeseer
	RED.httpAdmin.post('/homeseer/webhook', function(req,res){
        console.log("Http request: HomeSeer Webhook");
        console.log(req.body);

		var server;
		if(servers.length == 1) {
			//if there is only one server defined, use that one
			server = servers[0];
		} else if (servers.length > 1) {
			// if there is multiple servers, use the first one with the correct ip
			// FIXME: it doesn't work if homeseer and node-red run on the same machine: 	
			// req.ip = 127.0.0.1 but s.host can be 192.168.1.xxx
			console.log(req.ip);
			server = servers.find(s => s.host == req.ip);
		}
		
		if(server) {
			if(req.body.type == "devicechange") {
				if(req.body.data["ref"]) {
					server.eventEmitter.emit(req.body.data["ref"].toString(), req.body.data);
				}
			}
		} else {
			console.log("no server found");
			console.log(servers);
		}

        res.status(200).send("OK");
    });
	
}