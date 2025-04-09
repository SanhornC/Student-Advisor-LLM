from llama_index.llms.openai import OpenAI

response = OpenAI().complete("William Shakespeare is ")
print(response)