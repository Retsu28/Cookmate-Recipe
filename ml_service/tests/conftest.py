"""
Pytest configuration: adds the ml_service root to sys.path so that
`from models.trend import ...` and `from db import ...` work without
installing the package.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
