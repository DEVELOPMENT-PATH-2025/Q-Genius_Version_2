# Hugging Face (Open-Source Models) Integration

Q-Genius can generate questions with open-source models hosted on
[Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers), as an
alternative to Google Gemini. The router exposes an OpenAI-compatible
`POST https://router.huggingface.co/v1/chat/completions` endpoint, so any chat model on the
router (Llama, Qwen, Mistral, gpt-oss, ...) can be used by changing the model id.

## How it is wired

| Piece | Purpose |
| --- | --- |
| `services/aiProvider.ts` | Stores the selected provider, HF token and HF model in `localStorage`. |
| `services/huggingFaceService.ts` | Calls the HF router (chat completions), builds the JSON question prompt, parses and normalizes the result to `Question[]`. |
| `services/aiService.ts` | Dispatcher used by the UI: routes each call to Gemini or Hugging Face. |
| `server.ts` | `GET /api/hf/status` and `POST /api/hf/chat` — proxy that keeps a deployment-wide `HF_TOKEN` off the browser. |
| `pages/FacultyDashboard.tsx` | "API Settings" tab: provider switch, token field, model field. |

Token resolution order:

1. Token pasted in **Settings → API Settings → Hugging Face Access Token** → called directly from the browser.
2. Otherwise the request goes to `/api/hf/chat`, which uses the server-side `HF_TOKEN`.
3. If neither exists, the app reports that Hugging Face is not configured.

## Setup

1. Create a fine-grained token with the **"Make calls to Inference Providers"** permission at
   https://huggingface.co/settings/tokens.
2. Either:
   - paste it in the app under **Settings → API Settings**, or
   - set it on the server / deployment platform:
     ```bash
     HF_TOKEN=hf_xxx
     HF_MODEL=openai/gpt-oss-120b   # optional default model
     ```
3. In **Settings → API Settings**, choose **Hugging Face (open source)** as the provider.

## Models

Default: `openai/gpt-oss-120b`. Any chat/instruct model available on the router works, e.g.
`meta-llama/Llama-3.3-70B-Instruct`, `Qwen/Qwen2.5-72B-Instruct`,
`mistralai/Mistral-Small-24B-Instruct-2501`. Larger instruct models follow the strict JSON
contract more reliably; very small models often need a retry.

## What the Hugging Face provider supports

| Feature | Gemini | Hugging Face |
| --- | --- | --- |
| Generate questions from a prompt/topic | yes | yes |
| Curriculum topic extraction | yes | yes |
| Diagram placeholders for `hasImage` questions | yes | yes (same local SVG generator) |
| Question extraction from an uploaded PDF/Word (OCR, bounding boxes) | yes | no — needs Gemini |
| Template layout analysis from a document | yes | no — needs Gemini |

Document-based features rely on Gemini's multimodal file input; selecting Hugging Face and
using them raises an explicit error asking to switch back to Gemini. They could be supported
later by routing an uploaded document to a vision-language model on the router
(HF inference providers list VLM chat completion support per provider).

## Fully local alternative

If you want no external API at all, run the model yourself and point the proxy at it:
`text-generation-inference` or `vLLM` both serve an OpenAI-compatible
`/v1/chat/completions`. Replace the router URL in `server.ts` with your endpoint
(e.g. `http://localhost:8080/v1/chat/completions`); the rest of the integration is unchanged.
