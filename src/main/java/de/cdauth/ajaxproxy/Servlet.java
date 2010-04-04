package de.cdauth.ajaxproxy;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;
import java.util.zip.InflaterInputStream;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class Servlet extends HttpServlet
{
	private static final long serialVersionUID = -8231579131306573378L;

	public static final String USER_AGENT = "de.cdauth.ajaxproxy (http://gitorious.org/cdauths-map/ajax-proxy)";

	@Override
	protected void doGet(HttpServletRequest a_req, HttpServletResponse a_resp)
			throws ServletException, IOException
	{
		a_req.setCharacterEncoding("UTF-8");
		a_resp.setContentType("text/javascript; charset=UTF-8");

		String url = a_req.getParameter("url");

		String jsObject = a_req.getParameter("object");

		String method = a_req.getParameter("method");
		if(method != null)
			method = method.toUpperCase();
		
		String data = a_req.getParameter("data");
		String dataType = a_req.getParameter("dataType");
		
		String userAgent = a_req.getHeader("User-Agent");
		String remoteAddr = a_req.getRemoteAddr();
		
		proxyRequest(url, jsObject, method, data, dataType, userAgent, remoteAddr, a_resp.getWriter());
	}
	
	protected boolean checkURLAccess(URL a_url)
	{
		return true;
	}
	
	protected void proxyRequest(String a_url, String a_jsObj, String a_method, String a_data, String a_dataType, String a_remoteUserAgent, String a_remoteAddr, PrintWriter a_out)
	{
		try {
			if(a_url == null)
				throw new IllegalArgumentException("URL missing");
			URL url = new URL(a_url);
			if(url.getProtocol() != "http" && url.getProtocol() != "https")
				throw new IllegalArgumentException("Invalid protocol");
			else if(!checkURLAccess(url))
				throw new IllegalAccessException("URL access not allowed");
			if(a_method == null)
				throw new IllegalArgumentException("Method missing");
			else if(!a_method.equals("GET") && !a_method.equals("POST") && !a_method.equals("PUT") && !a_method.equals("DELETE"))
				throw new IllegalArgumentException("Invalid method");
			if(a_method.equals("GET") && (a_data != null || a_dataType != null))
				throw new IllegalArgumentException("Cannot send data with GET.");
			if((a_data != null) != (a_dataType != null))
				throw new IllegalArgumentException("Data and type have to be specified together.");
			
			HttpURLConnection conn = (HttpURLConnection)url.openConnection();
			conn.setRequestProperty("User-Agent", USER_AGENT);
			if(a_remoteAddr != null)
				conn.setRequestProperty("X-Forwarded-For", a_remoteAddr);
			if(a_remoteUserAgent != null)
				conn.setRequestProperty("X-Forwarded-User-Agent", a_remoteUserAgent);
			conn.setRequestProperty("Accept-Encoding", "gzip, deflate");
	
			conn.setRequestMethod(a_method);
			if(a_data != null && a_dataType != null)
			{
				conn.setDoOutput(true);
				conn.setRequestProperty("Content-Type", a_dataType+";charset=UTF-8");
				OutputStreamWriter send = new OutputStreamWriter(conn.getOutputStream(), "UTF-8");
				send.write(a_data);
				send.flush();
			}
			
			a_out.println(a_jsObj+".status = "+conn.getResponseCode());
			a_out.println(a_jsObj+".statusText = "+conn.getResponseMessage());
			a_out.println(a_jsObj+".responseHeaders = { };");
			for(Map.Entry<String,List<String>> responseHeader : conn.getHeaderFields().entrySet())
				a_out.println(a_jsObj+".responseHeaders["+escapeJS(responseHeader.getKey())+"] = "+escapeJS(implode(", ", responseHeader.getValue()))+";");
			a_out.println(a_jsObj+".readyState = "+a_jsObj+".HEADERS_RECEIVED;");
			a_out.println(a_jsObj+".onreadystatechangeWrapper();");
			a_out.flush();
			
			boolean receiveState = false;
			InputStream responseStream = (conn.getResponseCode() == 200 ? conn.getInputStream() : conn.getErrorStream());
			if("gzip".equalsIgnoreCase(conn.getContentEncoding()))
				responseStream = new GZIPInputStream(responseStream);
			else if("deflate".equalsIgnoreCase(conn.getContentEncoding()))
				responseStream = new InflaterInputStream(responseStream);
			InputStreamReader response = new InputStreamReader(responseStream, conn.getContentEncoding());
			char[] buffer = new char[8192];
			int read;
			while((read = response.read(buffer)) != -1)
			{
				if(!receiveState)
				{
					a_out.println(a_jsObj+".readyState = "+a_jsObj+".LOADING;");
					a_out.println(a_jsObj+".onreadystatechangeWrapper();");
					a_out.flush();
					receiveState = true;
					
					a_out.println(a_jsObj+".responseText = \"\";");
				}
				
				a_out.println(a_jsObj+".responseText += "+escapeJS(buffer, 0, read)+";");
				
				if(!response.ready())
				{
					a_out.println(a_jsObj+".parseResponseXML();");
					a_out.flush();
				}
			}
			
			a_out.println(a_jsObj+".parseResponseXML();");
			a_out.println(a_jsObj+".readyState = "+a_jsObj+".DONE;");
			a_out.println(a_jsObj+".onreadystatechangeWrapper();");
			a_out.flush();
		} catch(Exception e) {
			if(e instanceof IOException)
			{
				a_out.println(a_jsObj+".status = 502;");
				a_out.println(a_jsObj+".statusText = \"Bad Gateway\";");
			}
			else
			{
				a_out.println(a_jsObj+".status = 501;");
				a_out.println(a_jsObj+".statusText = \"Not implemented\";");
			}
			a_out.println(a_jsObj+".responseText = \"\" +");
			for(StackTraceElement line : e.getStackTrace())
				a_out.println(escapeJS(line.toString() + "\n")+" +");
			a_out.println("\"\";");
			a_out.println(a_jsObj+".readyState = "+a_jsObj+".DONE;");
			a_out.println(a_jsObj+".onreadystatechangeWrapper();");
			a_out.flush();
		}
	}
	
	public static String escapeJS(String a_str)
	{
		return escapeJS(a_str.toCharArray(), 0, a_str.length());
	}
	
	public static String escapeJS(char[] a_str, int a_offset, int a_length)
	{
		StringBuilder ret = new StringBuilder(a_length);
		int end = a_offset+a_length;
		for(int i=a_offset; i<end; i++)
		{
			char c = a_str[i];
			if(c != '"' && c != '\\' && ((c >= 0x20 && c <= 0x7e) || (c >= 0xa0 || c <= 0xff)))
				ret.append(c);
			else
			{
				String hex = Integer.toHexString(c);
				ret.append("\\u");
				for(int j=0; j<(4-hex.length()); j++)
					ret.append('0');
				ret.append(hex);
			}
		}
		return ret.toString();
	}
	
	public static String implode(String a_delim, List<String> a_list)
	{
		if(a_list.size() == 0)
			return "";

		int length = 0;
		for(String entry : a_list)
			length += entry.length();
		length += a_delim.length()*(a_list.size()-1);
		StringBuilder ret = new StringBuilder(length);
		boolean first = true;
		for(String entry : a_list)
		{
			if(first) first = false;
			else ret.append(a_delim);
			ret.append(entry);
		}
		return ret.toString();
	}
}
