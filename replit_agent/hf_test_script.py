import os
import requests
import json

HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY')
# TEST_MODEL = 'distilbert-base-uncased-finetuned-sst-2-english' # Keep old one for reference
TEST_MODEL_GENERATION = 'gpt2' # New model for testing

def run_test():
    if not HUGGINGFACE_API_KEY:
        print(json.dumps({"error": "HUGGINGFACE_API_KEY not set in environment.", "status": "failure"}))
        return

    # Using the text generation model for this test
    api_url = f"https://api-inference.huggingface.co/models/{TEST_MODEL_GENERATION}"
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    # Payload for text generation is slightly different
    payload = {"inputs": "Hello, my name is"}

    print(f"Attempting to connect to {api_url} (model: {TEST_MODEL_GENERATION}) with key ending in ...{HUGGINGFACE_API_KEY[-4:] if HUGGINGFACE_API_KEY else 'None'}")

    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=20)
        response.raise_for_status()  # Raises an exception for 4XX/5XX errors
        result = response.json()
        print(json.dumps({"status": "success", "result": result}, indent=2))
    except requests.exceptions.Timeout:
        print(json.dumps({"error": "Request to Hugging Face timed out", "status": "failure"}, indent=2))
    except requests.exceptions.HTTPError as e:
        error_detail = f"HTTP error: {e.response.status_code}"
        try:
            error_detail += f" - {e.response.json()}"
        except ValueError:
            error_detail += f" - {e.response.text}"
        print(json.dumps({"error": error_detail, "status": "failure"}, indent=2))
    except requests.exceptions.RequestException as e:
        print(json.dumps({"error": f"Request failed: {e}", "status": "failure"}, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {type(e).__name__} - {str(e)}", "status": "failure"}, indent=2))

if __name__ == "__main__":
    run_test()
