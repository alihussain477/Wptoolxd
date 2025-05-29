from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os
import time

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

NODE_SERVER = "http://localhost:3001"

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/generate-qr', methods=['POST'])
def generate_qr():
    data = request.json
    number = data.get('number')
    if not number:
        return jsonify({"error": "Number is required"}), 400

    # Call Node.js backend to generate QR & start session
    resp = requests.post(f"{NODE_SERVER}/generate", json={"number": number})
    if resp.status_code == 200:
        return jsonify({"status": "QR generation started"})
    else:
        return jsonify({"error": "Failed to start QR generation"}), 500

@app.route('/send-message', methods=['POST'])
def send_message():
    data = request.json
    number = data.get('number')
    target = data.get('target')
    message = data.get('message')

    if not (number and target and message):
        return jsonify({"error": "number, target and message required"}), 400

    # Call Node.js backend to send message
    resp = requests.post(f"{NODE_SERVER}/send", json={
        "number": number,
        "target": target,
        "message": message
    })
    return jsonify(resp.json()), resp.status_code

if __name__ == '__main__':
    os.makedirs('static/uploads', exist_ok=True)
    app.run(port=5000, debug=True)
