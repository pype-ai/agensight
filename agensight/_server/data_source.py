"""
Data access layer for AgenSight server using SQLite
"""
import json
import sqlite3
import os
import logging
import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataSource:
    """
    Data access class that handles all database operations
    """
    def __init__(self):
        """Initialize the database connection"""
        # Create database directory if it doesn't exist
        db_dir = Path(os.path.dirname(os.path.abspath(__file__))) / "data"
        db_dir.mkdir(exist_ok=True)
        
        # Database file path
        self.db_path = db_dir / "agensight.db"
        
        # Initialize database if it doesn't exist
        self._init_db()
    
    def _get_connection(self):
        """Get a database connection"""
        return sqlite3.connect(self.db_path)
    
    def _init_db(self):
        """Initialize the database schema if necessary"""
        # Connect to database
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Create config_versions table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS config_versions (
                version TEXT PRIMARY KEY,
                config TEXT NOT NULL,
                commit_message TEXT,
                timestamp TEXT NOT NULL,
                is_current BOOLEAN DEFAULT FALSE
            )
            """)
            
            # Create traces table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS traces (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """)
            
            # Create spans table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS spans (
                span_id TEXT PRIMARY KEY,
                trace_id TEXT NOT NULL,
                details TEXT NOT NULL,
                FOREIGN KEY (trace_id) REFERENCES traces(id)
            )
            """)
            
            conn.commit()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
    
    # Config version methods
    def get_config_versions(self) -> List[Dict]:
        """Get all configuration versions"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
            SELECT version, commit_message, timestamp, is_current 
            FROM config_versions
            ORDER BY timestamp DESC
            """)
            
            versions = []
            for row in cursor.fetchall():
                versions.append({
                    "version": row[0],
                    "commit_message": row[1],
                    "timestamp": row[2],
                    "is_current": bool(row[3])
                })
                
            # If no versions found, try to create one from agensight.config.json
            if not versions:
                user_dir = os.getcwd()  # This should be the project root
                user_config_path = os.path.join(user_dir, 'agensight.config.json')
                
                default_config = None
                if os.path.exists(user_config_path):
                    logger.info(f"Loading user config from: {user_config_path}")
                    try:
                        with open(user_config_path, 'r') as f:
                            default_config = json.load(f)
                        logger.info(f"Successfully loaded user config for first version")
                    except Exception as e:
                        logger.error(f"Error loading user config: {str(e)}")
                
                # If no user config was found or loading failed, use default config
                if not default_config:
                    logger.info("No user config found, using default config")
                    default_config = self._create_default_config()
                
                # Create initial version
                self.create_config_version("0.0.0", "Initial version", True, default_config)
                
                # Fetch again
                return self.get_config_versions()
                
            return versions
        except Exception as e:
            logger.error(f"Error getting config versions: {str(e)}")
            return []
        finally:
            conn.close()
    
    def get_config_by_version(self, version: str) -> Dict:
        """Get a configuration by version"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
            SELECT config FROM config_versions
            WHERE version = ?
            """, (version,))
            
            row = cursor.fetchone()
            if row:
                logger.info(f"Found config for version {version} in database")
                return json.loads(row[0])
            
            logger.warning(f"No config found for version {version} in database")
            return None
        except Exception as e:
            logger.error(f"Error getting config by version: {str(e)}")
            return None
        finally:
            conn.close()
    
    def create_config_version(self, source_version: str, commit_message: str, sync_to_main: bool, config_data=None) -> str:
        """Create a new configuration version"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # If config_data is not provided, get it from source_version
            if config_data is None:
                config_data = self.get_config_by_version(source_version)
                if not config_data:
                    logger.error(f"Source version not found: {source_version}")
                    return None
            
            # Generate new version number
            cursor.execute("SELECT version FROM config_versions ORDER BY version DESC LIMIT 1")
            row = cursor.fetchone()
            if not row:
                # Always start with 1.0.0 as the first version
                new_version = "1.0.0"
                logger.info(f"No previous versions found, creating initial version 1.0.0")
            else:
                last_version = row[0]
                parts = [int(p) for p in last_version.split('.')]
                parts[2] += 1  # Increment patch version
                new_version = '.'.join(str(p) for p in parts)
                logger.info(f"Generated next version number {new_version} from {last_version}")
            
            # Insert new version
            timestamp = datetime.datetime.now().isoformat()
            cursor.execute("""
            INSERT INTO config_versions (version, config, commit_message, timestamp, is_current)
            VALUES (?, ?, ?, ?, ?)
            """, (new_version, json.dumps(config_data), commit_message, timestamp, sync_to_main))
            
            # If sync_to_main is True, update all other versions to not be current
            if sync_to_main:
                cursor.execute("""
                UPDATE config_versions
                SET is_current = FALSE
                WHERE version != ?
                """, (new_version,))
            
            conn.commit()
            return new_version
        except Exception as e:
            logger.error(f"Error creating config version: {str(e)}")
            conn.rollback()
            return None
        finally:
            conn.close()
    
    def sync_config(self, version: str) -> bool:
        """Sync a configuration version to main"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if version exists
            cursor.execute("SELECT version FROM config_versions WHERE version = ?", (version,))
            if not cursor.fetchone():
                return False
            
            # Update is_current flag
            cursor.execute("""
            UPDATE config_versions
            SET is_current = CASE WHEN version = ? THEN TRUE ELSE FALSE END
            """, (version,))
            
            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Error syncing config: {str(e)}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def update_agent(self, agent_data: Dict, config_version: str = None) -> str:
        """Update an agent in a configuration"""
        try:
            # Get the config to update
            if config_version:
                config = self.get_config_by_version(config_version)
                if not config:
                    logger.error(f"Config version not found: {config_version}")
                    return None
            else:
                # Get the current config
                cursor = self._get_connection().cursor()
                cursor.execute("SELECT version, config FROM config_versions WHERE is_current = TRUE LIMIT 1")
                row = cursor.fetchone()
                if not row:
                    logger.error("No current config found")
                    return None
                config_version = row[0]
                config = json.loads(row[1])
            
            # Find the agent to update
            agent_index = None
            for i, agent in enumerate(config.get('agents', [])):
                if agent['name'] == agent_data['name']:
                    agent_index = i
                    break
            
            # Create agents list if it doesn't exist
            if 'agents' not in config:
                config['agents'] = []
            
            # Update or add the agent
            if agent_index is not None:
                config['agents'][agent_index] = agent_data
            else:
                config['agents'].append(agent_data)
            
            # Create a new version with the updated config
            agent_name = agent_data['name']
            new_version = self.create_config_version(
                config_version,
                f"Updated agent: {agent_name}",
                False,
                config
            )
            
            return new_version
        except Exception as e:
            logger.error(f"Error updating agent: {str(e)}")
            return None
    
    def update_prompt(self, prompt_data: Dict, sync_to_main: bool = False, config_version: str = None) -> str:
        """Update a prompt in a configuration"""
        try:
            # Similar to update_agent but for prompts
            # In our implementation, prompts are part of agents
            # This method might need customization based on actual prompt structure
            return self.update_agent(prompt_data, config_version)
        except Exception as e:
            logger.error(f"Error updating prompt: {str(e)}")
            return None
    
    # Trace methods
    def get_all_traces(self) -> List[Dict]:
        """Get all traces"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("SELECT id, data FROM traces ORDER BY created_at DESC")
            traces = []
            for row in cursor.fetchall():
                traces.append(json.loads(row[1]))
            return traces
        except Exception as e:
            logger.error(f"Error getting all traces: {str(e)}")
            return []
        finally:
            conn.close()
    
    def get_trace_by_id(self, trace_id: str) -> Dict:
        """Get a trace by ID"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("SELECT data FROM traces WHERE id = ?", (trace_id,))
            row = cursor.fetchone()
            if row:
                return json.loads(row[0])
            return None
        except Exception as e:
            logger.error(f"Error getting trace by ID: {str(e)}")
            return None
        finally:
            conn.close()
    
    def get_span_details(self, span_id: str) -> Dict:
        """Get span details by span ID"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("SELECT details FROM spans WHERE span_id = ?", (span_id,))
            row = cursor.fetchone()
            if row:
                details = json.loads(row[0])
                # Ensure it has the required fields
                if isinstance(details, dict) and "span_id" in details:
                    return details
                else:
                    logger.warning(f"Invalid span details format for span_id {span_id}")
                    return None
            else:
                logger.warning(f"No span details found for span_id {span_id}")
                return None
        except Exception as e:
            logger.error(f"Error getting span details: {str(e)}")
            return None
        finally:
            conn.close()
    
    def save_trace(self, trace_id: str, trace_data: Dict) -> bool:
        """Save a trace"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Insert trace data
            created_at = datetime.datetime.now().isoformat()
            cursor.execute("""
            INSERT OR REPLACE INTO traces (id, data, created_at)
            VALUES (?, ?, ?)
            """, (trace_id, json.dumps(trace_data), created_at))
            
            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Error saving trace: {str(e)}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def save_span(self, span_id: str, trace_id: str, details: Dict) -> bool:
        """Save span details"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Insert span details
            cursor.execute("""
            INSERT OR REPLACE INTO spans (span_id, trace_id, details)
            VALUES (?, ?, ?)
            """, (span_id, trace_id, json.dumps(details)))
            
            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Error saving span: {str(e)}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def _create_default_config(self) -> Dict:
        """Create a default configuration"""
        # Check if agensight.config.json exists in the project root first
        user_dir = os.getcwd()  # This should be the project root
        user_config_path = os.path.join(user_dir, 'agensight.config.json')
        
        if os.path.exists(user_config_path):
            logger.info(f"Creating default config from user config: {user_config_path}")
            try:
                with open(user_config_path, 'r') as f:
                    user_config = json.load(f)
                return user_config
            except Exception as e:
                logger.error(f"Error loading user config for default: {str(e)}")
                # Fall through to default
        
        # Use minimal default if no user config exists or if loading fails
        logger.info("Using minimal default config (no user config found)")
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

# Create a singleton instance
data_source = DataSource() 