module.exports = function (RED) {

	function HsDeviceNode(config) {
		var node = this;
		console.log("HsDeviceNode");
		console.log(config);
		RED.nodes.createNode(node, config);
		// Retrieve the server node
		node.server = RED.nodes.getNode(config.server);
		node.ref = (config.feature > 0 ? config.feature : config.device);

		node.server.getDeviceStatus(node.ref).then(data => {
			node.status({
				fill: "yellow",
				shape: "dot",
				text: data.status
			});
		}).catch(err => {
			console.log(err);
			node.status({
				fill: "red",
				shape: "ring",
				text: "error while getting status"
			});
		});

		node.on('input', function (msg, send, done) {
			//console.log(node);
			if (typeof msg.payload != 'undefined') {
				if (typeof msg.topic == 'string')
					msg.topic = msg.topic.toLowerCase();
				if (!msg.topic || msg.topic == 'control') {
					if (typeof msg.payload.value != 'undefined') {
						node.server.controlDeviceByValue(node.ref, msg.payload.value).then(data => {
							msg.payload = data;
							send(msg);
							done();
						}).catch(err => {
							done(err);
						});
					} else if (typeof msg.payload.status != 'undefined') {
						node.server.controlDeviceByLabel(node.ref, msg.payload.status).then(data => {
							msg.payload = data;
							send(msg);
							done();
						}).catch(err => {
							done(err);
						});
					}
				} else if (msg.topic == 'update') {
					if (typeof msg.payload.value != 'undefined') {
						node.server.setDeviceValue(node.ref, msg.payload.value).then(data => {
							msg.payload = data;
							send(msg);
							done();
						}).catch(err => {
							done(err);
						});
					}
					if (typeof msg.payload.status != 'undefined') {
						node.server.setDeviceString(node.ref, msg.payload.status).then(data => {
							msg.payload = data;
							send(msg);
							done();
						}).catch(err => {
							done(err);
						});
					}
				}
			}
		});

		node.updateListener = function (update) {
			console.log("device update:");
			console.log(update);
			node.status({
				fill: "yellow",
				shape: "dot",
				text: update.status
			});
			let msg = {
				topic: "",
				payload: update
			};
			node.send(msg);
		}

		node.server.eventEmitter.addListener(node.ref.toString(), node.updateListener);

		node.on('close', function () {
			console.log("device close");
			node.server.eventEmitter.removeListener(node.ref.toString(), node.updateListener);
		});

	}
	RED.nodes.registerType("hs-device", HsDeviceNode);

}
