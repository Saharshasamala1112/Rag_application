"""Names that look unused to vulture but are wired up at runtime.

Pydantic model fields, TypedDict keys and pydantic config are only read through
reflection (env parsing, JSON serialization, contract checks), so vulture cannot
see the references. Regenerate with:

    uv run vulture app --min-confidence 60 \\
        --ignore-decorators "@router.get,@router.post,@router.patch,@router.delete,@router.put,@app.get,@app.post,@app.exception_handler,@app.on_event,@field_validator,@model_validator,@app.middleware" \\
        --make-whitelist

This module is only read by vulture; it is never imported (issue #48).
"""
model_config  # unused variable (app/config/settings.py:18)
host  # unused variable (app/config/settings.py:21)
port  # unused variable (app/config/settings.py:22)
embedding_dim  # unused variable (app/config/settings.py:37)
created_at  # unused variable (app/models/collection.py:25)
updated_at  # unused variable (app/models/collection.py:26)
total  # unused variable (app/models/collection.py:31)
created_at  # unused variable (app/models/conversation.py:12)
created_at  # unused variable (app/models/conversation.py:19)
updated_at  # unused variable (app/models/conversation.py:20)
message_count  # unused variable (app/models/conversation.py:21)
created_at  # unused variable (app/models/conversation.py:28)
updated_at  # unused variable (app/models/conversation.py:29)
total  # unused variable (app/models/conversation.py:44)
chunk_id  # unused variable (app/models/document.py:11)
page_number  # unused variable (app/models/document.py:16)
chunk_id  # unused variable (app/models/response.py:13)
page_number  # unused variable (app/models/response.py:17)
version  # unused variable (app/models/response.py:35)
ollama_available  # unused variable (app/models/response.py:38)
version  # unused variable (app/models/response.py:52)
docs  # unused variable (app/models/response.py:53)
extension  # unused variable (app/models/response.py:57)
total  # unused variable (app/models/response.py:63)
file_type  # unused variable (app/models/response.py:71)
chunk_count  # unused variable (app/models/response.py:72)
total_chars  # unused variable (app/models/response.py:73)
uploaded_at  # unused variable (app/models/response.py:75)
total  # unused variable (app/models/response.py:84)
chunk_count  # unused variable (app/models/response.py:93)
chunk_count  # unused variable (app/models/response.py:101)
total  # unused variable (app/models/response.py:125)
_.format  # unused method (app/observability.py:18)
reset_instance  # unused method (app/rag/embeddings.py:80)
stage  # unused variable (app/query_stream_contract.py:12)
