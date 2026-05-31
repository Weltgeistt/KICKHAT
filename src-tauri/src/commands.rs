use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::sync::Mutex;
use tauri::State;
use tauri::{Emitter, Window};

pub struct AppState {
    pub auth_token: Mutex<Option<String>>,
    pub chatroom_id: Mutex<Option<u64>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KickChannel {
    pub id: u64,
    pub slug: String,
    pub chatroom: KickChatroom,
    pub user: KickUser,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KickChatroom {
    pub id: u64,
    pub chat_mode: Option<String>,
    pub slow_mode: Option<bool>,
    pub slow_mode_cooldown: Option<u32>,
    pub subscribers_mode: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KickUser {
    pub id: u64,
    pub username: String,
    pub profile_pic: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse {
    pub success: bool,
    pub message: Option<String>,
}

fn build_client(token: Option<&str>) -> reqwest::Client {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert("Accept", "application/json".parse().unwrap());
    headers.insert("Content-Type", "application/json".parse().unwrap());
    headers.insert(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            .parse()
            .unwrap(),
    );
    headers.insert("Origin", "https://kick.com".parse().unwrap());
    headers.insert("Referer", "https://kick.com/".parse().unwrap());
    headers.insert(
        "Accept-Language",
        "en-US,en;q=0.9,tr;q=0.8".parse().unwrap(),
    );
    headers.insert("Sec-Fetch-Dest", "empty".parse().unwrap());
    headers.insert("Sec-Fetch-Mode", "cors".parse().unwrap());
    headers.insert("Sec-Fetch-Site", "same-origin".parse().unwrap());

    if let Some(t) = token {
        let bearer = format!("Bearer {}", t);
        headers.insert(reqwest::header::AUTHORIZATION, bearer.parse().unwrap());
    }
    reqwest::Client::builder()
        .default_headers(headers)
        .cookie_store(true)
        .build()
        .unwrap()
}

// ── Commands ────────────────────────────────────────────────────────────

/// Kanal bilgilerini ve chatroom ID'yi çek
#[tauri::command]
pub async fn get_channel_info(slug: String) -> Result<serde_json::Value, String> {
    let client = build_client(None);
    let url = format!("https://kick.com/api/v2/channels/{}", slug);

    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("İstek başarısız: {}", e))?;

    if !res.status().is_success() {
        return Err(format!(
            "Kanal bulunamadı (HTTP {}). Slug doğru mu?",
            res.status()
        ));
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("JSON parse hatası: {}", e))?;

    Ok(json)
}

/// Token kaydet
#[tauri::command]
pub async fn set_auth_token(token: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut t = state.auth_token.lock().unwrap();
    *t = Some(token);
    Ok(())
}

/// Token al
#[tauri::command]
pub async fn get_auth_token(state: State<'_, AppState>) -> Result<Option<String>, String> {
    Ok(state.auth_token.lock().unwrap().clone())
}

/// Mesaj sil
#[tauri::command]
pub async fn delete_message(
    chatroom_id: u64,
    message_id: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let token = state.auth_token.lock().unwrap().clone();
    let client = build_client(token.as_deref());

    let url = format!(
        "https://kick.com/api/v2/chatrooms/{}/messages/{}",
        chatroom_id, message_id
    );

    let res = client
        .delete(&url)
        .send()
        .await
        .map_err(|e| format!("Silme isteği başarısız: {}", e))?;

    let status = res.status();
    let json: serde_json::Value = res
        .json()
        .await
        .unwrap_or(serde_json::json!({"status": status.as_u16()}));

    Ok(json)
}

/// Kullanıcıyı banla
#[tauri::command]
pub async fn ban_user(
    channel_slug: String,
    username: String,
    permanent: bool,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let token = state.auth_token.lock().unwrap().clone();
    let client = build_client(token.as_deref());

    let url = format!("https://kick.com/api/v2/channels/{}/bans", channel_slug);

    let body = serde_json::json!({
        "banned_username": username,
        "permanent": permanent,
    });

    let res = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Ban isteği başarısız: {}", e))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();
    let json: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!({}));

    if !status.is_success() {
        return Err(format!(
            "Ban başarısız (HTTP {}): {}",
            status.as_u16(),
            text
        ));
    }

    Ok(json)
}

/// Timeout ver
#[tauri::command]
pub async fn timeout_user(
    channel_slug: String,
    username: String,
    duration: u64,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let token = state.auth_token.lock().unwrap().clone();
    let client = build_client(token.as_deref());

    let url = format!("https://kick.com/api/v2/channels/{}/bans", channel_slug);

    let body = serde_json::json!({
        "banned_username": username,
        "permanent": false,
        "duration": duration,
    });

    let res = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Timeout isteği başarısız: {}", e))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();
    let json: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!({}));

    if !status.is_success() {
        return Err(format!(
            "Timeout başarısız (HTTP {}): {}",
            status.as_u16(),
            text
        ));
    }

    Ok(json)
}

/// Slow mode aç/kapat
#[tauri::command]
pub async fn toggle_slow_mode(
    channel_slug: String,
    enabled: bool,
    cooldown: u32,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let token = state.auth_token.lock().unwrap().clone();
    let client = build_client(token.as_deref());

    let url = format!(
        "https://kick.com/api/v2/channels/{}/slow-mode",
        channel_slug
    );

    let body = serde_json::json!({
        "enabled": enabled,
        "message_interval": cooldown,
    });

    let res = client
        .put(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Slow mode isteği başarısız: {}", e))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();
    let json: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!({}));

    if !status.is_success() {
        return Err(format!(
            "Slow mode başarısız (HTTP {}): {}",
            status.as_u16(),
            text
        ));
    }

    Ok(json)
}

/// Subscribers-only mode aç/kapat
#[tauri::command]
pub async fn toggle_subscribers_mode(
    channel_slug: String,
    enabled: bool,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let token = state.auth_token.lock().unwrap().clone();
    let client = build_client(token.as_deref());

    let url = format!(
        "https://kick.com/api/v2/channels/{}/subscribers-mode",
        channel_slug
    );

    let body = serde_json::json!({"enabled": enabled});

    let res = client
        .put(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Subscribers mode isteği başarısız: {}", e))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();
    let json: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!({}));

    if !status.is_success() {
        return Err(format!(
            "Abone modu başarısız (HTTP {}): {}",
            status.as_u16(),
            text
        ));
    }

    Ok(json)
}

/// Kullanıcı bilgisini getir (profil)
#[tauri::command]
pub async fn get_user_info(username: String) -> Result<serde_json::Value, String> {
    let client = build_client(None);
    let url = format!("https://kick.com/api/v2/channels/{}", username);

    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Kullanıcı bilgisi alınamadı: {}", e))?;

    let json: serde_json::Value = res.json().await.unwrap_or(serde_json::json!({}));

    Ok(json)
}

/// Kullanıcının o kanaldaki (mod/yayıncı yetkisiyle görülebilen) mesaj geçmişini getirir
#[tauri::command]
pub async fn get_user_channel_messages(
    channel_slug: String,
    username: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let token = state.auth_token.lock().unwrap().clone();
    let client = build_client(token.as_deref());

    // Kick'in kendi moderasyon API'si:
    let url = format!(
        "https://kick.com/api/v2/channels/{}/users/{}/messages",
        channel_slug, username
    );

    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Mesaj geçmişi alınamadı: {}", e))?;

    let json: serde_json::Value = res.json().await.unwrap_or(serde_json::json!({}));

    Ok(json)
}

/// Mesaj gönder
#[tauri::command]
pub async fn send_chat_message(
    chatroom_id: u64,
    content: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let token = state.auth_token.lock().unwrap().clone();
    let client = build_client(token.as_deref());

    let url = format!("https://kick.com/api/v2/messages/send/{}", chatroom_id);

    let body = serde_json::json!({
        "content": content,
        "type": "message",
    });

    let res = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Mesaj gönderilemedi: {}", e))?;

    let http_status = res.status();
    let json: serde_json::Value = res.json().await.unwrap_or(serde_json::json!({}));

    // Kick bazen HTTP 200 dönüp hatayı gövdede taşır (status.error)
    let body_err = json
        .pointer("/status/error")
        .and_then(|e| e.as_bool())
        .unwrap_or(false);

    if !http_status.is_success() || body_err {
        let msg = json
            .pointer("/status/message")
            .and_then(|m| m.as_str())
            .or_else(|| json.get("message").and_then(|m| m.as_str()))
            .or_else(|| json.get("error").and_then(|m| m.as_str()))
            .unwrap_or("Mesaj gönderilemedi (abone modu / yetki gerekebilir)");
        return Err(format!("{} (HTTP {})", msg, http_status.as_u16()));
    }

    Ok(json)
}

/// Global Chat Geçmişini Getir (KickLogz API - Arka Plan)
#[tauri::command]
pub async fn fetch_global_history(username: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://kicklogz.com/api/customer/v1/search?user={}",
        username
    );

    let res = client
        .get(&url)
        // Eğer API anahtarı satın alırsanız buraya eklenecektir:
        // .header("x-kicklogz-api-key", "SİZİN_ANAHTARINIZ")
        .send()
        .await
        .map_err(|e| format!("KickLogz bağlantı hatası: {}", e))?;

    let status = res.status();
    let json: serde_json::Value = res.json().await.unwrap_or_else(|_| {
        serde_json::json!({
            "error": "JSON parse edilemedi",
            "status": status.as_u16()
        })
    });

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "data": json
    }))
}

#[tauri::command]
pub async fn fetch_turkey_trends(
    query: Option<String>,
    timeframe: Option<String>,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let time_str = match timeframe.as_deref() {
        Some("1d") => "+when:1d",
        Some("3d") => "+when:3d",
        Some("7d") => "+when:7d",
        _ => "",
    };

    let url = match query {
        Some(q) if !q.trim().is_empty() => format!(
            "https://news.google.com/rss/search?q={}{}&hl=tr&gl=TR&ceid=TR:tr",
            q.trim().replace(" ", "+"),
            time_str
        ),
        _ => {
            if !time_str.is_empty() {
                format!(
                    "https://news.google.com/rss/search?q=türkiye{}&hl=tr&gl=TR&ceid=TR:tr",
                    time_str
                )
            } else {
                "https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr".to_string()
            }
        }
    };

    let res = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("RSS bağlantı hatası: {}", e))?;

    let text = res
        .text()
        .await
        .map_err(|e| format!("RSS okuma hatası: {}", e))?;

    let mut headlines = Vec::new();
    // Item'ları ayır
    for part in text.split("<item>") {
        if let Some(end) = part.find("</item>") {
            let item_str = &part[..end];
            let title_opt = item_str
                .split("<title>")
                .nth(1)
                .and_then(|t| t.split("</title>").next());
            let desc_opt = item_str
                .split("<description>")
                .nth(1)
                .and_then(|d| d.split("</description>").next());

            if let (Some(title), Some(mut desc)) = (title_opt, desc_opt) {
                if !title.contains("Google Haberler") && !title.contains("Google News") {
                    let clean_title = title
                        .replace("&quot;", "\"")
                        .replace("&#39;", "'")
                        .replace("&amp;", "&");

                    // Basit HTML temizleme (unescape ve tag silme)
                    let mut text = desc
                        .replace("&lt;", "<")
                        .replace("&gt;", ">")
                        .replace("&quot;", "\"")
                        .replace("&#39;", "'")
                        .replace("&amp;", "&")
                        .replace("&nbsp;", " ");

                    // HTML taglarını sil (<...>)
                    while let Some(start) = text.find('<') {
                        if let Some(end) = text[start..].find('>') {
                            text.replace_range(start..start + end + 1, "");
                        } else {
                            break;
                        }
                    }

                    let clean_desc = text.trim().to_string();

                    headlines.push(format!("{}:::{}", clean_title, clean_desc));
                    if headlines.len() >= 15 {
                        break;
                    }
                }
            }
        }
    }

    if headlines.is_empty() {
        return Ok(
            "Şu an öne çıkan özel bir trend bulunamadı.:::Lütfen daha sonra tekrar deneyin."
                .to_string(),
        );
    }

    Ok(headlines.join("\n"))
}

// ── Ollama Proxy ─────────────────────────────────────────────────────────────
// Frontend'den direkt fetch yapılamadığı için (Mixed Content / CSP kısıtlaması),
// Ollama API çağrıları Rust üzerinden yapılır.

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OllamaMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaRequest {
    pub model: String,
    pub messages: Vec<OllamaMessage>,
    pub stream: bool,
    pub options: Option<serde_json::Value>,
}

#[tauri::command]
pub async fn call_ollama(payload: OllamaRequest) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .post("http://localhost:11434/api/chat")
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Ollama bağlantı hatası: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama HTTP hatası: {}", response.status()));
    }

    let text = response.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaGenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
    pub format: Option<String>,
    pub options: Option<serde_json::Value>,
}

#[tauri::command]
pub async fn call_ollama_generate(payload: OllamaGenerateRequest) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .post("http://localhost:11434/api/generate")
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Ollama bağlantı hatası: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama HTTP hatası: {}", response.status()));
    }

    let text = response.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomAiRequest {
    pub endpoint: String,
    pub api_key: String,
    pub payload: serde_json::Value,
}

#[tauri::command]
pub async fn call_custom_ai(req: CustomAiRequest) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let mut request_builder = client
        .post(&req.endpoint)
        .header("Content-Type", "application/json");

    if !req.api_key.trim().is_empty() {
        request_builder =
            request_builder.header("Authorization", format!("Bearer {}", req.api_key.trim()));
    }

    let response = request_builder
        .json(&req.payload)
        .send()
        .await
        .map_err(|e| format!("Custom AI bağlantı hatası: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err(format!("API hatası (HTTP {}): {}", status, err_text));
    }

    let text = response.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[derive(Clone, Serialize)]
struct DownloadProgress {
    downloaded: u64,
    total: u64,
}

#[tauri::command]
pub async fn download_ollama(window: Window) -> Result<String, String> {
    let url = "https://ollama.com/download/OllamaSetup.exe";
    let res = reqwest::get(url)
        .await
        .map_err(|e| format!("İndirme isteği başarısız: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Dosya bulunamadı: HTTP {}", res.status()));
    }

    let total_size = res.content_length().unwrap_or(0);

    // Windows Temp dizinine kaydet
    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join("OllamaSetup.exe");

    let mut file =
        std::fs::File::create(&file_path).map_err(|e| format!("Dosya oluşturulamadı: {}", e))?;
    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Veri okuma hatası: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Dosya yazma hatası: {}", e))?;
        downloaded += chunk.len() as u64;

        let _ = window.emit(
            "download_progress",
            DownloadProgress {
                downloaded,
                total: total_size,
            },
        );
    }

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn install_ollama(path: String) -> Result<(), String> {
    std::process::Command::new(path)
        .spawn()
        .map_err(|e| format!("Kurulum başlatılamadı: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn check_ollama_status() -> Result<bool, String> {
    let url = "http://127.0.0.1:11434/";
    let client = reqwest::Client::new();
    match client
        .get(url)
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await
    {
        Ok(res) => Ok(res.status().is_success()),
        Err(_) => Ok(false),
    }
}

#[derive(Clone, Serialize)]
struct PullProgress {
    status: String,
    completed: u64,
    total: u64,
}

#[derive(Deserialize)]
struct OllamaPullResponse {
    status: String,
    completed: Option<u64>,
    total: Option<u64>,
}

#[tauri::command]
pub async fn pull_ollama_model(window: Window, model: String) -> Result<(), String> {
    let url = "http://127.0.0.1:11434/api/pull";
    let client = reqwest::Client::new();
    let res = client
        .post(url)
        .json(&serde_json::json!({ "name": model }))
        .send()
        .await
        .map_err(|e| format!("Ollama'ya bağlanılamadı: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Model çekme hatası: HTTP {}", res.status()));
    }

    let mut stream = res.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream okuma hatası: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(idx) = buffer.find('\n') {
            let line = buffer[..idx].to_string();
            buffer = buffer[idx + 1..].to_string();

            if let Ok(parsed) = serde_json::from_str::<OllamaPullResponse>(&line) {
                let _ = window.emit(
                    "pull_progress",
                    PullProgress {
                        status: parsed.status,
                        completed: parsed.completed.unwrap_or(0),
                        total: parsed.total.unwrap_or(1),
                    },
                );
            }
        }
    }

    Ok(())
}
