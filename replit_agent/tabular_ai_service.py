from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import os
import requests
from tabpfn import TabPFNClassifier
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecordsRequest(BaseModel):
    records: List[Dict[str, Any]]
    mode: Optional[str] = 'tabpfn'  # 'tabpfn', 'huggingface', 'basic'

HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY')
HF_MODEL = os.getenv('HUGGINGFACE_MODEL', 'meta-llama/Meta-Llama-3-8B-Instruct')

@app.post("/clean_enrich")
def clean_enrich(request: RecordsRequest):
    df = pd.DataFrame(request.records)
    mode = request.mode or 'tabpfn'
    used_ai = mode
    error_rows = []
    enhancement_stats = {}
    duplicate_warnings = []
    cleaned_records = []

    if mode == 'huggingface':
        if not HUGGINGFACE_API_KEY:
            return {"error": "No Hugging Face API key set in environment.", "data": [], "usedAI": used_ai}
        for idx, row in df.iterrows():
            prompt = f"Clean and enrich this user profile row as JSON: {row.to_dict()}"
            try:
                response = requests.post(
                    f"https://api-inference.huggingface.co/models/{HF_MODEL}",
                    headers={"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"},
                    json={"inputs": prompt, "parameters": {"max_new_tokens": 256}}
                )
                result = response.json()
                # Try to extract JSON from the response
                text = result.get("generated_text") or (result[0]["generated_text"] if isinstance(result, list) and result and "generated_text" in result[0] else None)
                if text:
                    # Try to parse JSON from the text
                    import json, re
                    match = re.search(r'\{.*\}', text, re.DOTALL)
                    if match:
                        try:
                            cleaned = json.loads(match.group(0))
                            cleaned_records.append(cleaned)
                        except Exception:
                            cleaned_records.append(row.to_dict())
                    else:
                        cleaned_records.append(row.to_dict())
                else:
                    cleaned_records.append(row.to_dict())
            except Exception as e:
                error_rows.append({"rowIndex": idx+1, "data": row.to_dict(), "error": str(e)})
                cleaned_records.append(row.to_dict())
    elif mode == 'tabpfn':
        # For MVP, just do cleaning; advanced: impute if label present
        df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
        df = df.fillna("")
        cleaned_records = df.to_dict(orient="records")
    else:  # basic
        df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
        df = df.fillna("")
        cleaned_records = df.to_dict(orient="records")

    return {
        "data": cleaned_records,
        "errorRows": error_rows,
        "enhancementStats": enhancement_stats,
        "duplicateWarnings": duplicate_warnings,
        "usedAI": used_ai
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 