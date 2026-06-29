import os
import json
import boto3
from groq import Groq
from anyio.to_thread import run_sync
from app.core.config import settings

class SentimentService:
    """
    Service class interacting with AWS Bedrock or Groq to detect customer sentiment
    (positive, neutral, negative).
    """
    def __init__(self):
        # Configure Groq fallback
        self.api_key = settings.GROQ_API_KEY
        if self.api_key and self.api_key != "gsk_mock_api_key_valid_format_dummy":
            self.client = Groq(api_key=self.api_key)
        else:
            self.client = None

        # Configure AWS Bedrock
        self.bedrock_model_id = settings.AWS_BEDROCK_MODEL_ID
        self.bedrock_active = False
        if (
            settings.AWS_ACCESS_KEY_ID 
            and settings.AWS_SECRET_ACCESS_KEY 
            and self.bedrock_model_id
        ):
            try:
                self.bedrock_client = boto3.client(
                    "bedrock-runtime",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name="us-east-1"
                )
                self.bedrock_active = True
            except Exception as e:
                print(f"[SENTIMENT SERVICE] Failed to initialize AWS Bedrock client: {e}")

    async def analyze_sentiment(self, message: str) -> str:
        """
        Queries Bedrock or Groq to categorize user message sentiment.
        Returns: "positive", "neutral", or "negative".
        """
        system_prompt = (
            "Analyze the sentiment of the following customer message.\n"
            "You MUST reply with exactly one of the following words: 'positive', 'neutral', or 'negative'.\n"
            "Do not include any introductory words, explanations, or quotes."
        )

        # 1. Try AWS Bedrock
        if self.bedrock_active:
            try:
                # Format standard Llama 3 template
                prompt = "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
                prompt += system_prompt + "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
                prompt += message + "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"

                body = json.dumps({
                    "prompt": prompt,
                    "max_gen_len": 64,
                    "temperature": 0.0,
                    "top_p": 0.9
                })

                def _call_bedrock():
                    response = self.bedrock_client.invoke_model(
                        modelId=self.bedrock_model_id,
                        body=body,
                        contentType="application/json",
                        accept="application/json"
                    )
                    response_body = json.loads(response.get("body").read())
                    return response_body.get("generation", "").strip().lower().replace(".", "").replace('"', '').replace("'", "")

                sentiment = await run_sync(_call_bedrock)
                if sentiment in ["positive", "neutral", "negative"]:
                    return sentiment
            except Exception as e:
                print(f"[SENTIMENT SERVICE ERROR] AWS Bedrock sentiment failed: {e}. Trying Groq fallback.")

        # 2. Try Groq
        if self.client:
            def _call_groq():
                completion = self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message}
                    ],
                    model="llama-3.3-70b-versatile",
                    temperature=0.0
                )
                return completion.choices[0].message.content.strip().lower()

            try:
                sentiment = await run_sync(_call_groq)
                sentiment = sentiment.replace(".", "").replace('"', '').replace("'", "")
                if sentiment in ["positive", "neutral", "negative"]:
                    return sentiment
            except Exception as e:
                print(f"[SENTIMENT SERVICE ERROR] Groq sentiment failed: {e}. Trying offline heuristics.")

        # 3. Offline Heuristics Fallback
        msg_lower = message.lower()
        if any(w in msg_lower for w in ["hate", "worst", "bad", "angry", "terrible", "disappointed", "poor"]):
            return "negative"
        if any(w in msg_lower for w in ["love", "great", "thank", "awesome", "perfect", "happy"]):
            return "positive"
        return "neutral"
