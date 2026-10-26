import { readFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
export function workflowPolicy({
  config,
  eventName,
  actor,
  event,
  ref = "refs/heads/main",
}) {
  let allowed = actor?.toLowerCase() === config.owner.toLowerCase(),
    mode = "daily";
  if (
    event.repository?.full_name &&
    event.repository.full_name.toLowerCase() !==
      (config.owner + "/" + config.repository).toLowerCase()
  )
    allowed = false;
  if (eventName === "issues") {
    allowed =
      allowed &&
      event.issue?.user?.login?.toLowerCase() === config.owner.toLowerCase() &&
      !event.issue?.pull_request &&
      [
        "opened",
        "edited",
        "closed",
        "reopened",
        "labeled",
        "unlabeled",
      ].includes(event.action);
    mode = "registration";
  } else if (eventName === "schedule")
    mode = event.schedule === "43 0 * * 1" ? "weekly" : "daily";
  else if (eventName === "workflow_dispatch")
    mode = ["daily", "weekly", "registration"].includes(event.inputs?.mode)
      ? event.inputs.mode
      : "daily";
  else if (eventName === "push") allowed = allowed && ref === "refs/heads/main";
  else allowed = false;
  return {
    allowed: !!allowed,
    mode,
    dryRun:
      eventName === "workflow_dispatch" &&
      (event.inputs?.dry_run === true || event.inputs?.dry_run === "true"),
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const config = JSON.parse(await readFile("config/app.json", "utf8")),
    event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
  const policy = workflowPolicy({
    config,
    eventName: process.env.GITHUB_EVENT_NAME,
    actor: process.env.GITHUB_ACTOR,
    ref: process.env.GITHUB_REF,
    event,
  });
  const output =
    "allowed=" +
    policy.allowed +
    "\nmode=" +
    policy.mode +
    "\ndry_run=" +
    policy.dryRun +
    "\n";
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, output);
  else console.log(output);
}
