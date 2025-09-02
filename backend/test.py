import os
from cerebras.cloud.sdk import Cerebras

# Initialize the Cerebras client
client = Cerebras(api_key=("csk-ymtphj83pp5p9x42cwycj8rrxv9dw2d664fdjxmvv2p88n4r"))

# Make a chat completion request
chat_completion = client.chat.completions.create(
    messages=[
        {
            "role": "user",
            "content": "Why is fast inference important?",
        }
    ],
    model="llama3.3-70b",  # Available models: llama3.1-8b, llama3.1-70b
)

# Print the response
print(chat_completion.choices[0].message.content)