/**
 * An implementation of the XMLHttpRequest interface (http://www.w3.org/TR/XMLHttpRequest/) that
 * works around the Same Origin Policy by using JavaScript function calls that the ajax-proxy
 * Servlet creates.
 * 
 * Differences to standard XMLHttpRequest:
 * - Synchronous mode is not supported.
 * - Browser cache is not used.
 * 
 * All members starting with a _ do not belong to the standard interface.
 */

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
	
	this._responseHeaders = undefined;
	this._instanceName = undefined;
	
	this._method = undefined;
	this._url = undefined;
	this._user = undefined;
	this._password = undefined;
	this._requestHeaders = undefined;
	
	this._sent = false;

	this.open = function(method, url, async, user, password) {
		if(async != undefined && !async)
			throw "sync mode is not supported by ajax-proxy";

		this._method = method.toUpperCase();
		this._url = this._makeFullURL(url);
		this._user = user;
		this._password = password;
		this._requestHeaders = { };
		
		this.status = undefined;
		this.statusText = undefined;
		this.responseText = undefined;
		this.responseXML = undefined;
		
		this._responseHeaders = undefined;
		if(this._instanceName != undefined)
		{
			ajaxProxyXMLHttpRequest._existingInstances[this._instanceName] = undefined;
			this._instanceName = undefined;
		}
		this._sent = false;
		
		this.readyState = this.OPENED;
		this._onreadystatechangeWrapper();
	};

	this.setRequestHeader = function(header, value) {
		if(this.readyState != this.OPENED || this._sent)
			throw "INVALID_STATE_ERR";

		header = header.toLower();
		if(this._requestHeaders[header] != undefined)
			this._requestHeaders[header] += ", "+value;
		else
			this._requestHeaders[header] = value;
	};

	this.send = function(data) {
		if(this.readyState != this.OPENED || this._sent)
			throw "INVALID_STATE_ERR";
		
		if(this._method == "GET" || this._method == "HEAD")
			data = undefined;
		
		this._instanceName = new Date().getTime();
		ajaxProxyXMLHttpRequest._existingInstances[this._instanceName] = this;
		
		var url = ajaxProxyXMLHttpRequest.URL + (url.indexOf('?') == -1 ? "?" : "&");
		url += "url="+encodeURIComponent(this._url) +
		       "&object="+encodeURIComponent("ajaxProxyXMLHttpRequest._existingInstances["+this._instanceName+"]") +
		       "&method="+encodeURICOmponent(this._method);
		
		var i = 0;
		for(var it in this._requestHeaders)
		{
			url += "&header"+i+"k="+encodeURIComponent(it) +
			       "&header"+i+"v="+encodeURIComponent(this._requestHeaders[it]);
			i++;
		}
		
		if(data != undefined)
		{
			if(data.innerHTML != undefined)
			{
				if(this._requestHeaders["content-type"] == undefined)
					this._requestHeaders["content-type"] = "text/xml; charset=UTF-8";
				url += "&data="+encodeURIComponent(data.innerHTML);
			}
			else
			{
				if(this._requestHeaders["content-type"] == undefined)
					this._requestHeaders["content-type"] = "text/plain; charset=UTF-8";
				url += "&data="+encodeURIComponent(data);
			}
		}
		
		this._sent = true;
		this._onreadystatechangeWrapper();
		
		var scriptEl = document.createElement("script");
		scriptEl.src = url;
		scriptEl.type = "text/javascript";
		document.getElementsByTagName("head")[0].appendChild(scriptEl);
	};

	this.abort = function() {
		this._method = undefined;
		this._url = undefined;
		this._user = undefined;
		this._password = undefined;
		this._requestHeaders = undefined;
		
		this.status = undefined;
		this.statusText = undefined;
		this.responseText = undefined;
		this.responseXML = undefined;
		
		this._responseHeaders = undefined;
		if(this._instanceName != undefined)
		{
			ajaxProxyXMLHttpRequest._existingInstances[this._instanceName] = undefined;
			this._instanceName = undefined;
		}
		
		if(this.readyState != this.UNSENT && (this.readyState != this.OPENED || this._sent) && this.readyState != this.DONE)
		{
			this._sent = false;
			this.readyState = this.DONE;
			this._onreadystatechangeWrapper();
		}
		
		this.readyState = this.UNSENT;
	};
	
	this.getResponseHeader = function(header) {
		if(this.responseHeaders == undefined)
			return undefined;
		return this.responseHeaders[header];
	};
	
	this.getAllResponseHeaders = function() {
		return this.responseHeaders;
	};
	
	this._onreadystatechangeWrapper = function() {
		if(this.readyState == this.DONE)
			ajaxProxyXMLHttpRequest._existingInstances[this._instanceName] = undefined;
		this.onreadystatechange();
	};
	
	this._parseResponseXML = function() {
		try {
			if(window.DOMParser)
			{
				var parser = new DOMParser();
				this.responseXML = parser.parseFromString(this.responseText, "text/xml");
			}
			else
			{
				this.responseXML = new ActiveXObject("Microsoft.XMLDOM");
				this.responseXML.async = "false";
				this.responseXML.loadXML(this.responseText);
			}
		} catch(e) {
			this.responseXML = null;
		}
	};
	
	this._makeFullURL = function(url) {
		// See http://stackoverflow.com/questions/470832/getting-an-absolute-url-from-a-relative-one-ie6-issue
		var el = document.createElement("div");
		el.innerHTML = "<a href=\""+url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")+"\">x</a>";
		return el.firstChild.href;
	};
};

ajaxProxyXMLHttpRequest.URL = "http://osm.cdauth.eu/ajax-proxy/proxy.js";
ajaxProxyXMLHttpRequest._existingInstances = { };