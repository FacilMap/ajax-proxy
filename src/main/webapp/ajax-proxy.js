/*
 * ajax-proxy is a web proxy that tunnels XMLHttpRequests through JavaScript function callbacks.
 * 
 * Copyright ⓒ 2010 Candid Dauth
 * 
 * This program is free software; you can redistribute it and/or modify it under the terms of the
 * GNU Affero General Public License as published by the Free Software Foundation; either version 3
 * of the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
 * even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License along with this program;
 * if not, see <http://www.gnu.org/licenses/>.
*/

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
 * 
 * The members are set by the JavaScript code the Servlet produces.
 */

var AjaxProxyXMLHttpRequest = function() {
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
	
	/**
	 * A key—value object that contains the headers the server sent.
	 * @var Object
	*/
	this._responseHeaders = undefined;
	/**
	 * The index in AjaxProxyXMLHttpRequest._existingInstances that this object has or undefined if it doesn’t
	 * have any. This is used to pass as <code>object</code> paramter to the Servlet.
	 * @var Number
	 */
	this._instanceName = undefined;

	/**
	 * The HTTP method to use. Is set by <code>open()</code>.
	 * @var String
	 */
	this._method = undefined;
	/**
	 * The HTTP/HTTPS URL to open. Is set by <code>open()</code>.
	 * @var String
	 */
	this._url = undefined;
	/**
	 * The user name to log in with to the URL. Is set by <code>open()</code>.
	 * @var String
	 * @todo Implement this.
	 */
	this._user = undefined;
	/**
	 * The password to log in with to the URL. Is set by <code>open()</code>.
	 * @var String
	 * @todo Implement this.
	 */
	this._password = undefined;
	/**
	 * The HTTP headers to send. Is set by <code>setRequestHeader()</code>.
	 * @var String
	 */
	this._requestHeaders = undefined;
	
	/**
	 * Whether the <code>send()</code> method has been invoked. Known as the “send() flag” in the standard.
	 * @var Boolean
	 */
	this._sent = false;
	
	/**
	 * A <code>setTimeout()</code> object that makes the connection time out after AjaxProxyXMLHttpRequest.timeout
	 * seconds.
	 * @var Object
	 */
	this._timeout = undefined;

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
			AjaxProxyXMLHttpRequest._existingInstances[this._instanceName] = undefined;
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
		
		do
			this._instanceName = Math.round(Math.random() * new Date().getTime());
		while(AjaxProxyXMLHttpRequest._existingInstances[this._instanceName] != undefined);
		AjaxProxyXMLHttpRequest._existingInstances[this._instanceName] = this;
		
		var url = AjaxProxyXMLHttpRequest.URL;
		url += (url.indexOf('?') == -1 ? "?" : "&") +
		       "url="+encodeURIComponent(this._url) +
		       "&object="+encodeURIComponent("AjaxProxyXMLHttpRequest._existingInstances["+this._instanceName+"]") +
		       "&method="+encodeURIComponent(this._method);
		
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

		if(AjaxProxyXMLHttpRequest.debug)
			alert(url);
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
			AjaxProxyXMLHttpRequest._existingInstances[this._instanceName] = undefined;
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
	
	/**
	 * This is called by the Servlet every time the <code>onreadystatechange</code> event is to be invoked according
	 * to the standard.
	 * @return void
	 */
	this._onreadystatechangeWrapper = function() {
		if(this.readyState == this.DONE)
		{
			AjaxProxyXMLHttpRequest._existingInstances[this._instanceName] = undefined;
			if(this._timeout != undefined)
				clearTimeout(this._timeout);
		}
		this.onreadystatechange();
	};
	
	/**
	 * Is called by the Servlet when new data is appended to the <code>responseText</code>. This should use the
	 * browsers XML parser to set the <code>responseXML</code> property accordingly. If the text cannot be parsed,
	 * it should be set to <code>null</code> without raising an error.
	 * @return void
	 */
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
				this.responseXML.async = false;
				this.responseXML.loadXML(this.responseText);
			}
		} catch(e) {
			this.responseXML = null;
		}
	};
	
	/**
	 * Makes an absolute HTTP/HTTPS URL from any URL relative to the calling page.
	 * @param String url A relative or absolute URL.
	 * @return String The absolute representation of the <code>url</code> parameter.
	 */
	this._makeFullURL = function(url) {
		// See http://stackoverflow.com/questions/470832/getting-an-absolute-url-from-a-relative-one-ie6-issue
		var el = document.createElement("div");
		el.innerHTML = "<a href=\""+url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")+"\">x</a>";
		return el.firstChild.href;
	};
	
	/**
	 * Is called by the Servlet every now and then. Resets the connection to time out after
	 * AjaxProxyXMLHttpRequest.timeout seconds.
	 * @return void
	 */
	this._resetTimeout = function() {
		if(this._timeout != undefined)
			clearTimeout(this._timeout);
		if(AjaxProxyXMLHttpRequest.timeout > 0)
		{
			var req = this;
			this._timeout = setTimeout(function(){ req._timeoutCallback(); }, AjaxProxyXMLHttpRequest.timeout);
		}
	};
	
	/**
	 * Is called when the connection times out.
	 * @return void
	 */
	this._timeoutCallback = function() {
		this.status = 504;
		this.statusText = "Gateway Timeout";
		
		this.readyState = this.DONE;
		this._onreadystatechangeWrapper();
	};
};

AjaxProxyXMLHttpRequest.UNSENT = 0;
AjaxProxyXMLHttpRequest.OPENED = 1;
AjaxProxyXMLHttpRequest.HEADERS_RECEIVED = 2;
AjaxProxyXMLHttpRequest.LOADING = 3;
AjaxProxyXMLHttpRequest.DONE = 4;

/**
 * The URL of the proxy.js Servlet to use.
 * @var String
 */
AjaxProxyXMLHttpRequest.URL = "http://osm.cdauth.eu/ajax-proxy/proxy.js";

/**
 * A timeout in seconds. When no data is received during this amount of time, the status changes to READY with
 * HTTP status 504 Gateway Timeout. Set to anything <= 0 to disable. The Servlet will usually send something
 * every 5 seconds, even if no data is received.
 * @var Number
 */
AjaxProxyXMLHttpRequest.timeout = 30;

/**
 * If this is true, some debugging alert boxes will be shown.
 * @var Boolean
 */
AjaxProxyXMLHttpRequest.debug = false;

/**
 * Contains all AjaxProxyXMLHttpRequest objects that are currently waiting for a response from the Servlet.
 * The <code>_instanceName</code> properties are used as indexes to reference them by the Sevlet. Objects are
 * added by the <code>send()</code> method.
 * @var Object
 */
AjaxProxyXMLHttpRequest._existingInstances = { };
