import socket
import re
import os


class Presentation_Server:

	def __init__(self):
		self.port = 8888
		self.address = "0.0.0.0"
		self.max_num_bytes = 4096 
		# 3MB = 3145728 bytes
		#4096

	def create_response_header(self, content: bytes, c_type, s_code):
		c_length = len(content)
		headers = "HTTP/1.1 %s\r\n" \
					"Content-Length: %d\r\n" \
					"Content-Type: %s\r\n\r\n" % \
					(s_code, c_length, c_type)
		# print("return header: ", headers)
		return str(headers).encode("utf-8")

	def run(self): 
		server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
		# AF_INET : IP socket (IPv4)
		# socket.SOCK_STREAM : TCP socket | socket.SOCK_DGRAM = UDP socket

		server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
		# allow reuse address and port directly after restart

		server_socket.bind((self.address, self.port))

		server_socket.listen()

		while(True):
			connection, client_addr = server_socket.accept()
			request = connection.recv(self.max_num_bytes)
			
			request_splitted = request.split(b'\r\n\r\n', maxsplit=1)

			request_header = request_splitted[0].decode("utf-8")
			request_content = request_splitted[1]
			
			if re.search(r'Content-Length: (.*)\r\n', request_header) is not None:
				request_content_length = int(re.search(r'Content-Length: (.*)\r\n', request_header).group(1))
			else: 
				request_content_length = 0
			
			while(len(request_content) < request_content_length):
				request_content += connection.recv(self.max_num_bytes)

			print('len request: ', len(request))
			print('len request header: ', len(request_header))
			print('len request content: ', len(request_content))
			print('total len request content: ', request_content_length)
			print(request_header)

			query = request_header.split(" ")[1][1:]
			splitquery = query.split("?")
			path = splitquery[0]
			

			if request_header.startswith("GET "):
				
				# is the file there?
				# print("INFO: trying to read file ", path)
				try:
					with open(path, "rb") as f:
						print("INFO: success reading file: ", path)
						s_code = "200 OK"
						c_type = ""
						# set content type by file extention
						if path.endswith(".html"):
							c_type = "text/html"
						elif path.endswith(".css"):
							c_type = "text/css"
						elif path.endswith(".js"):
							c_type = "text/javascript"
						elif path.endswith(".jpg"):
							c_type = "image/jpeg"
						elif path.endswith(".jpeg"):
							c_type = "image/jpeg"
						elif path.endswith(".png"):
							c_type = "image/jpeg"
						else:
							c_type = "text/plain"
						# file found, so content sources from file
						content = f.read()

						try:
							connection.sendall(
								self.create_response_header(content, c_type, s_code))
							connection.sendall(content)
						except Exception:
							print("ERROR: could not send data")
				except IOError:
					print("ERROR: 404: File not found: ", path)
					# we will send a message to the user too
					content = b"404 File not found!"
					s_code = "404 Not Found"
					c_type = "text/plain"
					try:
						connection.sendall(self.create_response_header(
							content, c_type, s_code))
					except Exception:
						print("ERROR: could not send data")

			elif request_header.startswith("POST"):
				if(path == "save-elements"):
					
					base_html = ""
					with open('base.html', 'rb') as f:
						base_html = f.read().decode('utf-8')

					imgs_fns = [fn for fn in os.listdir('imgs') if re.search(r'(\.png$|\.jpeg$|\.jpg$)', fn)]

					images_html = ''
					for img_fn in imgs_fns:
							images_html += '<div class="dropdown-option"><label>'
							images_html += img_fn
							images_html += '</label><img src="imgs/'
							images_html += img_fn
							images_html += '" alt="some image" draggable="false"></div>'

					elements_html = request_content.decode('utf-8')

					merged_html = re.sub(r'(<div class="container">)(.*)(</div>)', 
										 r'\1' + elements_html + r'\3',
										  base_html)


					merged_html = re.sub(r'(<div class="dropdown-content">)(.*)(</div>)', 
										 r'\1' + images_html + r'\3',
										  merged_html)

					
					with open('merged.html', 'wb') as f:
						f.write(merged_html.encode('utf-8'))
					
					'''
					with open('elements.html', 'wb') as f:
						f.write(elements_html.encode('utf-8'))
					'''

				elif(path == "upload-file"):
					print('##### NEW BYTES ########')
					request_content_boundary = re.search(r'boundary=(.*)(\r\n)', request_header)
					if request_content_boundary is not None:
						request_content_boundary = request_content_boundary.group(1) + '\r\n'
					
						parts = request_content.split(request_content_boundary.encode('utf-8'))
						
						for part in parts:
							part_splitted = part.split(b'\r\n\r\n', maxsplit=1)
							if(len(part_splitted) == 2):
								part_header = part_splitted[0].decode('utf-8')
								part_content = part_splitted[1]
								#print(part_header.decode('utf-8'))

								if re.search(r' filename="(.*)"\r\n', part_header) is not None:
									filename = re.search(r' filename="(.*)"\r\n', part_header).group(1)
									
									with open('imgs/' + filename, 'wb') as f:
										f.write(part_content)

									text_response = filename
									# we will send a message to the user too
									content = text_response.encode('utf-8')
									s_code = "200 OK"
									c_type = "text/plain"
									try:
										connection.sendall(self.create_response_header(
											content, c_type, s_code))
										connection.sendall(content)
									except Exception:
										print("ERROR: could not send data")


							else: 
								print("###############")
								print("THIS PART COULD NOT BE SPLITTED")
								print(part)
								print("##### END #####")

			# close the connection (in any case)
			try:
				connection.close()
			except Exception:
				print("ERROR: could not close connection")

if __name__ == "__main__":

	server = Presentation_Server()
	server.run()