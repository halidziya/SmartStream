from http.server import HTTPServer, BaseHTTPRequestHandler, SimpleHTTPRequestHandler
import ssl


httpd = HTTPServer(('0.0.0.0', 443), SimpleHTTPRequestHandler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('dell_cert.pem', "dell.pem",)
httpd.socket = context.wrap_socket (httpd.socket, server_side=True)

httpd.serve_forever()