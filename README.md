**ajax-proxy** is a small web application proxying AJAX requests through JavaScript function calls to circumvent the Same Origin Policy.


Installation
============

Compile
-------

ajax-proxy uses [Maven] (http://maven.apache.org/) as build tool and obviously [Git] (http://www.git-scm.com/) for source code management. Create a WAR file like this:

```bash
git clone https://github.com/FacilMap/ajax-proxy.git
cd ajax-proxy
mvn package
```

A WAR file is created in `target/ajax-proxy-SNAPSHOT.war`.

Deploy
------

ajax-proxy runs in a Servlet container such as [Apache Tomcat] (http://tomcat.apache.org/). To deploy it, upload it using the Tomcat Manager or just put it in the `webapps` directory.

After deploying, edit the `ajax-proxy.js` file and set the correct URL to your `proxy.js` path at the end.

### Configuring URL restrictions

To prevent your server becoming an open proxy (see [Security](#Security)), you can specify which URLs may be accessed through your ajax-proxy. By default, all URLs ending in `.xml`, `.kml`, `.gpx` and `.osm`, and the OpenStreetMap API are permitted. The exact pattern is configured in the file `WEB-INF/web.xml` in the web application (which you would edit after you have deployed the application). Look for the init parameter `urlWhiteList` there, it is a regular expression that the whole URL has to match.


Usage
=====

To use ajax-proxy in your web application, you have to embed the JavaScript library in your web page. An installation of ajax-proxy is running on https://api.facilmap.org/ajax-proxy/ (it allows to proxy OpenStreetMap-related XML files), use the following code for that:

```html
<script type="text/javascript" src="https://api.facilmap.org/ajax-proxy/ajax-proxy.js"></script>
```

You might also download that JavaScript file and copy it to your web page.

Always make sure that the URL to the `proxy.js` (which is actually a dynamic Java servlet) is configured correctly in the JavaScript file, else set it using the following code:

```html
<script type="text/javascript">
	ajaxProxyXMLHttpRequest.URL = "http://api.facilmap.org/ajax-proxy/proxy.js";
</script>
```

Now you can open XML requests using the standard [XMLHttpRequest] (http://www.w3.org/TR/XMLHttpRequest/) interface (note that synchronous mode is not supported):

```html
<script type="text/javascript">
	var req = new AjaxProxyXMLHttpRequest();
	req.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200)
				alert("The XML code is " + this.responseText + " and the XML element is " + this.responseXML);
			else
				alert("There was an error.");
		}
	};
	req.open("GET", "http://example.com/example.xml");
	req.send();
</script>
```


Architecture
============

Same Origin Policy
------------------

### What is the Same Origin Policy?

The Same Origin Policy (see [Wikipedia] (http://http://en.wikipedia.org/wiki/Same_origin_policy)) is a security restriction implemented in all modern web browsers. Basically said, it prevents a web site on one server to read the content of a different web site on another server using JavaScript.

The reason why it exists is that many web sites store login information in cookies. For example, when you visit your online banking site on http://banking.example.com/, you usually get a login form where you have to enter your account number and a passphrase. When you have successfully logged in, you are still on http://banking.example.com/, but your browser has now stored a cookie containing a unique session ID. From that cookie, the web site can tell that you are logged in. Now imagine a web site that does not belong to your bank would open the page http://banking.example.com/ in the background. As JavaScript is executed in the browser, it would transmit the session cookie to the banking site and the malicious web site could read out confidential information from it. The Same Origin Policy prevents these cross-site requests.

Of course, the easier solution would be that the browsers just do not transmit cookies when a web site is accessed through JavaScript. But unfortunately, this is just not the way it is.

### Why is it necessary to circumvent it?

Technologies like AJAX have spread over the Internet during the last years and have made it usual to load data in the background using JavaScript. More and more services are offered in the web that you can embed in your own home page. Imagine for example that you want to automatically translate a text that your user typed on your web page to another language using the Google Translation AJAX API. AJAX is XML over JavaScript, so the JavaScript would have to read XML data from the Google Server. This is not possible due to the Same Origin Policy. (Note: Google probably actually uses another approach similar to ajax-proxy.)

The only proper way around this is to configure a proxy on one’s own server that reads the data from Google on the server side and then sends it to the client. This way, it looks to the browser as if the content came from the web site itself, so the Same Origin Policy does not apply. As your proxy does not know the cookies that your browser has stored for the Google site, this is not a security risk. But it means that everyone using your JavaScript API has to install a server-side proxy on their web page, which is some work and not possible on every server.

ajax-proxy
----------

### How does ajax-proxy work?

There is one exception from the Same Origin Policy: JavaScript source files. You can embed scripts lying on a remote server in your web page using `<script>` tags without any cross-site restrictions applying. This is not a security hole as browsers do not send cookies to embedded JavaScript files.

ajax-proxy is a web application that runs on a server and from there connects to the web sites you want to read XML files from, similar like a proxy. But instead of sending the XML files to the browser directly, it dynamically creates JavaScript code that a web page can embed using `<script>` tags. This JavaScript code is executed by the browser and creates the XML objects you originally wanted to receive.

Take this simlified example as a better explanation. You want to access the XML file http://example.com/example.xml from your web page which runs on http://example.org/ (notice the different TLD), but the Same Origin Policy prevents you from doing so. Now you install ajax-proxy on http://example.org/ajax-proxy and use that instead on your web page:

```html
<script type="text/javascript" src="http://example.org/ajax-proxy?url=http://example.com/example.xml"></script>
```

Now ajax-proxy creates JavaScript code looking this way (this is only an example, the JavaScript code will actually look quite different):

```html
ajaxProxyCallback('<xml><this-is-the-content /><of-the file="http://example.com/example.xml" /></xml>');
```

The only thing you would have to do now is implement the ajaxProxyCallback function on your web page to receive the XML data (which you actually don’t have to do yourself, as the http-proxy JavaScript library does it for you). The great advantage of this approach is that ajax-proxy can be installed on any host you like, it is not restricted to the server your web page runs on. Theoretically, one running instance would suffice for the whole Internet. It is now the responsibility of the one who creates a JavaScript library or of a third party to install the proxy, not of the one who uses it.

ajax-proxy comes with a JavaScript library that implements the [XMLHttpRequest] (http://www.w3.org/TR/XMLHttpRequest/) interface, which is usually used by JavaScript applications to do AJAX requests. Using this, you can use ajax-proxy the exact same way as you would normally do AJAX, the only thing you have to change in your existing web application is to use the AjaxProxyXMLHttpRequest class instead of the XMLHttpRequest class. Everything else, the creation of the `<script>` tags and the implementation of the callback functions, is automatically done by the ajax-proxy JavaScript library. For instructions how to use it, see [Usage](#Usage).

### Isn’t this an insecure hack?

See the section about [Security](#Security) for this.


Security
========

Browser security
----------------

The way ajax-proxy circumvents the Same Origin Policy (see [Architecture](#Architecture)) might seem like a hack at first that seems to be insecure and not supported in future versions of the web browsers. These assumptions are not true.

ajax-proxy does not introduce any security risks to the browser. The security risks of cross-site requests come from cookies that would enable a web page to read confident data from another web page where the user is logged in. As all requests created by ajax-proxy are directed to the server where ajax-proxy runs, no cookies are transmitted, neither does the server-side forward any cookies to the destination. Thus ajax-proxy can only access information that is publicly available and cannot steal confident data.

As this Same Origin Policy “workaround” does not impose any security risk, there is no reason why it should not be supported by future versions of the web browsers. Actually, this technique is widely used accross the Internet, many large companies providing JavaScript APIs use it. Thus it is very unlikely that the support for it will cease in the near future, as thousands of major websites would break.

Someone might argue that it is not a very proper way to include JavaScript files from other servers. It is true that if one of these servers is hacked and the JavaScript is changed, confidential data that a user enters on your website might be stolen. Only include JavaScript from servers you trust, do not use an ajax-proxy installation by someone you don’t know! On the other hand, running a proxy on one’s own server (which is the alternative to ajax-proxy) might introduce even bigger security issues depending on your setup, if it is possible at all.

Server security
---------------

You have to be aware that by installing ajax-proxy, you open a proxy on your server, using which all web sites configured in the `urlWhiteList` parameter (see [Installation](#Installation)) can be accessed.

A proxy might be used as a way to obscure the origin of an attack. To prevent this, ajax-proxy sends the original client IP address in the `X-Forwarded-For` HTTP header and the client’s user agent in the `X-Forwarded-User-Agent`. This way, the origin of an attack tunneled through the proxy can be determined. Depending on the jurisdiction in your country, you might still be liable though.

You also have to be aware of the traffic that running an ajax-proxy causes. The XML data isn’t transferred from the server to the browser directly, but instead it is received by the proxy first and then sent to the browser, so it creates twice the traffic on the proxy server. ajax-proxy tries to use GZIP compression whenever possible though to minimise the traffic.