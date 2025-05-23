from flask import Blueprint, jsonify, request
import json
import logging
import os
from ..utils.config_utils import (
    get_version, get_version_history, ensure_version_directory,
    save_version, rollback_to_version, create_default_config, initialize_config,
    get_config_file_path, get_user_dir
)
import datetime
from fastapi import APIRouter, HTTPException, Query, Body, Request, Response
from typing import Dict, List, Optional, Any

from ..data_source import data_source
from ..models import (
    ConfigVersion,
    CommitRequest, 
    SyncRequest, 
    UpdateAgentRequest, 
    ApiResponse
)

logger = logging.getLogger(__name__)
# Keep the Flask blueprint for backward compatibility
config_bp = Blueprint('config', __name__)

# Create FastAPI router
config_router = APIRouter(tags=["config"])

@config_router.get("/config/versions", response_model=List[ConfigVersion])
async def get_config_versions_api():
    """Get all configuration versions"""
    try:
        # Use the file-based approach instead of database
        ensure_version_directory()
        versions = []
        
        # Get historical versions from file system
        try:
            version_history = get_version_history()
            
            # Add all versions from history
            for version_info in version_history:
                versions.append({
                    'version': version_info.get('version'),
                    'commit_message': version_info.get('commit_message', 'No commit message'),
                    'timestamp': version_info.get('timestamp', ''),
                    'is_current': False  # Will update the current one below
                })
            
            logger.info(f"Found {len(versions)} versions in history: {[v['version'] for v in versions]}")
        except Exception as e:
            logger.error(f"Error loading version history: {e}")
            
        # Try to find which version to mark as current
        try:
            if os.path.exists(get_config_file_path()) and versions:
                with open(get_config_file_path()) as f:
                    current_config = json.load(f)
                
                # Look for an exact match with the current config
                current_found = False
                for version in versions:
                    version_config = get_version(version['version'])
                    if version_config and current_config == version_config:
                        version['is_current'] = True
                        current_found = True
                        logger.info(f"Marked version {version['version']} as current (exact match)")
                        break
                
                # If no match found, just mark the first/newest version as current
                if not current_found and versions:
                    versions[0]['is_current'] = True
                    logger.info(f"No exact match found, marking first version {versions[0]['version']} as current")
        except Exception as e:
            logger.error(f"Error finding current version: {e}")
            # Mark the first version as current if we can't determine
            if versions:
                versions[0]['is_current'] = True
                logger.info(f"Marked first version as current due to error: {e}")
                
        # If no versions found at all, create a default entry
        if not versions:
            logger.warning("No versions found, creating default entry")
            versions.append({
                'version': '1.0.0',
                'commit_message': 'Initial version',
                'timestamp': datetime.datetime.now().isoformat(),
                'is_current': True
            })
            
        # Sort versions by timestamp (newest first)
        try:
            versions.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        except Exception as e:
            logger.error(f"Error sorting versions: {e}")
            
        # Make sure at least one version is marked current
        if versions and not any(v['is_current'] for v in versions):
            versions[0]['is_current'] = True
            logger.info(f"No version marked as current, defaulting to first version")
        
        logger.info(f"Returning {len(versions)} configuration versions from file system")
        for v in versions:
            logger.info(f"Version: {v['version']}, Message: {v['commit_message']}, Current: {v['is_current']}")
            
        return versions
    except Exception as e:
        logger.error(f"Error getting config versions: {str(e)}")
        # Return a default version list instead of an error to make the UI work
        logger.info("Returning fallback version list due to error")
        
        # Create a fallback version
        version = ConfigVersion(
            version="1.0.0",
            commit_message="Initial version",
            timestamp=datetime.datetime.now().isoformat(),
            is_current=True
        )
        
        return [version]

@config_router.get("/config", response_model=Dict)
async def get_config_api(version: str = Query(...)):
    """Get a specific configuration by version"""
    try:
        # Check if we're requesting the current version
        if version == "current":
            # Try to load from the .agensight/config.json file first
            config_path = get_config_file_path()
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    config = json.load(f)
                logger.info(f"Loaded current config from {config_path}")
            else:
                # If not found, try to load from the root agensight.config.json
                user_dir = os.getcwd()
                root_config_path = os.path.join(user_dir, 'agensight.config.json')
                if os.path.exists(root_config_path):
                    with open(root_config_path, 'r') as f:
                        config = json.load(f)
                    logger.info(f"Loaded current config from {root_config_path}")
                else:
                    # Fall back to default config
                    logger.warning(f"No current config found, using default")
                    config = create_default_config()
        else:
            # Load a specific version
            config = get_version(version)
            if not config:
                # If version not found, load from root agensight.config.json if possible
                try:
                    user_dir = os.getcwd()
                    config_path = os.path.join(user_dir, 'agensight.config.json')
                    if os.path.exists(config_path):
                        with open(config_path, 'r') as f:
                            config = json.load(f)
                        logger.info(f"Loaded config from agensight.config.json as fallback")
                    else:
                        # Fall back to default config
                        logger.warning(f"Config version {version} not found and no agensight.config.json exists")
                        config = create_default_config()
                except Exception as e:
                    logger.error(f"Error loading fallback config: {e}")
                    config = create_default_config()
                
        return config
    except Exception as e:
        logger.error(f"Error fetching config: {str(e)}")
        # Return a default config instead of error
        return create_default_config()

@config_router.post("/config/sync", response_model=ApiResponse)
async def sync_config_api(sync_request: SyncRequest):
    """Sync a configuration version to main"""
    try:
        logger.info(f"[DEBUG-CRITICAL] Sync request for version: {sync_request.version}")
        version = sync_request.version
        
        # Load the requested config version
        config = get_version(version)
        if not config:
            logger.error(f"[DEBUG-CRITICAL] Config version {version} not found")
            raise HTTPException(status_code=404, detail=f"Config version {version} not found")
        
        logger.info(f"[DEBUG-CRITICAL] Successfully loaded config version {version}")
        
        # Direct file approach - update the main config file directly
        try:
            # Get the user directory
            user_dir = get_user_dir()
            logger.info(f"[DEBUG-CRITICAL] User directory: {user_dir}")
            
            # Update the agensight.config.json in the user's project root
            config_path = os.path.join(user_dir, 'agensight.config.json')
            logger.info(f"[DEBUG-CRITICAL] Writing to config file: {config_path}")
            
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            # Also update the internal config file
            internal_config_path = get_config_file_path()
            logger.info(f"[DEBUG-CRITICAL] Writing to internal config file: {internal_config_path}")
            
            with open(internal_config_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            logger.info(f"[DEBUG-CRITICAL] Successfully synced version {version} to main config")
            
            return ApiResponse(
                success=True,
                message=f"Version {version} synced to main successfully",
                version=version,
                synced_to_main=True
            )
        except Exception as e:
            logger.error(f"[DEBUG-CRITICAL] Error in direct file sync: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error syncing config: {str(e)}")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"[DEBUG-CRITICAL] Error syncing config: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error syncing config: {str(e)}")

@config_router.post("/config/commit", response_model=ApiResponse)
async def commit_config_version_api(commit_request: CommitRequest):
    """Create a new configuration version"""
    try:
        # Get the source config
        source_version = commit_request.source_version
        source_config = get_version(source_version)
        
        if not source_config:
            raise HTTPException(status_code=404, detail=f"Source config version {source_version} not found")
        
        # Save the new version
        new_version = save_version(
            source_config,
            commit_request.commit_message,
            commit_request.sync_to_main
        )
        
        if not new_version:
            raise HTTPException(status_code=500, detail="Failed to save new version")
        
        return ApiResponse(
            success=True,
            message=f"New version {new_version} created successfully",
            version=new_version,
            synced_to_main=commit_request.sync_to_main
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error committing config: {str(e)}")

@config_router.post("/update_agent", response_model=ApiResponse)
async def update_agent_api(request: Request, update_request: UpdateAgentRequest):
    """Update an agent's configuration"""
    try:
        # Log the raw request data for debugging
        raw_data = await request.body()
        logger.info(f"[DEBUG-CRITICAL] RAW REQUEST DATA: {raw_data.decode('utf-8')}")
        logger.info(f"[DEBUG-CRITICAL] REQUEST HEADERS: {dict(request.headers)}")
        
        # Log the exactly requested version - critical for debugging
        config_version = update_request.config_version
        logger.info(f"[DEBUG-CRITICAL] Requested config_version: '{config_version}', type: {type(config_version)}")
        
        agent_data = update_request.agent
        agent_name = agent_data.get("name")
        
        if not agent_name:
            logger.error("Missing agent name in update request")
            raise HTTPException(status_code=400, detail="Missing agent name")
        
        # DIRECT FILE MANIPULATION APPROACH FOR MAXIMUM RELIABILITY
        if config_version:
            try:
                # Define direct version file path
                version_dir = os.path.join(get_user_dir(), ".agensight", "versions")
                version_file = os.path.join(version_dir, f"version_{config_version}.json")
                
                logger.info(f"[DEBUG-CRITICAL] Trying to directly update version file: {version_file}")
                
                # Check if file exists
                if not os.path.exists(version_file):
                    logger.error(f"[DEBUG-CRITICAL] Version file not found: {version_file}")
                    # List available version files
                    files = os.listdir(version_dir)
                    logger.info(f"[DEBUG-CRITICAL] Available files in versions dir: {files}")
                    raise HTTPException(status_code=404, detail=f"Version {config_version} not found")
                
                # Read the file
                with open(version_file, 'r') as f:
                    version_data = json.load(f)
                
                logger.info(f"[DEBUG-CRITICAL] Successfully loaded version file, data keys: {list(version_data.keys())}")
                
                # Get the config to update
                config = version_data.get('config', {})
                
                # Find the agent to update
                agent_index = None
                for i, agent in enumerate(config.get('agents', [])):
                    if agent['name'] == agent_name:
                        agent_index = i
                        break
                
                # Create agents list if it doesn't exist
                if 'agents' not in config:
                    config['agents'] = []
                
                # Update or add the agent
                if agent_index is not None:
                    logger.info(f"[DEBUG-CRITICAL] Updating existing agent at index {agent_index}")
                    config['agents'][agent_index] = agent_data
                else:
                    logger.info(f"[DEBUG-CRITICAL] Adding new agent {agent_name}")
                    config['agents'].append(agent_data)
                
                # Update config in version data
                version_data['config'] = config
                
                # Update timestamp
                version_data['timestamp'] = datetime.datetime.now().isoformat()
                
                # Update commit message
                version_data['commit_message'] = f"Updated agent: {agent_name}"
                
                # Write back to the file
                with open(version_file, 'w') as f:
                    json.dump(version_data, f, indent=2)
                
                logger.info(f"[DEBUG-CRITICAL] Successfully wrote updated version file: {version_file}")
                
                return ApiResponse(
                    success=True,
                    version=config_version,
                    synced_to_main=False,
                    message=f"Agent {agent_name} updated in version {config_version}"
                )
            except Exception as e:
                logger.error(f"[DEBUG-CRITICAL] Error in direct file update: {str(e)}", exc_info=True)
                # Fall through to try standard approach
        
        # STANDARD APPROACH - FALLBACK IF DIRECT APPROACH FAILS
        # Load the config to update
        if config_version:
            logger.info(f"[DEBUG-CRITICAL] Loading config for version: {config_version}")
            config = get_version(config_version)
            if not config:
                logger.error(f"Config version {config_version} not found")
                raise HTTPException(status_code=404, detail=f"Config version {config_version} not found")
            logger.info(f"[DEBUG-CRITICAL] Found config for version {config_version}, contains {len(config.get('agents', []))} agents")
        else:
            # Load the current config
            logger.info(f"[DEBUG-CRITICAL] No version specified, loading current config")
            try:
                with open(get_config_file_path()) as f:
                    config = json.load(f)
                logger.info(f"[DEBUG-CRITICAL] Loaded current config with {len(config.get('agents', []))} agents")
            except Exception as e:
                logger.error(f"Error loading current config: {e}")
                raise HTTPException(status_code=500, detail=f"Error loading current config: {str(e)}")
        
        # Find the agent to update
        agent_index = None
        for i, agent in enumerate(config.get('agents', [])):
            if agent['name'] == agent_name:
                agent_index = i
                break
        
        logger.info(f"[DEBUG-CRITICAL] agent_index: {agent_index}")
        
        # Create agents list if it doesn't exist
        if 'agents' not in config:
            config['agents'] = []
        
        # Update or add the agent
        if agent_index is not None:
            logger.info(f"[DEBUG-CRITICAL] Updating existing agent at index {agent_index}")
            config['agents'][agent_index] = agent_data
        else:
            logger.info(f"[DEBUG-CRITICAL] Adding new agent {agent_name}")
            config['agents'].append(agent_data)
        
        # Prepare commit message
        commit_message = f"Updated agent: {agent_name}"
        
        # If a specific version was provided, use the new save_version with use_existing_version parameter
        if config_version:
            logger.info(f"[DEBUG-CRITICAL] Attempting to update existing version {config_version} using enhanced save_version")
            from ..utils.config_utils import save_version
            
            # Use enhanced save_version that can update existing versions
            updated_version = save_version(
                config=config, 
                commit_message=commit_message, 
                sync_to_main=False,
                use_existing_version=config_version
            )
            
            if updated_version == config_version:
                logger.info(f"[DEBUG-CRITICAL] Successfully updated existing version {config_version}")
                logger.info(f"Successfully updated agent {agent_name} in existing version {config_version}")
                return ApiResponse(
                    success=True,
                    version=config_version,
                    synced_to_main=False,
                    message=f"Agent {agent_name} updated in version {config_version}"
                )
            else:
                logger.error(f"[DEBUG-CRITICAL] Failed to update version {config_version}, got {updated_version} instead")
                raise HTTPException(status_code=500, detail=f"Failed to update version {config_version}")
        else:
            # Otherwise save as a new version
            logger.info(f"[DEBUG-CRITICAL] Creating new version since no version was specified")
            from ..utils.config_utils import save_version
            new_version = save_version(config, commit_message, False)
            
            if not new_version:
                logger.error(f"[DEBUG-CRITICAL] Failed to create new version")
                raise HTTPException(status_code=500, detail="Failed to save new version")
            
            logger.info(f"[DEBUG-CRITICAL] Created new version: {new_version}")
            logger.info(f"Successfully updated agent {agent_name} in new version {new_version}")
            return ApiResponse(
                success=True,
                version=new_version,
                synced_to_main=False,
                message=f"Agent {agent_name} updated successfully in new version {new_version}"
            )
    except HTTPException as he:
        logger.error(f"[DEBUG-CRITICAL] HTTPException: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"[DEBUG-CRITICAL] Error updating agent: {str(e)}")
        # Return a proper response even on error
        return ApiResponse(
            success=False,
            version="",
            synced_to_main=False,
            message=f"Error updating agent: {str(e)}"
        )

# The following are the original Flask routes
@config_bp.route('/api/config')
def get_config():
    try:
        # Get version parameter from query string
        version = request.args.get('version', None)
        
        # If version is specified, load that version from versions store
        if version:
            config = get_version(version)
            if config:
                logger.info(f"Loaded config version {version}")
            else:
                # If version not found, load current config
                try:
                    with open(get_config_file_path()) as f:
                        config = json.load(f)
                    logger.info("Requested version not found, loaded current config")
                except Exception as e:
                    logger.error(f"Error loading current config after version not found: {e}")
                    config = create_default_config()
        # No version specified - initialize if needed and use current config
        else:
            # Initialize the config system, creating files and first version if needed
            config = initialize_config()
            logger.info("Configuration system initialized or verified")
        
        # Debug log to check if connections exist in the config
        logger.info(f"Config loaded: {len(config.get('agents', []))} agents")
        logger.info(f"Connections found: {config.get('connections', [])}")
        
        # Ensure connections exist
        if 'connections' not in config or not config['connections']:
            logger.warning("No connections found in config, adding default")
            if 'agents' in config and len(config['agents']) >= 2:
                config['connections'] = [
                    {"from": config['agents'][0]['name'], "to": config['agents'][1]['name']}
                ]
        
        return jsonify(config)
    except Exception as e:
        logger.error(f"Error loading config: {e}")
        # Return a default config as fallback
        fallback_config = create_default_config()
        return jsonify(fallback_config)

@config_bp.route('/api/config/versions')
def get_config_versions():
    try:
        ensure_version_directory()
        versions = []
        
        # Get historical versions first
        try:
            version_history = get_version_history()
            
            # Add all versions from history
            for version_info in version_history:
                versions.append({
                    'version': version_info.get('version'),
                    'commit_message': version_info.get('commit_message', 'No commit message'),
                    'timestamp': version_info.get('timestamp', ''),
                    'is_current': False  # Will update the current one below
                })
                
            logger.info(f"Found {len(versions)} versions in history: {[v['version'] for v in versions]}")
        except Exception as e:
            logger.error(f"Error loading version history: {e}")
        
        # Try to find which version to mark as current
        try:
            if os.path.exists(get_config_file_path()) and versions:
                with open(get_config_file_path()) as f:
                    current_config = json.load(f)
                
                # Look for an exact match with the current config
                current_found = False
                for version in versions:
                    version_config = get_version(version['version'])
                    if version_config and current_config == version_config:
                        version['is_current'] = True
                        current_found = True
                        logger.info(f"Marked version {version['version']} as current (exact match)")
                        break
                
                # If no match found, just mark the first/newest version as current
                if not current_found:
                    versions[0]['is_current'] = True
                    logger.info(f"No exact match found, marking first version {versions[0]['version']} as current")
                    
        except Exception as e:
            logger.error(f"Error finding current version: {e}")
            # Mark the first version as current if we can't determine
            if versions:
                versions[0]['is_current'] = True
                logger.info(f"Marked first version as current due to error: {e}")
        
        # If no versions found at all, create a default entry
        if not versions:
            logger.warning("No versions found, creating default entry")
            versions.append({
                'version': '0.0.1',
                'commit_message': 'initial version',
                'timestamp': datetime.datetime.now().isoformat(),
                'is_current': True
            })
            
        # Sort versions by timestamp (newest first)
        try:
            versions.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        except Exception as e:
            logger.error(f"Error sorting versions: {e}")
            # Return unsorted if sorting fails
            
        # NEVER add a separate "current" entry - filter out any that might exist
        versions = [v for v in versions if v['version'] != 'current']
        
        # Make sure at least one version is marked current
        if versions and not any(v['is_current'] for v in versions):
            versions[0]['is_current'] = True
            logger.info(f"No version marked as current, defaulting to first version")
            
        logger.info(f"FINAL VERSION LIST: {len(versions)} version(s): {[v['version'] for v in versions]}")
        return jsonify(versions)
    except Exception as e:
        logger.error(f"Error getting config versions: {e}")
        # Return a more graceful error with a fallback version list
        fallback_versions = [{
            'version': '0.0.1',
            'commit_message': 'initial version',
            'timestamp': datetime.datetime.now().isoformat(),
            'is_current': True
        }]
        logger.info("Returning fallback version list due to error")
        return jsonify(fallback_versions)

@config_bp.route('/api/update_agent', methods=['POST'])
def update_agent():
    try:
        data = request.json
        agent_data = data.get('agent')
        commit_message = data.get('commit_message', 'Updated agent')
        sync_to_main = data.get('sync_to_main', False)  # Whether to update the main config file
        version = data.get('version')  # Get the version parameter
        
        logger.info(f"[DEBUG] Update agent request: agent={agent_data['name']}, version='{version}', sync_to_main={sync_to_main}")
        logger.info(f"[DEBUG] Request data: {json.dumps(data, indent=2)}")
        
        if not agent_data or not agent_data.get('name'):
            return jsonify({'error': 'Missing required agent data'}), 400
        
        # If a specific version is provided, load that version
        if version:
            logger.info(f"[DEBUG] Version parameter is present: '{version}'")
            version_config = get_version(version)
            if version_config:
                logger.info(f"[DEBUG] Loading specific version for editing: '{version}'")
                config = version_config
            else:
                logger.warning(f"[DEBUG] Requested version '{version}' not found, falling back to main config")
                # Fall back to the main config if version not found
                with open(get_config_file_path(), 'r') as f:
                    config = json.load(f)
        else:
            # No version specified, use the main config
            logger.info("[DEBUG] No version specified, using main config")
            with open(get_config_file_path(), 'r') as f:
                config = json.load(f)
            
        # Find the agent to update
        agent_index = None
        for i, agent in enumerate(config.get('agents', [])):
            if agent['name'] == agent_data['name']:
                agent_index = i
                break
                
        if agent_index is None:
            # If agent doesn't exist, append it
            if 'agents' not in config:
                config['agents'] = []
            config['agents'].append(agent_data)
            logger.info(f"[DEBUG] Added new agent: {agent_data['name']}")
        else:
            # Update existing agent
            config['agents'][agent_index] = agent_data
            logger.info(f"[DEBUG] Updated existing agent: {agent_data['name']}")
        
        # If we're editing a specific version and not syncing to main,
        # we should update that version file directly
        logger.info(f"[DEBUG] Checking condition: version={bool(version)}, not sync_to_main={not sync_to_main}, combined={bool(version) and not sync_to_main}")
        if version and not sync_to_main:
            from ..utils.config_utils import get_version_file_path
            import datetime
            
            try:
                # Get the version file path
                version_path = get_version_file_path(version)
                logger.info(f"[DEBUG] Version file path: {version_path}")
                
                # Check if version file exists
                if not os.path.exists(version_path):
                    logger.error(f"[DEBUG] Version file does not exist: {version_path}")
                    return jsonify({'error': f'Version file not found: {version}'}), 404
                
                # Read existing version data to keep metadata
                with open(version_path, 'r') as f:
                    version_data = json.load(f)
                
                logger.info(f"[DEBUG] Successfully read version file: {version_path}")
                logger.info(f"[DEBUG] Version data keys: {list(version_data.keys())}")
                
                # Update the config but keep metadata
                version_data['config'] = config
                version_data['commit_message'] = commit_message
                version_data['timestamp'] = datetime.datetime.now().isoformat()
                
                # Write back to the same version file
                with open(version_path, 'w') as f:
                    json.dump(version_data, f, indent=2)
                
                logger.info(f"[DEBUG] Successfully updated agent in existing version file: {version}")
                
                if sync_to_main:
                    try:
                        # Also update the main config if requested
                        with open(get_config_file_path(), 'w') as f:
                            json.dump(config, f, indent=2)
                        logger.info(f"[DEBUG] Updated main config file with version {version}")
                    except Exception as e:
                        logger.error(f"[DEBUG] Error updating main config: {str(e)}")
                
                return jsonify({
                    'success': True,
                    'version': version,
                    'synced_to_main': sync_to_main,
                    'message': f"Agent updated successfully in version {version}"
                })
            except Exception as e:
                logger.error(f"[DEBUG] Error updating version file directly: {str(e)}", exc_info=True)
                # Don't fall through - return the error to the client
                return jsonify({
                    'success': False,
                    'error': f"Failed to update version file: {str(e)}"
                }), 500
        
        # If we got here, we need to save as a new version
        logger.info("[DEBUG] Creating new version instead of updating existing one")
        logger.info(f"[DEBUG] Reason: version condition was {bool(version)}, sync_to_main condition was {bool(sync_to_main)}")
        new_version = save_version(config, commit_message, sync_to_main)
        if not new_version:
            return jsonify({'error': 'Failed to save version'}), 500
            
        return jsonify({
            'success': True,
            'version': new_version,
            'synced_to_main': sync_to_main,
            'message': f"Agent updated successfully in version {new_version}"
        })
    except Exception as e:
        logger.error(f"[DEBUG] Error updating agent: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
        
@config_bp.route('/api/config/rollback', methods=['POST'])
def rollback_config():
    """Roll back to a specific version of the configuration"""
    try:
        data = request.json
        version = data.get('version')
        commit_message = data.get('commit_message', f"Rolled back to version {version}")
        sync_to_main = data.get('sync_to_main', False)  # Whether to update the main config file
        
        if not version:
            return jsonify({'error': 'Missing version parameter'}), 400
            
        # Use the rollback utility function
        result = rollback_to_version(version, commit_message, sync_to_main)
        
        if not result.get('success', False):
            return jsonify({'error': result.get('error', 'Failed to rollback')}), 500
            
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error rolling back config: {e}")
        return jsonify({'error': str(e)}), 500

@config_bp.route('/api/config/commit', methods=['POST'])
def commit_version():
    """Create a new commit with the current config"""
    try:
        ensure_version_directory()
        data = request.json
        commit_message = data.get('commit_message', 'Manual commit')
        sync_to_main = data.get('sync_to_main', False)  # Whether to update the main config file
        source_version = data.get('source_version')  # Get the source version to commit from
        
        logger.info(f"[DEBUG] Commit request with message: '{commit_message}', sync_to_main: {sync_to_main}, source_version: '{source_version}'")
        
        # If a source version is specified, use that as the basis for the new commit
        if source_version:
            logger.info(f"[DEBUG] Using source version {source_version} as basis for new commit")
            config = get_version(source_version)
            if not config:
                logger.error(f"[DEBUG] Source version {source_version} not found")
                return jsonify({'error': f"Source version {source_version} not found"}), 404
            logger.info(f"[DEBUG] Successfully loaded source version {source_version}")
        else:
            # Otherwise, load the main config file
            logger.info("[DEBUG] No source version specified, using main config file")
            try:
                with open(get_config_file_path(), 'r') as f:
                    config = json.load(f)
            except Exception as e:
                logger.error(f"[DEBUG] Error loading config: {e}")
                return jsonify({'error': f"Could not load configuration: {str(e)}"}), 500
            
        # Save as a new version
        new_version = save_version(config, commit_message, sync_to_main)
        if not new_version:
            return jsonify({'error': 'Failed to save version'}), 500
        
        logger.info(f"[DEBUG] Successfully created new version {new_version} from {source_version or 'main config'}")
        
        # The main config file is already up to date if sync_to_main was true
        
        return jsonify({
            'success': True,
            'version': new_version,
            'source_version': source_version,
            'synced_to_main': sync_to_main,
            'message': f"Created new version {new_version}"
        })
    except Exception as e:
        logger.error(f"[DEBUG] Error creating commit: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@config_bp.route('/api/config/sync', methods=['POST'])
def sync_to_main():
    """Sync a specific version to the main config file"""
    try:
        data = request.json
        version = data.get('version')
        
        if not version:
            return jsonify({'error': 'Missing version parameter'}), 400
            
        # Get the requested version
        config_to_sync = get_version(version)
        if not config_to_sync:
            return jsonify({'error': f"Version {version} not found"}), 404
            
        # Update the main config file
        try:
            with open(get_config_file_path(), 'w') as f:
                json.dump(config_to_sync, f, indent=2)
            logger.info(f"Synced version {version} to main config file")
        except Exception as e:
            logger.error(f"Error syncing to main config: {e}")
            return jsonify({'error': f"Failed to sync to main config: {str(e)}"}), 500
            
        return jsonify({
            'success': True,
            'version': version,
            'message': f"Successfully synced version {version} to main config file"
        })
    except Exception as e:
        logger.error(f"Error syncing to main config: {e}")
        return jsonify({'error': str(e)}), 500

# Initialize version directory when the server starts
ensure_version_directory()