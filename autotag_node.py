import server

class AutoTagNode:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "text": ("STRING", {"multiline": True}),
                "max_tags": ("INT", {"default": 10, "min": 1, "max": 100}),
                "selected_files": ("STRING", {"default": ""}), # Hidden/Managed by JS
            },
            "optional": {
                "input_text": ("STRING", {"forceInput": True}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }

    RETURN_TYPES = ("STRING",)
    FUNCTION = "process"
    CATEGORY = "CustomNodes"

    def process(self, text, max_tags, selected_files, unique_id, input_text=""):
        if input_text:
            # Combine external input with manual text, avoiding duplicates
            existing_tags = [t.strip() for t in text.split(",") if t.strip()]
            new_tags = [t.strip() for t in input_text.split(",") if t.strip()]
            for tag in new_tags:
                if tag not in existing_tags:
                    existing_tags.append(tag)
            text = ", ".join(existing_tags)
            
            # Sync back to UI
            server.PromptServer.instance.send_sync("autotag.update_tags", {"node_id": unique_id, "tags": text})
            
        return (text,)
