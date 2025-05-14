# AgenSight Server

This is the backend server for AgenSight, providing APIs for trace visualization and agent configuration management.

## Architecture

The server is built using FastAPI with the following components:

- **FastAPI Application**: Main API server with REST endpoints
- **SQLite Database**: Persistent storage for trace data and configurations
- **Flask Compatibility Layer**: Supports legacy API routes for backward compatibility

## API Routes

The server provides the following API endpoints:

### Trace Routes
- `GET /traces`: Get all traces
- `GET /traces/{trace_id}`: Get a specific trace by ID
- `GET /traces/span/{span_id}`: Get span details by span ID

### Config Routes
- `GET /config/versions`: Get all configuration versions
- `GET /config?version={version}`: Get a specific configuration by version
- `POST /config/sync`: Sync a configuration version to main
- `POST /config/commit`: Create a new configuration version
- `POST /update_agent`: Update an agent's configuration
- `POST /update_prompt`: Update a prompt configuration

## Setup and Installation

### Prerequisites
- Python 3.10+
- pip

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/agensight.git
cd agensight
```

2. Install dependencies:
```bash
pip install -r agensight/server/requirements.txt
```

3. Run the server:
```bash
python -m agensight.server.run
```

The server will start on http://localhost:5000 by default.

## Development

### Database Structure

The server uses SQLite with the following tables:

- `config_versions`: Stores configuration versions
- `traces`: Stores trace data
- `spans`: Stores detailed span information

### Adding New Routes

1. Create a new route file in the `routes` directory
2. Import and register the route in `app.py`
3. Make sure to add both FastAPI and Flask routes for backward compatibility

## License

[MIT License](LICENSE) 