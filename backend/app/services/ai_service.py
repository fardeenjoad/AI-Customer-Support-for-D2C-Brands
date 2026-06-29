import os
import json
import boto3
from groq import Groq
from anyio.to_thread import run_sync
from app.core.config import settings
from typing import List, Dict, Any, Optional

class AIService:
    """
    Service class interacting with AWS Bedrock (Llama 3 model) or Groq API
    to answer support questions, parse intents, and flag escalations.
    """
    def __init__(self):
        # Configure Groq fallback client
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
                print(f"[AI SERVICE] Failed to initialize AWS Bedrock client: {e}")

    async def _invoke_bedrock_llama(
        self, 
        system_prompt: str, 
        user_message: str, 
        history: Optional[List[dict]] = None, 
        temperature: float = 0.2
    ) -> str:
        """
        Formats Llama 3 prompt and invokes AWS Bedrock model.
        """
        # Format using standard Llama 3 prompt instructions template
        prompt = "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
        prompt += system_prompt + "<|eot_id|>"
        
        if history:
            for msg in history:
                role = "assistant" if msg.get("sender") == "ai" else "user"
                prompt += f"<|start_header_id|>{role}<|end_header_id|>\n\n"
                prompt += msg.get("content") + "<|eot_id|>"
                
        prompt += "<|start_header_id|>user<|end_header_id|>\n\n"
        prompt += user_message + "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"

        body = json.dumps({
            "prompt": prompt,
            "max_gen_len": 512,
            "temperature": temperature,
            "top_p": 0.9
        })

        def _call():
            response = self.bedrock_client.invoke_model(
                modelId=self.bedrock_model_id,
                body=body,
                contentType="application/json",
                accept="application/json"
            )
            response_body = json.loads(response.get("body").read())
            # For Llama 3 on Bedrock, output is under 'generation'
            return response_body.get("generation", "").strip()

        return await run_sync(_call)

    async def generate_reply(
        self, 
        customer_message: str, 
        brand_context: dict, 
        message_history: Optional[List[dict]] = None
    ) -> str:
        """
        Generates a customer-facing support reply using Bedrock or Groq.
        Builds a conversation transcript from full message history so the AI
        can distinguish customer, agent, and AI messages by role.
        """
        brand_name = brand_context.get("brand_name", "EcoStyle")
        tone = brand_context.get("tone", "professional")
        faqs = brand_context.get("faqs", [])
        custom_greeting = brand_context.get("custom_greeting", "Hello! How can I help you today?")

        faq_str = "\n".join([f"Q: {faq.get('question')}\nA: {faq.get('answer')}" for faq in faqs])

        # Build a labelled conversation transcript from full history
        conversation_lines = []
        if message_history:
            for msg in message_history:
                sender_label = msg.get("sender", "customer").capitalize()
                conversation_lines.append(f"[{sender_label}] {msg.get('content')}")
        conversation_str = "\n".join(conversation_lines) if conversation_lines else "No prior conversation."

        system_prompt = (
            f"You are the customer support chatbot representing the D2C brand '{brand_name}'.\n"
            f"Adopt this brand tone strictly: {tone}.\n\n"
            "Below is the full conversation thread so far. Each message is prefixed with "
            "[Customer], [Agent], or [AI] to show who said it:\n"
            f"{conversation_str}\n\n"
            f"If this is the beginning of the conversation (or if the customer is greeting you), "
            f"you MUST start your response by greeting them using the brand's custom greeting message: "
            f"'{custom_greeting}'\n\n"
            "Here is the brand's knowledge FAQ repository:\n"
            f"{faq_str}\n\n"
            "Answer the customer's latest query politely, adhering strictly to the brand tone and "
            "using the provided FAQ details. If an agent has already replied in this thread, "
            "do NOT respond — the agent is handling it."
        )

        # 1. Try AWS Bedrock
        if self.bedrock_active:
            try:
                return await self._invoke_bedrock_llama(system_prompt, customer_message, temperature=0.2)
            except Exception as e:
                print(f"[AI SERVICE ERROR] AWS Bedrock generate_reply failed: {e}. Trying Groq fallback.")

        # 2. Try Groq
        if self.client:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"[Customer] {customer_message}"}
            ]

            def _call_groq():
                completion = self.client.chat.completions.create(
                    messages=messages,
                    model="llama-3.3-70b-versatile",
                    temperature=0.2
                )
                return completion.choices[0].message.content

            try:
                return await run_sync(_call_groq)
            except Exception as e:
                print(f"[AI SERVICE ERROR] Groq generate_reply failed: {e}. Trying offline mockup.")

        # 3. Offline Heuristics Fallback
        msg_lower = customer_message.lower()
        for faq in faqs:
            if faq.get("question").lower() in msg_lower or msg_lower in faq.get("question").lower():
                return faq.get("answer")
        return f"{custom_greeting} Welcome to {brand_name} support! We are happy to assist you in a {tone} manner."

    async def detect_intent(self, message: str) -> str:
        """
        Determines user intent. Returns 'complaint', 'query', 'refund', or 'general'.
        """
        system_prompt = (
            "Analyze the following D2C support message and classify its primary intent.\n"
            "You MUST reply with exactly one of the following words: 'complaint', 'query', 'refund', or 'general'.\n"
            "Do not write any introductory text, punctuation, or explanations."
        )

        # 1. Try AWS Bedrock
        if self.bedrock_active:
            try:
                intent = await self._invoke_bedrock_llama(system_prompt, message, temperature=0.0)
                intent = intent.strip().lower().replace(".", "").replace('"', '').replace("'", "")
                if intent in ["complaint", "query", "refund", "general"]:
                    return intent
            except Exception as e:
                print(f"[AI SERVICE ERROR] AWS Bedrock detect_intent failed: {e}. Trying Groq fallback.")

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
                intent = await run_sync(_call_groq)
                intent = intent.replace(".", "").replace('"', '').replace("'", "")
                if intent in ["complaint", "query", "refund", "general"]:
                    return intent
            except Exception as e:
                print(f"[AI SERVICE ERROR] Groq detect_intent failed: {e}. Trying offline heuristics.")

        # 3. Offline Heuristics Fallback
        msg_lower = message.lower()
        if "refund" in msg_lower or "cancel" in msg_lower:
            return "refund"
        if "broken" in msg_lower or "damaged" in msg_lower or "worst" in msg_lower:
            return "complaint"
        return "query"

    async def should_escalate(self, message: str, conversation_history: Optional[List[dict]] = None) -> bool:
        """
        Checks if the ticket should be escalated to a human agent.
        """
        msg_lower = message.lower()
        keywords = ["human", "agent", "person", "representative", "operator", "speak to someone", "escalate"]
        if any(w in msg_lower for w in keywords):
            return True

        system_prompt = (
            "You are a routing assistant. Decide if the user's message indicates they wish to bypass "
            "automated support and speak with a human agent, or if the conversation is stuck.\n"
            "You MUST output exactly 'yes' or 'no'. No explanations."
        )

        # 1. Try AWS Bedrock
        if self.bedrock_active:
            try:
                formatted_history = []
                if conversation_history:
                    for msg in conversation_history[-3:]:
                        formatted_history.append({
                            "sender": msg.get("sender"),
                            "content": msg.get("content")
                        })
                result = await self._invoke_bedrock_llama(system_prompt, message, formatted_history, temperature=0.0)
                return "yes" in result.strip().lower()
            except Exception as e:
                print(f"[AI SERVICE ERROR] AWS Bedrock should_escalate failed: {e}. Trying Groq fallback.")

        # 2. Try Groq
        if self.client:
            messages = [{"role": "system", "content": system_prompt}]
            if conversation_history:
                for msg in conversation_history[-3:]:
                    role = "assistant" if msg.get("sender") == "ai" else "user"
                    messages.append({"role": role, "content": msg.get("content")})
            messages.append({"role": "user", "content": message})

            def _call_groq():
                completion = self.client.chat.completions.create(
                    messages=messages,
                    model="llama-3.3-70b-versatile",
                    temperature=0.0
                )
                return completion.choices[0].message.content.strip().lower()

            try:
                result = await run_sync(_call_groq)
                return "yes" in result
            except Exception:
                return False

        return False
