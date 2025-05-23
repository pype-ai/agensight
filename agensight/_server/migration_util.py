def import_mock_data() -> bool:
    """Import mock data into the database"""
    try:
        # Import data_source here to avoid circular imports
        from .data_source import data_source
        
        # Before doing anything, delete the database in the data directory to force a fresh start
        import os
        import sqlite3
        
        db_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(db_dir, "data", "agensight.db")
        
        # Close any existing connections if possible
        try:
            conn = sqlite3.connect(db_path)
            conn.close()
        except:
            pass
            
        # Delete the database file if it exists
        if os.path.exists(db_path):
            logger.info(f"Deleting existing database at {db_path}")
            os.remove(db_path)
            logger.info(f"Database deleted successfully")
            
            # Recreate the directory if needed
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            
        # Check if data already exists
        existing_traces = data_source.get_all_traces()
        existing_configs = data_source.get_config_versions()
        
        # Only import data if no data exists
        if existing_traces or existing_configs:
            logger.info("Data already exists, skipping import")
            return True
        
        # Import config data
        logger.info("Importing config data...")
        import_config_data(data_source)
        
        # Import trace data
        logger.info("Importing trace data...")
        import_trace_data(data_source)
        
        return True
    except Exception as e:
        logger.error(f"Error importing mock data: {str(e)}")
        return False 