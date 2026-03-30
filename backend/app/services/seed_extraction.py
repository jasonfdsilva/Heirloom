"""Seed packet data extraction using Claude vision API.
Supports JPEG, PNG, WebP images and PDF (first page converted via raw bytes).
Returns a SeedPacketExtraction schema for human review before saving.
"""
import base64
import json

import anthropic

from app.core.config import settings
from app.schemas.variety import SeedPacketExtraction

EXTRACTION_PROMPT = """You are extracting data from a seed packet label.
Return ONLY a JSON object with these fields (use null for any field not found):

{
  "vendor": "company name",
  "product_category": "e.g. Hybrid Bell Peppers, Heirloom Tomatoes",
  "common_name": "variety name e.g. ACE F1",
  "latin_name": "scientific name e.g. Capsicum annuum",
  "sku": "item/SKU number e.g. 574.11",
  "lot_number": "lot number e.g. 110020",
  "min_seed_count": integer or null,
  "seeds_per_pound": integer or null,
  "days_to_maturity": "string e.g. 75 or 50 green/70 red",
  "germination_rate_pct": integer or null,
  "germination_test_date": "MM/YY string as printed",
  "certifications": ["list", "of", "certifications"],
  "plant_variety_protected": true or false,
  "special_notes": "any important notes e.g. film coated seeds"
}

Return only valid JSON, no markdown, no explanation."""


async def extract_from_packet(content: bytes, content_type: str) -> SeedPacketExtraction:
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    if content_type == "application/pdf":
        # Send PDF directly using Claude's document support
        message = await client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": base64.standard_b64encode(content).decode(),
                            },
                        },
                        {"type": "text", "text": EXTRACTION_PROMPT},
                    ],
                }
            ],
        )
    else:
        # Image upload
        media_type = content_type if content_type in (
            "image/jpeg", "image/png", "image/gif", "image/webp"
        ) else "image/jpeg"
        message = await client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": base64.standard_b64encode(content).decode(),
                            },
                        },
                        {"type": "text", "text": EXTRACTION_PROMPT},
                    ],
                }
            ],
        )

    raw = message.content[0].text.strip()
    data = json.loads(raw)
    return SeedPacketExtraction(**data)
