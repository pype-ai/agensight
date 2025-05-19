#!/bin/bash

# Load environment variables from .env file
echo "Loading environment variables from .env file..."
set -a  # Automatically export all variables sourced from .env
source .env
set +a  # Stop automatically exporting variables

# Check if PYPI_TOKEN is available
if [ -z "$PYPI_TOKEN" ]; then
    echo "Error: PYPI_TOKEN is not set in .env file"
    exit 1
fi


# Run npm build in /agensigth/ui directory
echo "Running npm run build in ./agensight/ui directory..."
cd ./agensight/ui || { echo "Directory ./agensight/ui not found!"; exit 1; }
npm run build

cd ../../

# Clean up the dist and build directories
echo "Cleaning up the dist and build directories..."
rm -rf dist/*
rm -rf build/*

# Build the package
echo "Building the package..."
python setup.py sdist bdist_wheel

# Upload the package to PyPI using Twine
echo "Uploading the package to PyPI..."
twine upload dist/* -u __token__ -p $PYPI_TOKEN

echo "Deployment complete!"
