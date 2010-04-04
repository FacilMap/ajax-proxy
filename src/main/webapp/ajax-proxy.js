var ajaxProxyXMLHttpRequest = function() {
    this.onreadystatechange = function() { };

	this.UNSENT = 0;
	this.OPENED = 1;
	this.HEADERS_RECEIVED = 2;
	this.LOADING = 3;
	this.DONE = 4;

	this.readyState = this.UNSENT;
	
	this.status = undefined;
	this.statusText = undefined;
	this.responseText = undefined;
	this.responseXML = undefined;
	
	// Non-standard
	this.responseHeaders = undefined;
	this.instanceName = undefined;

	this.open = function(method, url, async, user, password) {
		// FIXME
	};

	this.setRequestHeader = function(header, value) {
		// FIXME
	};

	this.send = function(data) {
		this.instanceName = new Date().getTime();
		ajaxProxyXMLHttpRequest.existingInstances[this.instanceName] = this;
		// FIXME
	};

	this.abort = function() {
		// FIXME
	};
	
	this.getResponseHeader = function(header) {
		if(this.responseHeaders == undefined)
			return undefined;
		return this.responseHeaders[header];
	};
	
	this.getAllResponseHeaders = function() {
		return this.responseHeaders;
	};
	
	this.onreadystatechangeWrapper = function() {
		if(this.status == this.DONE)
			ajaxProxyXMLHttpRequest.existingInstances[this.instanceName] = undefined;
		this.onreadystatechange();
	};
	
	this.parseResponseXML = function() {
		try {
			if(window.DOMParser)
			{
				var parser = new DOMParser();
				this.responseXML = parser.parseFromString(this.responseText, "text/xml");
			}
			else
			{
				this.responseXML = new ActiveXObject("Microsoft.XMLDOM");
				this.responseXML.async="false";
				this.responseXML.loadXML(this.responseText);
			}
		} catch(e) {
			this.responseXML = null;
		}
	};
};

ajaxProxyXMLHttpRequest.existingInstances = { };