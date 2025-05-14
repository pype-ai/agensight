from flask import Blueprint, request, jsonify
import json
import logging
import os
import copy
import datetime
from ..utils.config_utils import (
    get_config_file_path, get_version, save_version, get_next_version_number,
    get_version_history, get_latest_version_number, update_version, get_user_dir
)
from fastapi import APIRouter, HTTPException
from typing import Dict

from ..data_source import data_source
from ..models import (
    UpdatePromptRequest, 
    ApiResponse
)

logger = logging.getLogger(__name__)
# Keep Flask blueprint for backward compatibility
prompt_bp = Blueprint('prompt', __name__)

# Create FastAPI router
prompt_router = APIRouter(tags=["prompts"])

@prompt_router.post("/update_prompt", response_model=ApiResponse)
async def update_prompt_api(update_request: UpdatePromptRequest):
    """Update a prompt"""
    try:
        logger.info(f"[DEBUG-CRITICAL] update_prompt_api called with request: {update_request}")
        logger.info(f"[DEBUG-CRITICAL] config_version: {update_request.config_version}")
        logger.info(f"[DEBUG-CRITICAL] config_version type: {type(update_request.config_version)}")
        
        # Get the prompt data
        prompt_data = update_request.prompt
        prompt_name = prompt_data.get("name")
        config_version = update_request.config_version
        
        logger.info(f"[DEBUG-CRITICAL] prompt_name: {prompt_name}, config_version: {config_version}")
        
        if not prompt_name:
            logger.error("Missing prompt name in update request")
            raise HTTPException(status_code=400, detail="Missing prompt name")

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
                    if agent['name'] == prompt_name:
                        agent_index = i
                        break
                
                # Create agents list if it doesn't exist
                if 'agents' not in config:
                    config['agents'] = []
                
                # Update or add the agent
                if agent_index is not None:
                    logger.info(f"[DEBUG-CRITICAL] Updating existing agent at index {agent_index}")
                    config['agents'][agent_index] = prompt_data
                else:
                    logger.info(f"[DEBUG-CRITICAL] Adding new agent {prompt_name}")
                    config['agents'].append(prompt_data)
                
                # Update config in version data
                version_data['config'] = config
                
                # Update timestamp
                version_data['timestamp'] = datetime.datetime.now().isoformat()
                
                # Update commit message
                version_data['commit_message'] = f"Updated prompt for agent: {prompt_name}"
                
                # Write back to the file
                with open(version_file, 'w') as f:
                    json.dump(version_data, f, indent=2)
                
                logger.info(f"[DEBUG-CRITICAL] Successfully wrote updated version file: {version_file}")
                
                # Also update the main config if requested
                if update_request.sync_to_main:
                    with open(get_config_file_path(), 'w') as f:
                        json.dump(config, f, indent=2)
                    logger.info(f"[DEBUG-CRITICAL] Updated main config file with version {config_version}")
                
                return ApiResponse(
                    success=True,
                    version=config_version,
                    synced_to_main=update_request.sync_to_main,
                    message=f"Prompt updated in version {config_version}"
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
            if agent['name'] == prompt_name:
                agent_index = i
                break
        
        logger.info(f"[DEBUG-CRITICAL] agent_index: {agent_index}")
        
        # Create agents list if it doesn't exist
        if 'agents' not in config:
            config['agents'] = []
        
        # Update or add the agent
        if agent_index is not None:
            logger.info(f"[DEBUG-CRITICAL] Updating existing agent at index {agent_index}")
            config['agents'][agent_index] = prompt_data
        else:
            logger.info(f"[DEBUG-CRITICAL] Adding new agent {prompt_name}")
            config['agents'].append(prompt_data)
        
        # Prepare commit message
        commit_message = f"Updated prompt for agent: {prompt_name}"
        
        # If a specific version was provided, use the enhanced save_version with use_existing_version parameter
        if config_version:
            logger.info(f"[DEBUG-CRITICAL] Attempting to update existing version {config_version} using enhanced save_version")
            
            # Use enhanced save_version that can update existing versions
            updated_version = save_version(
                config=config, 
                commit_message=commit_message, 
                sync_to_main=update_request.sync_to_main,
                use_existing_version=config_version
            )
            
            if updated_version == config_version:
                logger.info(f"[DEBUG-CRITICAL] Successfully updated existing version {config_version}")
                logger.info(f"Successfully updated prompt for agent {prompt_name} in existing version {config_version}")
                return ApiResponse(
                    success=True,
                    version=config_version,
                    synced_to_main=update_request.sync_to_main,
                    message=f"Prompt updated in version {config_version}"
                )
            else:
                logger.error(f"[DEBUG-CRITICAL] Failed to update version {config_version}, got {updated_version} instead")
                raise HTTPException(status_code=500, detail=f"Failed to update version {config_version}")
        else:
            # Otherwise save as a new version
            logger.info(f"[DEBUG-CRITICAL] Creating new version since no version was specified")
            new_version = save_version(config, commit_message, update_request.sync_to_main)
            
            if not new_version:
                logger.error(f"[DEBUG-CRITICAL] Failed to create new version")
                raise HTTPException(status_code=500, detail="Failed to save new version")
            
            logger.info(f"[DEBUG-CRITICAL] Created new version: {new_version}")
            logger.info(f"Successfully updated prompt for agent {prompt_name} in new version {new_version}")
            return ApiResponse(
                success=True,
                version=new_version,
                synced_to_main=update_request.sync_to_main,
                message=f"Prompt updated successfully in new version {new_version}"
            )
    except HTTPException as he:
        logger.error(f"[DEBUG-CRITICAL] HTTPException: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"[DEBUG-CRITICAL] Error updating prompt: {str(e)}")
        # Return a proper response even on error
        return ApiResponse(
            success=False,
            version="",
            synced_to_main=False,
            message=f"Error updating prompt: {str(e)}"
        )

# This route is maintained for backward compatibility
# New applications should use /api/update_agent instead
@prompt_bp.route('/api/update_prompt', methods=['POST'])
def update_prompt():
    logger.warning("The /api/update_prompt endpoint is deprecated. Please use /api/update_agent instead.")
    try:
        data = request.json
        name = data.get('name')
        prompt_text = data.get('prompt')
        version = data.get('version')  # The version to update
        commit_message = data.get('commit_message', 'Updated prompt')
        
        if name is None or prompt_text is None:
            return jsonify({'error': 'Missing required fields'}), 400
        
        logger.info(f"[DEBUG] Update prompt request for agent={name}, version='{version}'")
        
        # Load the specified version or current config
        if version:
            logger.info(f"[DEBUG] Loading specified version: {version}")
            config = get_version(version)
            if not config:
                logger.warning(f"[DEBUG] Version {version} not found, falling back to current config")
                # Fall back to current config if version not found
                with open(get_config_file_path(), 'r') as f:
                    config = json.load(f)
        else:
            logger.info(f"[DEBUG] No version specified, loading current config")
            with open(get_config_file_path(), 'r') as f:
                config = json.load(f)
        
        # Find the agent to update
        agent = next((a for a in config['agents'] if a['name'] == name), None)
        if not agent:
            return jsonify({'error': 'Agent not found'}), 404
        
        # Make a copy of the config for updating
        updated_config = copy.deepcopy(config)
        
        # Find the agent in the updated config
        updated_agent = next((a for a in updated_config['agents'] if a['name'] == name), None)
        
        # Update the prompt
        updated_agent['prompt'] = prompt_text
        
        # Also update modelParams if provided
        if 'modelParams' in data:
            updated_agent['modelParams'] = data['modelParams']
        
        # If a specific version was provided, update that version directly
        if version:
            logger.info(f"[DEBUG] Attempting to update existing version {version}")
            success = update_version(version, updated_config, commit_message)
            
            if success:
                logger.info(f"[DEBUG] Successfully updated version {version}")
                return jsonify({
                    'success': True,
                    'version': version,
                    'message': f"Prompt updated successfully in version {version}"
                })
            else:
                logger.error(f"[DEBUG] Failed to update version {version}")
                return jsonify({
                    'success': False,
                    'error': f"Failed to update version {version}"
                }), 500
        else:
            # If no version was provided, save as a new version
            logger.info(f"[DEBUG] No version specified, creating new version")
            new_version = save_version(updated_config, commit_message, True)
            
            if not new_version:
                logger.error(f"[DEBUG] Failed to create new version")
                return jsonify({'error': 'Failed to save version'}), 500
            
            logger.info(f"[DEBUG] Created new version: {new_version}")
            return jsonify({
                'success': True,
                'version': new_version,
                'message': f"Prompt updated successfully in new version {new_version}"
            })
    except Exception as e:
        logger.error(f"[DEBUG] Error updating prompt: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@prompt_bp.route('/api/versions/create', methods=['POST'])
def create_version():
    """Create a new version with a specific commit message"""
    try:
        data = request.json
        commit_message = data.get('commit_message', 'Manual version creation')
        specified_version = data.get('version')  # User can optionally specify a version
        sync_to_main = data.get('sync_to_main', True)
        
        # Load the current config
        with open(get_config_file_path(), 'r') as f:
            config = json.load(f)
            
        # Create a new version using the new versioning system
        new_version = save_version(config, commit_message, sync_to_main)
            
        logger.info(f"Created new version {new_version}: {commit_message}")
            
        return jsonify({
            'success': True,
            'version': new_version,
            'message': f"Created new version {new_version}"
        })
    except Exception as e:
        logger.error(f"Error creating version: {e}")
        return jsonify({'error': str(e)}), 500