# Hosted mutation authorization

> This route changes hosted or external state. Use it only when the current user request explicitly authorizes the exact mutation and target.

## Route boundary

- Select this route only for the exact hosted mutation the user requested.
- Route inspection, diagnosis, preparation, validation, testing, and other read-only work to their read-only references. Those requests do not authorize a mutation.
- Authentication, target binding, configuration, access changes, deployment, connection writes, and rollback are separate mutations. Authorization for one does not imply another.

## Authorization check

Before any mutation, require the current request to name both the action and its complete target. A mutation-capable target consists of an explicit organization, application, and environment. When the environment is absent, stop and ask for it instead of applying a default, reusing local state, or selecting a target implicitly.

Do not broaden a request to prepare, inspect, diagnose, or validate into permission to authenticate, bind a target, change configuration or access, deploy, connect, submit, or roll back.

## Command and service contract

Use `references/cli-commands.md` as the generated command, flag, and exit-code contract. Consult the live command catalog before acting, and treat the service response as the authority for resulting hosted state. For an authorized deployment, use the one canonical public flow and follow its structured configuration actions and resume command; do not replace it with an internal script or a hand-built sequence. This reference intentionally does not duplicate operational command sequences, defaults, or status semantics.

## Evidence and stop conditions

- Stop before execution when the action or complete target is missing.
- After an authorized mutation, report only the state evidenced by the command and service response.
- Do not claim host behavior, production health, or successful external registration without direct evidence at that layer.