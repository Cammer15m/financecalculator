# agent_intructions

> Folder name has a typo (`intructions` → `instructions`). Preserved as-is to avoid breaking any tooling that references the path.

Environment files for a [Plane](https://plane.so) project-management agent integration. Sourcing one of these `.env` files scopes the agent's API access to a single Plane project.

## Files

### `plane-agent-PILOT.env`
Scopes the agent to the **PILOT** project on `projects.minnosystems.com`.

| Variable | Purpose |
|---|---|
| `PLANE_BASE_URL` | Plane instance URL (`https://projects.minnosystems.com`) |
| `PLANE_API_KEY` | Plane API token (**SECRET — do not commit**) |
| `PLANE_WORKSPACE_SLUG` | Workspace identifier (`projects`) |
| `PLANE_PROJECT_ID` | UUID for the PILOT project |
| `PLANE_PROJECT_IDENTIFIER` | Human-readable project code (`PILOT`) |
| `PLANE_ENFORCE_PROJECT_ISOLATION` | `1` = agent must not read/write other projects |
| `PLANE_RESOLVE_IP` | Pin DNS resolution to `70.80.116.66` (bypasses public DNS) |

### `plane-agent-RAID.env`
Same shape, scoped to the **RAID** project. Shares the same API key, workspace, base URL, and resolve IP; differs only in `PLANE_PROJECT_ID` and `PLANE_PROJECT_IDENTIFIER`.

## Usage

```bash
source agent_intructions/plane-agent-PILOT.env
# or
source agent_intructions/plane-agent-RAID.env
```

## Security

- Both files contain a **live API key in plaintext**. Added to `.gitignore` to prevent commit.
- Same key is reused across PILOT and RAID — compromising one file compromises both projects. Consider per-project keys.
- `PLANE_RESOLVE_IP` suggests the Plane host is reached over a non-public route (VPN/internal DNS). Confirm the IP is current before use.
