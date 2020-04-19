from http.server import HTTPServer, BaseHTTPRequestHandler
import ssl

class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):

    def __init__(self, *args):

        self.filepaths_served = ['base.html', 
                                 'js/main.js', 
                                 'js/adapter.js', 
                                 'js/rtc_communication.js']
        BaseHTTPRequestHandler.__init__(self, *args) 


    def do_GET(self):
        self.path = self.path[1:]
        print(self.path)
        if self.path in self.filepaths_served:
            self.send_response(200)
            self.end_headers()
            f = open(self.path, 'rb')
            self.wfile.write(f.read())
        else: 
            self.send_response(403)
            self.end_headers()
            self.wfile.write(b'Error 403: Forbidden')

'''
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        self.send_response(200)
        self.end_headers()
        response = BytesIO()
        response.write(b'This is POST request. ')
        response.write(b'Received: ')
        response.write(body)
        self.wfile.write(response.getvalue())
'''


# '0.0.0.0' = binds to any network device (not only local)
httpd = HTTPServer(('0.0.0.0', 8888), SimpleHTTPRequestHandler)

######## GENERATING NEW KEY AND CERT WITH OPENSSL #############
# one step (self signed): 
# openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365
#
# three steps (certificate signing request):
# openssl genrsa -out example.com.key 4096
# openssl req -new -sha256 -key example.com.key -out example.com.csr
# openssl x509 -req -sha256 -CA CA.pem -CAkey CA.key -days 730 -CAcreateserial -CAserial CA.srl
#         -extfile x509.ext -extensions server -in www.example.com.csr -out www.example.com.pem
###############################################################


httpd.socket = ssl.wrap_socket (httpd.socket, 
        keyfile="key.pem", 
        certfile='cert.pem', server_side=True)



httpd.serve_forever()