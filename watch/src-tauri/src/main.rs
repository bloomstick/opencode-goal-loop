// Watch shell: sidecar owns exactly one seam: reading the `opencode serve
// --service` registration file and returning the endpoint. Live chat runs
// over @opencode/client SSE from the frontend; there are no git/gh/capture
// children, no store file I/O, no watchers, no polling, no long-lived
// handles: this command does one file read and returns.

/// no polling. The browser bundle cannot use `@opencode/client/service`
/// (it imports `node:child_process`/`node:fs`, which Vite cannot bundle for
/// the WebView), so the sidecar reads the service registration file that
/// `opencode serve --service` maintains and returns the endpoint. The
/// frontend then probes reachability over HTTP and builds auth headers
/// itself. Auth material passes through frontend memory only, exactly as
/// before -- no credential values are logged here.

/// Where `opencode serve --service` writes `service.json`:
/// `$XDG_STATE_HOME/opencode/service.json`, else
/// `~/.local/state/opencode/service.json`.
fn opencode_service_file() -> Option<std::path::PathBuf> {
    if let Ok(dir) = std::env::var("XDG_STATE_HOME") {
        if !dir.trim().is_empty() {
            return Some(std::path::Path::new(&dir).join("opencode/service.json"));
        }
    }
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok()?;
    if home.trim().is_empty() {
        return None;
    }
    Some(std::path::Path::new(&home).join(".local/state/opencode/service.json"))
}

#[derive(serde::Serialize)]
struct ServiceEndpoint {
    url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    password: Option<String>,
}

/// Read the registered `opencode serve --service` endpoint, if any.
/// Returns `{"url": ..., "password": ...?}` as JSON; callers build the
/// Basic auth header themselves. Errors when no service is registered --
/// start one with `opencode serve --service`, then retry (caller-driven,
/// no loops here).
#[tauri::command]
fn opencode_service_endpoint() -> Result<ServiceEndpoint, String> {
    let path = opencode_service_file()
        .ok_or_else(|| "no home directory: cannot locate the opencode service registration".to_string())?;
    let text = std::fs::read_to_string(&path).map_err(|_| {
        "no registered opencode service (run `opencode serve --service` first)".to_string()
    })?;
    let value: serde_json::Value = serde_json::from_str(&text)
        .map_err(|_| "opencode service registration is not valid JSON".to_string())?;
    let url = value
        .get("url")
        .and_then(|u| u.as_str())
        .filter(|u| !u.trim().is_empty())
        .ok_or_else(|| "opencode service registration has no url".to_string())?
        .to_string();
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("opencode service registration url is not http(s)".to_string());
    }
    let password = value
        .get("password")
        .and_then(|p| p.as_str())
        .filter(|p| !p.is_empty())
        .map(str::to_string);
    Ok(ServiceEndpoint { url, password })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![opencode_service_endpoint])
        .run(tauri::generate_context!())
        .expect("error while running watch application");
}
