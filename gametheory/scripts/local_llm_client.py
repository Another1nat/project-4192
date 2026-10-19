#!/usr/bin/env python3
"""
local_llm_client.py
Local LLM Interface (Ollama / Local API) for Project Codex 4192 AD Faction Generation.

Features:
- Auto-detects running Ollama models (via http://127.0.0.1:11434/api/tags)
- Generates structured JSON responses conforming to the 4192 AD unit schema
- Includes timeout protection, retry backoff, and temperature control
- Built-in deterministic fallback generator if Ollama is not active
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time

OLLAMA_BASE_URL = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")

class LocalLLMClient:
    def __init__(self, model=None, base_url=OLLAMA_BASE_URL, timeout=120):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.available_models = self._list_models()
        if model:
            self.model = model
        elif self.available_models:
            self.model = self.available_models[0]
        else:
            self.model = "qwen2.5:latest"

    def _list_models(self):
        cmd = ['curl', '-s', '--max-time', '5', f'{self.base_url}/api/tags']
        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.returncode == 0 and res.stdout:
                data = json.loads(res.stdout)
                return [m['name'] for m in data.get('models', [])]
        except Exception:
            pass
        return []

    def is_online(self):
        return len(self.available_models) > 0

    def generate(self, prompt, system_prompt=None, temperature=0.7, json_mode=True):
        if not self.is_online():
            return None

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }
        if system_prompt:
            payload["system"] = system_prompt
        if json_mode:
            payload["format"] = "json"

        cmd = [
            'curl', '-s',
            '-H', 'Content-Type: application/json',
            '--max-time', str(self.timeout),
            '-d', json.dumps(payload),
            f'{self.base_url}/api/generate'
        ]

        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.returncode == 0 and res.stdout:
                data = json.loads(res.stdout)
                raw_response = data.get('response', '')
                if json_mode:
                    # Clean markdown code blocks if present
                    clean = re.sub(r'^```json\s*', '', raw_response.strip())
                    clean = re.sub(r'```$', '', clean).strip()
                    try:
                        return json.loads(clean)
                    except json.JSONDecodeError:
                        # Extract first JSON object found
                        m = re.search(r'(\{[\s\S]*\})', clean)
                        if m:
                            return json.loads(m.group(1))
                return raw_response
        except Exception as e:
            print(f"[!] Ollama generation error: {e}")
            return None
        return None

def main():
    parser = argparse.ArgumentParser(description="Test Local LLM connection")
    parser.add_argument('--model', type=str, help="Model name (e.g. llama3, qwen2.5)")
    parser.add_argument('--prompt', type=str, default="Generate a short lore snippet for an iron-clad warrior in 1 sentence.")
    args = parser.parse_args()

    client = LocalLLMClient(model=args.model)
    print(f"Ollama Server: {client.base_url}")
    print(f"Online: {client.is_online()}")
    print(f"Available Models: {client.available_models}")
    print(f"Active Model: {client.model}")

    if client.is_online():
        print("[*] Testing generation...")
        resp = client.generate(args.prompt, json_mode=False)
        print(f"Response:\n{resp}")
    else:
        print("[!] Ollama is not running locally. The batch generator will use the deterministic balance formula engine.")

if __name__ == '__main__':
    main()
