"""
logger_setup.py
Configures console + file logging for Edgeflow.
"""

import logging
import os
import sys


def setup_logger(config: dict, name: str = "edgeflow") -> logging.Logger:
    """Create and return a logger with console output.
    Call attach_file_handler() once the output directory is known.
    """
    level_str = config.get("log_level", "INFO").upper()
    level = getattr(logging, level_str, logging.INFO)

    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Avoid duplicate handlers if called more than once
    if logger.handlers:
        return logger

    fmt = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(fmt)
    logger.addHandler(console_handler)

    return logger


def attach_file_handler(logger: logging.Logger, output_dir: str) -> None:
    """Add a file handler writing to <output_dir>/log.txt."""
    log_path = os.path.join(output_dir, "log.txt")
    fmt = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)
    logger.info(f"Log file: {log_path}")
