python -m http.server --bind 0.0.0.0 7000
python .\server.py
openssl req -new -x509 -key dell.pem -out dell_cert.pem -days 365
