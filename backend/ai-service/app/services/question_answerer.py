"""
Answer natural language questions about dataset context.
"""

from typing import Dict, Any
from app.utils.ai_client import AIClient

def answer_question(question: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ask the configured LLM to answer questions about dataset context.
    """
    client = AIClient()

    prompt = (
        "You are a data assistant. "
        "Given the following dataset analysis, answer the question clearly and concisely.\n\n"
        f"DATA CONTEXT:\n{context}\n\nQUESTION: {question}\n\nANSWER:"
    )

    try:
        text = client.query(prompt, max_tokens=300, temperature=0.0)
        return {"answer": text, "source": client.provider}
    except Exception as e:
        return {"answer": f"Could not generate answer. Error: {str(e)}", "source": "error"}
