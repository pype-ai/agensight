import json

def read_config(filename):
    with open(filename, 'r') as f:
        return json.load(f)

def write_config(filename, data):
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)