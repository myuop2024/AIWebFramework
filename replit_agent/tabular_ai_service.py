from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import pandas as pd
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

@app.post("/clean_enrich")
def clean_enrich(request: RecordsRequest):
    df = pd.DataFrame(request.records)
    # Basic cleaning: fill missing values, strip whitespace, infer types
    df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
    df = df.fillna("")
    # TabPFN is a classifier, but we can use it for type inference and imputation
    # For MVP, just return cleaned records
    # (Advanced: Use TabPFN for imputation/classification if label column is present)
    cleaned_records = df.to_dict(orient="records")
    return {"data": cleaned_records, "errorRows": [], "enhancementStats": {}, "duplicateWarnings": []}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 