"""
folder_manager.py
Creates the dated output directory: <output_path>/YYYY-MM-DD/
"""

import os
from datetime import datetime
import pytz


class FolderManager:
    def __init__(self, config: dict):
        self.output_path = config.get("output_path", "Daily_Trading_Levels")
        self.timezone = config.get("timezone", "Europe/London")

    def _today_str(self) -> str:
        tz = pytz.timezone(self.timezone)
        now = datetime.now(tz)
        return now.strftime("%Y-%m-%d")

    def create_daily_folder(self, date_str: str = None) -> str:
        """
        Create and return the path to today's output folder.
        Optionally pass a custom date_str (YYYY-MM-DD) for testing.
        """
        date_str = date_str or self._today_str()

        # Resolve output_path relative to project root (two levels up from this file)
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        folder = os.path.join(project_root, self.output_path, date_str)

        os.makedirs(folder, exist_ok=True)
        return folder
