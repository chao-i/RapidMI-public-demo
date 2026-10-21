"""Check the public V1 interface against its declared LF-normalized hashes.

These checks cover interface file integrity, not clinical model validation.
The private fitted model is not required or distributed by this repository.
"""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    manifest = json.loads((ROOT / "PUBLIC_VERSIONS.json").read_text(encoding="utf-8"))
    failures = []
    seen = set()
    for item in manifest["files"]:
        relative = item["file"]
        path = (ROOT / relative).resolve()
        if relative in seen or not path.is_relative_to(ROOT):
            failures.append(f"Invalid or duplicate path: {relative}")
            continue
        seen.add(relative)
        if not relative.startswith("revision_v1_interface/") or not path.is_file():
            failures.append(f"Missing interface file: {relative}")
            continue
        content = path.read_bytes().replace(b"\r\n", b"\n")
        if hashlib.sha256(content).hexdigest() != item["sha256"]:
            failures.append(f"Checksum mismatch: {relative}")
    if len(seen) != 7:
        failures.append("Expected seven V1 interface files.")
    if failures:
        print("Public V1 checksum verification failed:")
        print("\n".join(failures))
        return 1
    print(f"Verified {len(seen)} public V1 interface files (LF-normalized SHA-256).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
