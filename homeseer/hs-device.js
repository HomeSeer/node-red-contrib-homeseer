module.exports = function(RED) {
	
    function HsDeviceNode(config) {
		var node = this;
		console.log("HsDeviceNode");
        console.log(config);
        RED.nodes.createNode(node,config);
		// Retrieve the config node
        node.server = RED.nodes.getNode(config.server);
		
        
        node.on('input', function(msg) {
			//console.log(node);
			if(typeof msg.payload != 'undefined') {
				const ref = (config.feature > 0 ? config.feature : config.device);
				if(typeof msg.payload.value != 'undefined') {
					node.server.controlDeviceByValue(ref, msg.payload.value).then( data => {
						msg.payload = data;
					}).catch(err => {
						msg.payload = err;
					});
					node.send(msg);
				} else if(typeof msg.payload.status != 'undefined') {
					node.server.controlDeviceByLabel(ref, msg.payload.status).then( data => {
						msg.payload = data;
					}).catch(err => {
						msg.payload = err;
					});
					node.send(msg);
				}
			}
        });
		
    }
    RED.nodes.registerType("hs-device",HsDeviceNode);
	
}