"""
setup_scheduler.py
Registers a Windows Task Scheduler task that runs main.py every day at 07:00.

Run this script ONCE from an Administrator PowerShell / CMD:
  python setup_scheduler.py

Options:
  --time  HH:MM   Override run time  (default: from config.json)
  --remove        Remove the task instead of creating it
  --status        Print current task status and exit
"""

import argparse
import json
import os
import platform
import subprocess
import sys

TASK_NAME = "Edgeflow_TradingLevels"


def load_run_time(script_dir: str) -> str:
    config_path = os.path.join(script_dir, "config.json")
    try:
        with open(config_path, encoding="utf-8") as fh:
            cfg = json.load(fh)
        return cfg.get("run_time", "07:00")
    except Exception:
        return "07:00"


def generate_bat(script_dir: str, python_exe: str) -> str:
    """Write run_scheduler.bat and return its path."""
    bat_path = os.path.join(script_dir, "run_scheduler.bat")
    log_path = os.path.join(script_dir, "Daily_Trading_Levels", "scheduler_run.log")

    # Ensure log directory exists at execution time via the bat itself
    lines = [
        "@echo off",
        f'cd /d "{script_dir}"',
        f'if not exist "Daily_Trading_Levels" mkdir "Daily_Trading_Levels"',
        f'"{python_exe}" "{os.path.join(script_dir, "main.py")}" >> "{log_path}" 2>&1',
    ]
    with open(bat_path, "w", encoding="utf-8") as fh:
        fh.write("\r\n".join(lines) + "\r\n")
    return bat_path


def create_task(bat_path: str, run_time: str) -> bool:
    """Register the task via schtasks.exe."""
    cmd = [
        "schtasks", "/Create",
        "/TN", TASK_NAME,
        "/TR", f'"{bat_path}"',
        "/SC", "DAILY",
        "/ST", run_time,
        "/RL", "HIGHEST",
        "/F",           # overwrite if already exists
    ]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
        )
        print(result.stdout.strip())
        return True
    except subprocess.CalledProcessError as exc:
        print(f"[ERROR] schtasks failed:\n{exc.stderr.strip()}")
        return False


def remove_task() -> bool:
    cmd = ["schtasks", "/Delete", "/TN", TASK_NAME, "/F"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(result.stdout.strip())
        return True
    except subprocess.CalledProcessError as exc:
        print(f"[ERROR] {exc.stderr.strip()}")
        return False


def status_task() -> None:
    cmd = ["schtasks", "/Query", "/TN", TASK_NAME, "/FO", "LIST"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(result.stdout)
    else:
        print(f"Task '{TASK_NAME}' not found.")


def main() -> None:
    if platform.system() != "Windows":
        print(
            "[INFO] This script is designed for Windows Task Scheduler.\n"
            "       On Linux/macOS use a cron job instead:\n"
            "       0 7 * * 1-5  cd /path/to/Edgeflow && python main.py\n"
        )
        sys.exit(0)

    parser = argparse.ArgumentParser(description="Register Edgeflow with Windows Task Scheduler")
    parser.add_argument("--time",   default=None,  metavar="HH:MM", help="Override run time")
    parser.add_argument("--remove", action="store_true",             help="Remove the scheduled task")
    parser.add_argument("--status", action="store_true",             help="Show current task status")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    python_exe = sys.executable

    if args.status:
        status_task()
        return

    if args.remove:
        ok = remove_task()
        sys.exit(0 if ok else 1)

    run_time = args.time or load_run_time(script_dir)

    print(f"Python  : {python_exe}")
    print(f"Project : {script_dir}")
    print(f"Run at  : {run_time} (daily)")
    print()

    bat_path = generate_bat(script_dir, python_exe)
    print(f"Batch file created : {bat_path}")

    ok = create_task(bat_path, run_time)
    if ok:
        print(f"\n[OK] Task '{TASK_NAME}' registered successfully.")
        print(f"     It will run every day at {run_time}.")
        print(f"     To verify: schtasks /Query /TN {TASK_NAME}")
    else:
        print("\n[FAILED] Could not register the task.")
        print("         Make sure you are running as Administrator.")
        sys.exit(1)


if __name__ == "__main__":
    main()
