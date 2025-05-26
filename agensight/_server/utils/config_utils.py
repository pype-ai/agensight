"""
Utilities for configuration management
"""
import os
import json
import logging
import datetime
import copy
import glob
import re
import sys
from .file_ops import read_config, write_config
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)

# Constants
def get_user_dir():
    """
    Return the directory where the user is running the SDK (usually their project root).
    This is where agensight.config.json and .agensight should be created.
    """
    project_root = os.getcwd()
    logger.info(f"Using user's current working directory as project root: {project_root}")
    return project_root

def get_config_dir():
    """Get the configuration directory (.agensight in the user's project root)"""
    user_dir = get_user_dir()
    config_dir = os.path.join(user_dir, ".agensight")
    os.makedirs(config_dir, exist_ok=True)
    return config_dir

def get_config_file_path():
    """Get the path to the main config file"""
    return os.path.join(get_config_dir(), "config.json")

def get_version_dir_path():
    """Get the path to the versions directory"""
    version_dir = os.path.join(get_config_dir(), "versions")
    os.makedirs(version_dir, exist_ok=True)
    return version_dir

# Original constants - replace these with the function calls
# CONFIG_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "data"))
# CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")
# VERSIONS_DIR = os.path.join(CONFIG_DIR, "versions")
# VERSION_HISTORY_FILE = os.path.join(VERSIONS_DIR, "history.json")

# Define VERSION_HISTORY_FILE as a function to match the others
def get_version_history_file_path():
    """Get the path to the version history file"""
    return os.path.join(get_version_dir_path(), "history.json")

VERSION_FILE_PATTERN = 'version_{}.json'  # Format for individual version files

def ensure_version_directory():
    """
    Ensure the .agensight directory exists for version storage
    If it doesn't exist, create it and initialize with the current config
    
    Returns:
        bool: True if directory exists or was created successfully, False otherwise
    """
    os.makedirs(get_config_dir(), exist_ok=True)
    os.makedirs(get_version_dir_path(), exist_ok=True)
    
    # Create history file if it doesn't exist
    if not os.path.exists(get_version_history_file_path()):
        with open(get_version_history_file_path(), 'w') as f:
            json.dump([], f)
    
    return True


def get_version_file_path(version):
    """
    Get the file path for a specific version
    
    Args:
        version (str): The version number
        
    Returns:
        str: Full path to the version file
    """
    # Add debug logging to help diagnose path formatting
    logger.info(f"[DEBUG-CRITICAL] Building version file path for version: '{version}' (type: {type(version)})")
    
    # Ensure version is a string
    version_str = str(version)
    
    # Format the filename using the pattern
    filename = VERSION_FILE_PATTERN.format(version_str)
    
    # Construct the full path
    full_path = os.path.join(get_version_dir_path(), filename)
    
    logger.info(f"[DEBUG-CRITICAL] Generated version file path: '{full_path}'")
    
    return full_path


def get_version_history():
    """
    Get all versions from the version history (metadata only)
    
    Returns:
        list: A list of version metadata (without the full configs)
    """
    try:
        ensure_version_directory()
        
        # Get all version files
        version_pattern = os.path.join(get_version_dir_path(), 'version_*.json')
        version_files = glob.glob(version_pattern)
        
        # Extract metadata from each file
        result = []
        for file_path in version_files:
            try:
                with open(file_path, 'r') as f:
                    version_data = json.load(f)
                    
                # Extract just the metadata
                if isinstance(version_data, dict) and 'version' in version_data:
                    result.append({
                        'version': version_data.get('version'),
                        'commit_message': version_data.get('commit_message', 'No commit message'),
                        'timestamp': version_data.get('timestamp', '')
                    })
            except Exception as e:
                logger.error(f"Error loading version from {file_path}: {e}")
                continue
                
        return result
    except Exception as e:
        logger.error(f"Error getting version history: {e}")
        return []


def get_latest_version_number():
    """
    Get the latest version number from the version history
    
    Returns:
        str: The latest version number or '0.0.1' if no versions exist
    """
    try:
        versions = get_version_history()
        if not versions:
            logger.info("[VERSION] No versions found, returning default 0.0.1")
            return '0.0.1'
            
        # Sort versions by timestamp (newest first)
        versions.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        latest_version = versions[0]['version']
        logger.info(f"[VERSION] Latest version is {latest_version}")
        return latest_version
    except Exception as e:
        logger.error(f"[VERSION] Error getting latest version number: {str(e)}")
        return '0.0.1'


def get_next_version_number(latest_version, specified_version=None):
    """
    Calculate the next version number based on semantic versioning
    
    Args:
        latest_version (str): The current version string
        specified_version (str, optional): User-specified version
        
    Returns:
        str: The next version number to use
    """
    # If a version is specified and doesn't already exist, use it
    if specified_version:
        # Check if the specified version already exists
        version_path = get_version_file_path(specified_version)
        if not os.path.exists(version_path):
            return specified_version
    
    # Otherwise, calculate the next version number
    parts = latest_version.split('.')
    if len(parts) != 3:
        return "1.0.0"
    
    # Increment patch version
    major, minor, patch = [int(p) for p in parts]
    patch += 1
    
    return f"{major}.{minor}.{patch}"


def get_version(version):
    """
    Get a specific version from the version history
    
    Args:
        version (str): The version number to retrieve
        
    Returns:
        dict: The config at that version, or None if not found
    """
    try:
        version_path = get_version_file_path(version)
        if not os.path.exists(version_path):
            logger.warning(f"Version file not found: {version_path}")
            return None
            
        with open(version_path, 'r') as f:
            version_data = json.load(f)
            
        # Return just the config, not the metadata
        return version_data.get('config')
    except Exception as e:
        logger.error(f"Error getting version {version}: {e}")
        return None


def get_version_with_metadata(version_number):
    """
    Get a specific version with its metadata from the version history
    
    Args:
        version_number (str): The version number to retrieve
        
    Returns:
        dict: The full version data including metadata, or None if not found
    """
    try:
        version_path = get_version_file_path(version_number)
        if not os.path.exists(version_path):
            logger.warning(f"Version file not found: {version_path}")
            return None
            
        with open(version_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error getting version with metadata {version_number}: {e}")
        return None


def save_version(config, commit_message, sync_to_main=False, use_existing_version=None):
    """
    Save a version of the config to the version history
    
    Args:
        config (dict): The configuration to save
        commit_message (str): A message describing the changes
        sync_to_main (bool): Whether to update the main config file
        use_existing_version (str, optional): If provided, update this version instead of creating a new one
        
    Returns:
        str: The version number that was saved
    """
    ensure_version_directory()
    
    try:
        # If a specific version is requested to be updated
        if use_existing_version:
            logger.info(f"[DEBUG-CRITICAL] Attempting to update existing version: {use_existing_version}")
            version_path = get_version_file_path(use_existing_version)
            
            if os.path.exists(version_path):
                logger.info(f"[DEBUG-CRITICAL] Found existing version file to update: {version_path}")
                success = update_version(use_existing_version, config, commit_message)
                if success:
                    logger.info(f"[DEBUG-CRITICAL] Successfully updated existing version: {use_existing_version}")
                    
                    # Update the main config file if requested
                    if sync_to_main:
                        with open(get_config_file_path(), 'w') as f:
                            json.dump(config, f, indent=2)
                        logger.info(f"[DEBUG-CRITICAL] Updated main config file with version {use_existing_version}")
                    
                    return use_existing_version
                else:
                    logger.error(f"[DEBUG-CRITICAL] Failed to update existing version: {use_existing_version}")
                    # Fall through to create a new version
            else:
                logger.warning(f"[DEBUG-CRITICAL] Requested version {use_existing_version} does not exist, will create new version")
                # Fall through to create a new version
                
        # Generate version number
        latest_version = get_latest_version_number()
        
        # If no versions exist, use 1.0.0 as the first version
        if latest_version == '0.0.1' and not os.path.exists(get_version_file_path('0.0.1')):
            new_version = '1.0.0'
            logger.info(f"[SAVE_VERSION] Setting initial version to 1.0.0")
        else:
            # Otherwise, calculate the next version number
            new_version = get_next_version_number(latest_version)
            logger.info(f"[SAVE_VERSION] Generated next version {new_version} from latest {latest_version}")
        
        # Create version metadata
        timestamp = datetime.datetime.now().isoformat()
        message = commit_message or 'Configuration update'
        
        # Make a clean copy of the config to save
        config_copy = copy.deepcopy(config)
        
        # Remove any temporary fields that shouldn't be versioned
        if isinstance(config_copy, dict):
            if 'temp' in config_copy:
                del config_copy['temp']
        
        # Create the version file
        version_data = {
            'version': new_version,
            'commit_message': message,
            'timestamp': timestamp,
            'config': config_copy
        }
        
        version_path = get_version_file_path(new_version)
        with open(version_path, 'w') as f:
            json.dump(version_data, f, indent=2)
        
        logger.info(f"[SAVE_VERSION] Saved version {new_version} with message: {message}")
        
        # Update the main config file if requested
        if sync_to_main:
            with open(get_config_file_path(), 'w') as f:
                json.dump(config_copy, f, indent=2)
            logger.info(f"[SAVE_VERSION] Updated main config file")
            
        return new_version
    except Exception as e:
        logger.error(f"[SAVE_VERSION] Error saving version: {str(e)}", exc_info=True)
        return None


def rollback_to_version(version, commit_message=None, sync_to_main=False):
    """
    Roll back to a specific version of the configuration
    
    Args:
        version (str): The version to roll back to
        commit_message (str, optional): A message describing the rollback
        sync_to_main (bool): Whether to update the main config file
        
    Returns:
        dict: Result dict with success, version and message
    """
    try:
        # Get the requested version
        rollback_config = get_version(version)
        if not rollback_config:
            return {
                'success': False,
                'error': f"Version {version} not found"
            }
            
        # Create default commit message if none provided
        if not commit_message:
            commit_message = f"Rolled back to version {version}"
            
        # Save as a new version
        new_version = save_version(rollback_config, commit_message, sync_to_main)
        if not new_version:
            return {
                'success': False,
                'error': 'Failed to save rollback version'
            }
            
        return {
            'success': True,
            'version': new_version,
            'synced_to_main': sync_to_main,
            'message': f"Successfully rolled back to version {version} as new version {new_version}"
        }
    except Exception as e:
        logger.error(f"Error rolling back config: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def create_default_config():
    """
    Create a default configuration when none is available
    
    Returns:
        dict: A default configuration with standard agents
    """
    logger.warning("Creating default configuration")
    return {
        "agents": [
            {
                "name": "Default Agent",
                "prompt": "You are a helpful AI assistant.",
                "variables": [],
                "modelParams": {
                    "model": "gpt-4o-mini",
                    "temperature": 0.7,
                    "top_p": 1.0,
                    "max_tokens": 2000
                }
            }
        ],
        "connections": []
    }


def initialize_config():
    """
    Initialize the configuration system.
    
    This function:
    1. Checks if agensight.config.json exists in the project root
    2. If it exists, copies it to the .agensight directory
    3. Creates version 1.0.0 in the versions directory
    4. If agensight.config.json doesn't exist, creates a default one
    
    Returns:
        dict: The current config
    """
    try:
        logger.info("[CONFIG] Initializing config system...")
        ensure_version_directory()
        
        # First check if agensight.config.json exists in the project root
        user_dir = get_user_dir()
        user_config_path = os.path.join(user_dir, 'agensight.config.json')
        logger.info(f"[CONFIG] Checking for user config at: {user_config_path}")
        
        config = None
        
        # If the user has a config file in their project root, use that
        if os.path.exists(user_config_path):
            logger.info(f"[CONFIG] Found user config: {user_config_path}")
            try:
                with open(user_config_path, 'r') as f:
                    config = json.load(f)
                logger.info(f"[CONFIG] Successfully loaded user config")
                
                # Copy it to our internal config location if it doesn't exist there yet
                if not os.path.exists(get_config_file_path()):
                    with open(get_config_file_path(), 'w') as f:
                        json.dump(config, f, indent=2)
                    logger.info(f"[CONFIG] Copied user config to internal location: {get_config_file_path()}")
            except Exception as e:
                logger.error(f"[CONFIG] Error loading user config: {str(e)}")
                config = None
        
        # If we don't have a config yet, check if we have one in our internal location
        if not config and os.path.exists(get_config_file_path()):
            logger.info(f"[CONFIG] No user config found, loading internal config")
            try:
                with open(get_config_file_path(), 'r') as f:
                    config = json.load(f)
                logger.info(f"[CONFIG] Successfully loaded internal config")
            except Exception as e:
                logger.error(f"[CONFIG] Error loading internal config: {str(e)}")
                config = None
                
        # If we still don't have a config, create a default one
        if not config:
            logger.info(f"[CONFIG] No config found, creating default")
            config = create_default_config()
            
            # Save it to our internal location
            with open(get_config_file_path(), 'w') as f:
                json.dump(config, f, indent=2)
            logger.info(f"[CONFIG] Saved default config to internal location: {get_config_file_path()}")
            
            # Also save it to the user's project root if they don't have one
            if not os.path.exists(user_config_path):
                with open(user_config_path, 'w') as f:
                    json.dump(config, f, indent=2)
                logger.info(f"[CONFIG] Saved default config to user location: {user_config_path}")
        
        # Check if we have any versions saved yet
        version_history = get_version_history()
        if not version_history:
            # Create the first version (1.0.0)
            logger.info(f"[CONFIG] No versions found, creating initial version 1.0.0")
            result = save_version(config, "Initial version", True)
            if result:
                logger.info(f"[CONFIG] Successfully created initial version: {result}")
            else:
                logger.error(f"[CONFIG] Failed to create initial version")
        
        return config
        
    except Exception as e:
        logger.error(f"[CONFIG] Error initializing config: {str(e)}")
        # Return a default config as fallback
        return create_default_config()


def update_version(version, config, commit_message=None):
    """
    Update a specific version file with new config data
    
    Args:
        version (str): The version number to update
        config (dict): The updated configuration
        commit_message (str, optional): A new commit message, or None to keep existing
        
    Returns:
        bool: True if update was successful, False otherwise
    """
    try:
        logger.info(f"[DEBUG-CRITICAL] update_version called for version: {version}")
        logger.info(f"[DEBUG-CRITICAL] version type: {type(version)}")
        
        version_path = get_version_file_path(version)
        logger.info(f"[DEBUG-CRITICAL] version_path: {version_path}")
        
        if not os.path.exists(version_path):
            logger.warning(f"[DEBUG-CRITICAL] Version file not found: {version_path}")
            # Try to list all available version files for debugging
            try:
                version_dir = get_version_dir_path()
                existing_files = os.listdir(version_dir)
                logger.info(f"[DEBUG-CRITICAL] Available version files: {existing_files}")
            except Exception as e:
                logger.error(f"[DEBUG-CRITICAL] Error listing version files: {str(e)}")
            return False
            
        # Read existing version data
        with open(version_path, 'r') as f:
            version_data = json.load(f)
            
        logger.info(f"[DEBUG-CRITICAL] Read existing version data with keys: {list(version_data.keys())}")
        
        # Make a clean copy of the config
        config_copy = copy.deepcopy(config)
        
        # Remove any temporary fields
        if isinstance(config_copy, dict):
            if 'temp' in config_copy:
                del config_copy['temp']
        
        # Update config but keep version number
        version_data['config'] = config_copy
        
        # Update commit message if provided
        if commit_message:
            logger.info(f"[DEBUG-CRITICAL] Updating commit message to: {commit_message}")
            version_data['commit_message'] = commit_message
            
        # Update timestamp
        version_data['timestamp'] = datetime.datetime.now().isoformat()
        
        # Write back to the file
        with open(version_path, 'w') as f:
            json.dump(version_data, f, indent=2)
            
        logger.info(f"[DEBUG-CRITICAL] Successfully updated version {version} with message: {version_data['commit_message']}")
        return True
    except Exception as e:
        logger.error(f"[DEBUG-CRITICAL] Error updating version {version}: {str(e)}", exc_info=True)
        return False 