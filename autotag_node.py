class AutoTagNode:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "text": ("STRING", {"multiline": True}),
                "max_tags": ("INT", {"default": 10, "min": 1, "max": 100}),
                "selected_files": ("STRING", {"default": ""}), # Hidden/Managed by JS
            },
        }

    RETURN_TYPES = ("STRING",)
    FUNCTION = "process"
    CATEGORY = "CustomNodes"

    def process(self, text, max_tags, selected_files):
        return (text,)
