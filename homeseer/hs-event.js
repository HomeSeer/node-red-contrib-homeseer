module.exports = function(RED) {
	
    function HsEventNode(config) {
		var node = this;
		console.log("HsEventNode");
        console.log(config);
        RED.nodes.createNode(node,config);
		// Retrieve the server node
        node.server = RED.nodes.getNode(config.server);
		node.eventid = config.event;
        
        node.on('input', function(msg) {
			//console.log(node);
			if(typeof msg.payload != 'undefined') {
				if(typeof msg.payload.run != 'undefined') {
					node.server.runEvent(node.eventid).then( data => {
						msg.payload = data;
						node.send(msg);
					}).catch(err => {
						msg.payload = err;
						node.send(msg);
					});
				} 
			}
        });
		
    }
    RED.nodes.registerType("hs-event",HsEventNode);
	
}