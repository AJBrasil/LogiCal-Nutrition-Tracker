"""Run on the Mac that will host LogiCal, after npm ci and npm run build."""
import argparse
import os
import plistlib
import shutil
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--owner", required=True, help="Exact Tailscale login")
parser.add_argument("--host", required=True, help="Tailscale HTTPS hostname")
parser.add_argument("--backup-dir", required=True, type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
node = shutil.which("node")
if not node or not (root / "dist/index.html").exists():
    parser.error("Install Node 24 and build the frontend first")
if not args.backup_dir.is_dir() or args.backup_dir.stat().st_dev == Path.home().stat().st_dev:
    parser.error("Choose an existing directory on a second mounted volume")
agents = Path.home() / "Library/LaunchAgents"
agents.mkdir(exist_ok=True)
logs = Path.home() / "Library/Logs/LogiCal"
logs.mkdir(parents=True, exist_ok=True)
jobs = {
    "server": dict(ProgramArguments=["/usr/bin/caffeinate", "-s", node, str(root/"server/index.mjs")],
                   RunAtLoad=True, KeepAlive=True, EnvironmentVariables={"LOGICAL_OWNER":args.owner,"LOGICAL_HOST":args.host}),
    "backup": dict(ProgramArguments=[node, str(root/"server/backup.mjs"), str(args.backup_dir.resolve())],
                   StartCalendarInterval={"Hour":3, "Minute":15})
}
domain = f"gui/{os.getuid()}"
for name, settings in jobs.items():
    label = "local.logical."+name
    settings.update(Label=label, StandardErrorPath=str(logs/(name+".log")), StandardOutPath=str(logs/(name+".log")))
    path = agents/(label+".plist")
    path.write_bytes(plistlib.dumps(settings))
    subprocess.run(["launchctl","bootout",domain+"/"+label],capture_output=True)
    subprocess.run(["launchctl","bootstrap",domain,str(path)],check=True)
