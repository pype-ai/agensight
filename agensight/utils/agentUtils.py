from string import Formatter
import os
import json

def add_new_prompt(agent_name, new_prompt_text, prompt_file_path):
    # Load existing promptData
    if os.path.exists(prompt_file_path):
        with open(prompt_file_path) as f:
            promptData = json.load(f)
    else:
        promptData = {"agent": agent_name, "prompts": []}
    prompts = promptData.get("prompts", [])

    # Set all existing prompts to current: false
    for p in prompts:
        p["current"] = False

    # Extract variables from the new prompt
    formatter = Formatter()
    variables = [
        field_name
        for _, field_name, _, _ in formatter.parse(new_prompt_text)
        if field_name
    ]

    # Add the new prompt as current
    prompts.append({
        "prompt": new_prompt_text,
        "variables": variables,
        "current": True
    })
    promptData["prompts"] = prompts

    # Save back to file
    with open(prompt_file_path, "w") as f:
        json.dump(promptData, f, indent=2)