import os

def get_api_config():
    """Get API URL - uses environment variable or defaults to placeholder for build replacement"""
    # Check for runtime environment variable first
    env_url = os.getenv('AGENSIGHT_API_URL')
    if env_url:
        return env_url
    
    # Default URL (will be replaced during build)
    return "{{AGENSIGHT_API_URL}}"