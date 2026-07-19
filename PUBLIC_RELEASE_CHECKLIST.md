# GitHub release checklist

Run this checklist immediately before the first public push.

- [ ] Run `scripts/audit_public_release.ps1` and resolve every finding.
- [ ] Confirm `git status --ignored` does not show a model artifact, data file,
  report image, `.env`, server configuration, or manuscript.
- [ ] Search the staged changes for your public IP, private domain, account
  names, passwords, and local drive paths.
- [ ] Confirm that every image in `static/demo/` is synthetic and contains no
  patient identifier.
- [ ] Confirm the README's research-use notice remains intact.
- [ ] Do not upload this repository's `.gitignore` exceptions or the contents
  of any private `model_artifacts` directory.
