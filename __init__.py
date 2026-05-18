import os
import folder_paths
from .autotag_node import AutoTagNode
from server import PromptServer
from aiohttp import web

NODE_CLASS_MAPPINGS = {
    "AutoTagNode": AutoTagNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "AutoTagNode": "Auto Tag Node"
}

WEB_DIRECTORY = "./js"

# Route to list available tag files
@PromptServer.instance.routes.get("/autotag/files")
async def list_tag_files(request):
    tags_dir = os.path.join(os.path.dirname(__file__), "tags")
    files = []
    if os.path.exists(tags_dir):
        files = [f for f in os.listdir(tags_dir) if f.endswith(".txt")]
    return web.json_response(files)

# Route to serve tags with optional filtering
@PromptServer.instance.routes.get("/autotag/tags")
async def get_tags(request):
    selected_files = request.query.get("files", "").split(",")
    tags_dir = os.path.join(os.path.dirname(__file__), "tags")
    all_tags = []
    if os.path.exists(tags_dir):
        for filename in os.listdir(tags_dir):
            if filename.endswith(".txt"):
                if selected_files and selected_files[0] and filename not in selected_files:
                    continue
                with open(os.path.join(tags_dir, filename), "r", encoding="utf-8") as f:
                    for line in f:
                        parts = line.strip().split(",")
                        if len(parts) == 2:
                            tag = parts[0].strip()
                            try:
                                weight = int(parts[1].strip())
                                all_tags.append({"tag": tag, "weight": weight})
                            except ValueError:
                                pass
    
    all_tags.sort(key=lambda x: x["weight"], reverse=True)
    return web.json_response(all_tags)

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
