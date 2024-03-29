module.exports = function (RED) {

	function HsEventNode(config) {
		var node = this;
		RED.nodes.createNode(node, config);
		node.debug("HsEventNode: " + JSON.stringify(config));
		// Retrieve the server node
		node.server = RED.nodes.getNode(config.server);
		node.eventid = config.event;

		node.on('input', function (msg, send, done) {
			if (!msg.topic || msg.topic == 'run') {
				node.server.runEvent(node.eventid).then(data => {
					msg.payload = data;
					send(msg);
					done();
				}).catch(err => {
					done(err);
				});
			}
		});

	}
	RED.nodes.registerType("hs-event", HsEventNode);

}
