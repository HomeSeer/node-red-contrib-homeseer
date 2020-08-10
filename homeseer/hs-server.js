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
            return node.host + ':' + node.port;
        },
		
		node.refreshAllDevices = function(){
			return getAllDevices(node.getEndpoint()).then( data => {
				node.allDevices = data;
			}).catch(err => {
				node.error(msg);
			});
		}
		
		node.refreshAllEvents = function(){
			return getAllEvents(node.getEndpoint()).then( data => {
				node.allEvents = data;
			}).catch(err => {
				node.error(msg);
			});
		}
		
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
      
		node.changeDeviceString = function(deviceRef, string) {
			console.log("changeDeviceString");
			return new Promise( (resolve, reject) => {
				Axios.get('http://' + node.getEndpoint() + '/json?request=setdevicestatus&ref='+ deviceRef +'&string=' + string, {}).then( (response) => {
					if(response.data.Response == "ok"){
						resolve(response.data.Response);
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
		
		node.refreshAllDevices();
		node.refreshAllEvents();
		servers.push(node);
		
		node.on('close', function()
		{
			console.log("server close");
			//remove the server from the server array
			servers = servers.filter(s => s.id != node.id);
		});
    }
    RED.nodes.registerType("hs-server",HsServerNode);
	
	function getAllDevices(endpoint) {
		console.log("getAllDevices from " + endpoint);
		return new Promise( (resolve, reject) => {
			Axios.get('http://' + endpoint + '/json?request=getstatus', {}).then( (response) => {
				resolve(response.data.Devices);
			}).catch( err => {
				reject(err.message);
			});
		});
	}
	
	function getAllEvents(endpoint) {
		console.log("getAllEvents from "  + endpoint);
		return new Promise( (resolve, reject) => {
			Axios.get('http://' + endpoint + '/json?request=getevents', {}).then( (response) => {
				resolve(response.data.Events);
			}).catch( err => {
				reject(err.message);
			});
		});
	};
	
	// Get Root Devices
	RED.httpAdmin.get('/homeseer/devices', async function(req, res) {
		console.log("Http request: devices ");
		if(!req.query.host) {
			res.status(500).send("Missing HS Server Host");
	    }
		else if(!req.query.port) {
			res.status(500).send("Missing HS Server Port");
	    }
		else
		{
			try{
				let allDevices = [];
				const server = servers.find(s => s.host == req.query.host && s.port == req.query.port);
				
				if(server){
					if(req.query.forceRefresh === 'true'){
						await server.refreshAllDevices();
					}
					allDevices = server.allDevices;
				} else {
					// we need this for when the server node is not deployed yet
					allDevices = await getAllDevices(req.query.host + ':' + req.query.port);
				}
				const rootDevices = allDevices.filter(device => (device.relationship == 0 || device.relationship == 2 || device.relationship == 3));
				res.status(200).send(rootDevices);
			} catch (err) {
				res.status(500).send(err.message);
			}
		}
	});
	
	// Get Features for one root device
	RED.httpAdmin.get('/homeseer/features', async function(req, res) {
		console.log("Http request: features ");
		if(!req.query.host) {
			res.status(500).send("Missing HS Server Host");
	    }
		else if(!req.query.port) {
			res.status(500).send("Missing HS Server Port");
	    }
		else if(!req.query.deviceref) {
			res.status(500).send("Missing Device Ref#");
	    }
		else
		{
			try{
				let allDevices = [];
				const server = servers.find(s => s.host == req.query.host && s.port == req.query.port);
				
				if(server){
					if(req.query.forceRefresh === 'true'){
						await server.refreshAllDevices();
					}
					allDevices = server.allDevices;
				} else {
					// we need this for when the server node is not deployed yet
					allDevices = await getAllDevices(req.query.host + ':' + req.query.port);
				}
				
				const rootDevice = allDevices.find(device => device.ref == req.query.deviceref);
				if(rootDevice) {
					const features = allDevices.filter(feature => rootDevice.associated_devices.includes(feature.ref));
					res.status(200).send(features);
				}else {
					res.status(500).send("Unknown Device: " + req.query.deviceref);
				}
			} catch (err) {
				res.status(500).send(err.message);
			}
		}
	});
	
	// Get Events
	RED.httpAdmin.get('/homeseer/events', async function(req, res) {
		console.log("Http request: events ");
		if(!req.query.host) {
			res.status(500).send("Missing HS Server Host");
	    }
		else if(!req.query.port) {
			res.status(500).send("Missing HS Server Port");
	    }
		else
		{
			try{
				let allEvents = [];
				const server = servers.find(s => s.host == req.query.host && s.port == req.query.port);
				
				if(server){
					if(req.query.forceRefresh === 'true'){
						await server.refreshAllEvents();
					}
					allEvents = server.allEvents;
				} else {
					// we need this for when the server node is not deployed yet
					allEvents = await getAllEvents(req.query.host + ':' + req.query.port);
				}
				res.status(200).send(allEvents);
			} catch (err) {
				res.status(500).send(err.message);
			}
		}
	});
	
	// Receive updates from homeseer
	RED.httpAdmin.post('/homeseer/webhook', function(req,res){
        //console.log("Http request: HomeSeer Webhook");
        //console.log(req.body);

		var server;
		if(servers.length == 1) {
			//if there is only one server defined, use that one
			server = servers[0];
		} else if (servers.length > 1) {
			// if there is multiple servers, use the first one with the correct ip
			// FIXME: it doesn't work if homeseer and node-red run on the same machine: 	
			// req.ip = 127.0.0.1 but s.host can be 192.168.1.xxx
			server = servers.find(s => s.host == req.ip);
		}
		
		if(server) {
			if(req.body.type == "devicechange") {
				if(req.body.data["ref"]) {
					server.eventEmitter.emit(req.body.data["ref"].toString(), req.body.data);
				}
			}
		} else {
			//console.log("no server found");
			//console.log(servers);
		}

        res.status(200).send("OK");
    });
	
}