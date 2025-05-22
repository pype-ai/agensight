def setup_eval( exporter_type=None):
    from agensight.eval.storage.db import init_evals_schema

    print(f"Setting up eval with exporter type: {exporter_type}")
    if exporter_type == "db":
        init_evals_schema()
    else:
        print("DB not initialized")


