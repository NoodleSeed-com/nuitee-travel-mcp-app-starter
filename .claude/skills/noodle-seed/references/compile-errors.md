# Fixing noodle validate errors

## Contents

- The repair loop
- Error codes

## The repair loop

Run `noodle validate` (add `--json` for the machine-readable envelope, `--fix-prompt` for an agent repair prompt). On failure the envelope is `{ok:false,error:{code,message,fix,next,errors:[{code,path,message}]}}`: each entry in `error.errors[]` carries a `code`, a dotted `path` to the offending field, and a `message`; many also carry `expected`/`got`, `didYouMean`/`suggestions`, and a `docAnchor` (the full envelope is in `agent-contract.md`). Fix the specific error the `path` locates, then re-validate. Do not freeform re-edit. Once `noodle validate` passes, run `noodle test`, then `noodle dev`.

## Error codes

| Code | Fix |
| :-- | :-- |
| `invalid_context_provider` | Designate at most one normal tool with `contextProvider: true`, and give it an empty object input schema. |
| `yaml_parse_error` | Author in TypeScript; this means the compiled manifest was malformed — re-run from server.ts, do not hand-edit manifest data. |
| `invalid_shape` | A field has the wrong type or structure; match the shape the compiler reports under `path` against the SDK builder you used. |
| `invalid_name` | Rename the identifier to match the allowed pattern (lowercase, no spaces/reserved characters) cited at `path`. |
| `duplicate_name` | Two tools/components share a name; give each a unique name at the cited `path`. |
| `reserved_name` | Rename the reserved identifier and use one explicit zero-input tool with `contextProvider: true` when the model needs application context. |
| `unsupported_manifest_version` | Update the SDK/CLI so the emitted manifest version is supported; do not pin an old manifest shape. |
| `reserved_for_future_version` | The verb at `path` (currently `compute` as a flow step) is reserved for a future core version; express the step with `use` (a connector operation), `map` (a pure mapping), or the shipped `ctx.elicit` input primitive instead. |
| `invalid_operation_ref` | Fix the connector operation reference to `alias.operation` for an operation that exists on that connector. |
| `external_ref` | Remove the external/remote `$ref`; schemas must be self-contained — inline the definition instead of dereferencing a URL. |
| `invalid_schema_ref` | Correct the `$use` schema reference syntax at `path`; it does not name a resolvable local schema. |
| `unknown_schema_ref` | The `$use` target does not exist; define the referenced schema or fix the name (see `didYouMean`/`suggestions`). |
| `schema_ref_conflict` | Two schema references collide; rename one so a single `$use` target resolves unambiguously. |
| `invalid_expression` | Fix the `${...}` expression syntax at `path`; it does not parse. |
| `expr_unknown_root` | The expression references an unknown root; use a declared input/step/connector root (see `suggestions`). |
| `expr_root_unavailable` | The referenced root is not in scope at this step; reference only inputs and prior steps, never later ones. |
| `expr_operator_not_allowed` | Remove the disallowed operator from the expression; only the supported safe operators (e.g. `??`) are permitted. |
| `expr_if_not_boolean` | The `if` condition must evaluate to a boolean; adjust the expression so it yields true/false. |
| `unknown_step_ref` | The flow references a step id that does not exist; fix the step name (see `didYouMean`). |
| `forward_step_ref` | A step references a later step; reorder so each step only reads from steps recorded before it. |
| `self_step_ref` | A step references its own output; remove the self-reference. |
| `duplicate_step_id` | Two recorded steps share an id; the recorder derives ids from calls — restructure so each connector call is distinct. |
| `invalid_fulfilment` | The `fulfil` function records something the compiler cannot model (e.g. branching on a runtime value); record a linear sequence of connector calls and use declarative conditions. |
| `invalid_elicitation_schema` | Make the requested input a flat object of supported string/number/boolean/enum fields with no credential-shaped keys, and keep `required` names aligned with declared properties. |
| `invalid_elicitation_flow` | Move every `ctx.elicit` before the first connector operation in the flow, so suspension cannot strand an already-applied side effect. |
| `invalid_confirmation_flow` | Limit a tool marked `confirm: true` to one connector operation, or split the workflow so its complete resolved action can be reviewed and bound. |
| `arg_type_mismatch` | A connector call argument has the wrong type; match the operation input type shown under `expected`/`got`. |
| `ambient_context_action` | Replace the ambient provider call at `path` with a read-only connector operation; per-invocation context resolution must not cause side effects. |
| `duplicate_resource` | Two resources share an identity; give each `resource(...)` a unique name. |
| `duplicate_prompt` | Two prompts share a name; rename one `prompt(...)`. |
| `duplicate_resource_uri` | Two resources resolve to the same URI; make each resource URI unique. |
| `unsupported_uri_template` | Fix the resource URI template to a supported form at the cited `path`. |
| `duplicate_widget` | Two tool views share an identity; give each `viewName` or `view.component` a unique name. |
| `unknown_widget_tool` | The widget references a tool that does not exist; point `tool`/`view` at a declared tool (see `didYouMean`). |
| `unknown_widget_action_tool` | A widget action calls a tool that is not declared; declare it or fix the action target name. |
| `duplicate_widget_tool` | A tool is bound to more than one widget; bind each tool to a single widget. |
| `invalid_widget_binding` | Fix the `data-bind`/binding expression in the widget; it does not resolve against the tool output. |
| `invalid_widget_state_handle` | Correct the state handle reference; declare it under `server(..., { state: { handles } })` and reference it by its declared name. |
| `widget_html_too_large` | Reduce the compiled widget below 10 MiB UTF-8 (or raw HTML below 256 KiB) by moving large media and dynamic data into hosted resources or bounded app-only tools. |
| `widget_html_total_too_large` | Reduce aggregate widget HTML below 20 MiB UTF-8; share or externalize large payloads instead of duplicating them across initial widget resources. |
| `invalid_asset` | Fix the `asset("./path")` reference; the file must exist and be a supported asset type. |
| `invalid_capability_requirement` | Correct the declared capability/permission requirement to a supported value. |
| `state_secret_field` | Remove the secret-shaped field from widget/handle state; secrets must never be stored in state or sent to widgets. |
| `unknown_connector_alias` | The tool calls a connector alias not declared in `use`/`provides`; add it or fix the alias (see `suggestions`). |
| `connector_not_in_catalog` | The referenced connector is not in the resolved catalog; add it to the project connectors or correct the reference. |
| `unknown_operation` | The connector has no such operation; use an operation declared on that connector (see `didYouMean`/`suggestions`). |
| `connector_binding_required` | Bind the connector alias with `bind(connector, { profile, connection })`; credential-requiring operations cannot use an unbound alias. |
| `unsupported_credential_profile` | Select a credential profile declared by the connector and accepted by the operation; use the reported suggestions instead of inventing a profile name. |
| `credential_scope_mismatch` | Declare a connection source whose scopes include every operation-required scope, or select an external exchange provider that can mint them. |
| `credential_audience_mismatch` | Set the connection source audience to the operation-required audience exactly, or use an external exchange provider that can mint it. |
| `customer_endpoint_auth_required` | Protect the app with direct or federated `customerAuth` OIDC and map every reachable `customerEndpoint` key under auth routing. |
| `customer_endpoint_mapping_required` | Add the endpoint key at the cited auth routing path; every direct/federated issuer must map every customer endpoint used by the app. |
| `customer_endpoint_unknown_mapping` | Remove the unknown or unused auth routing key, or use that exact declared `customerEndpoint` key from a reachable connector operation. |
| `customer_endpoint_bridge_unsupported` | Replace the Firebase/Microsoft bridge with direct or federated OIDC before using auth-derived customer connector endpoints. |
| `customer_endpoint_action_unsupported` | Set exact `annotations.confirm: true` on the enclosing tool, or keep the customer-routed operation read-only; action hints alone do not enable confirmation. |
| `customer_endpoint_surface_unsupported` | Move the customer-routed call into a tool fulfilment; routed resources, prompts, and ambient providers are unsupported. |
| `customer_endpoint_credential_source_unsupported` | Remove the manifest connection binding; a customer-routed connector uses its declared delegated token exchange auth or no auth. |
| `customer_endpoint_policy_conflict` | Give every reachable declaration of this endpoint key one identical policy, or rename keys whose allowed origins differ. |
| `customer_endpoint_routing_inconsistent` | Regenerate the connector catalog so every action route includes all of its ordinary customer endpoint dependencies. |
| `unused_connector_alias` | A declared connector alias is never called; remove the unused `use` entry or wire it into a tool. |
| `arg_mismatch` | A connector call is missing or adds arguments; match the operation signature under `expected`/`got`. |