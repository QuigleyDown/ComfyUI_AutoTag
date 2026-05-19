import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const STYLE = `
    .autotag-root {
        position: relative;
        width: 100%;
        height: 100%;
        background: #111;
        border: 1px solid #444;
        border-radius: 4px;
        color: #eee;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        overflow: hidden;
        pointer-events: auto;
    }
    .autotag-controls {
        display: flex;
        padding: 4px 6px;
        background: #1a1a1a;
        border-bottom: 1px solid #333;
        gap: 6px;
        align-items: center;
    }
    .autotag-btn {
        background: #333;
        border: 1px solid #555;
        color: #eee;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 11px;
        cursor: pointer;
    }
    .autotag-btn:hover {
        background: #444;
    }
    .autotag-container {
        flex: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding: 6px;
        overflow-y: auto;
        cursor: text;
        align-content: flex-start;
    }
    .autotag-pill {
        display: inline-flex;
        align-items: center;
        background: #333;
        color: #eee;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        user-select: none;
        white-space: nowrap;
        border: 1px solid #555;
        cursor: grab;
    }
    .autotag-pill:active {
        cursor: grabbing;
    }
    .autotag-pill:hover {
        background: #444;
    }
    .autotag-pill.dragging {
        opacity: 0.5;
        background: #555;
    }
    .autotag-pill.drag-over {
        border: 1px solid #fff;
    }
    .autotag-pill .remove-btn {
        margin-left: 6px;
        cursor: pointer;
        font-weight: bold;
        color: #f44;
        font-size: 14px;
        line-height: 1;
    }
    .autotag-input {
        flex: 1;
        min-width: 80px;
        border: none;
        background: transparent;
        color: #eee;
        outline: none;
        font-size: 12px;
        padding: 2px;
        resize: none;
        font-family: inherit;
        overflow: hidden;
        min-height: 20px;
    }
    .autotag-autocomplete {
        position: fixed;
        background: #222;
        border: 1px solid #555;
        border-radius: 4px;
        z-index: 10000;
        max-height: 150px;
        overflow-y: auto;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
        box-sizing: border-box;
        display: none;
    }
    .autotag-file-menu {
        position: fixed;
        background: #222;
        border: 1px solid #555;
        border-radius: 4px;
        z-index: 10001;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
        min-width: 150px;
    }
    .autotag-file-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 12px;
    }
    .autotag-file-item:hover {
        background: #333;
    }
    .autotag-autocomplete-item {
        padding: 8px 12px;
        cursor: pointer;
        font-size: 12px;
        color: #ddd;
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid #333;
    }
    .autotag-autocomplete-item:last-child {
        border-bottom: none;
    }
    .autotag-autocomplete-item.highlighted {
        background: #444;
        color: #fff;
    }
    .autotag-autocomplete-item:hover {
        background: #383838;
    }
    .autotag-autocomplete-item .weight {
        opacity: 0.5;
        font-size: 10px;
        margin-left: 10px;
    }
    .autotag-pill-edit {
        background: transparent;
        border: none;
        color: inherit;
        font-size: inherit;
        font-family: inherit;
        outline: none;
        padding: 0;
        margin: 0;
        width: auto;
        min-width: 20px;
    }
`;

function addStyles() {
    if (document.getElementById("autotag-styles")) return;
    const style = document.createElement("style");
    style.id = "autotag-styles";
    style.innerHTML = STYLE;
    document.head.appendChild(style);
}

app.registerExtension({
    name: "ComfyUI.AutoTag",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "AutoTagNode") {
            addStyles();

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                const widget = this.widgets.find(w => w.name === "text");
                const filesWidget = this.widgets.find(w => w.name === "selected_files");
                if (filesWidget) filesWidget.type = "hidden";

                if (widget && widget.inputEl) {
                    let tagsData = [];
                    let availableFiles = [];

                    const fetchFiles = async () => {
                        try {
                            const response = await api.fetchApi("/autotag/files");
                            availableFiles = await response.json();
                        } catch (e) { console.error("AutoTag: Error fetching files", e); }
                    };
                    fetchFiles();

                    const fetchTags = async () => {
                        try {
                            const query = filesWidget && filesWidget.value ? `?files=${filesWidget.value}` : "";
                            const response = await api.fetchApi(`/autotag/tags${query}`);
                            tagsData = await response.json();
                        } catch (e) { console.error("AutoTag: Error fetching tags", e); }
                    };
                    fetchTags();

                    const root = document.createElement("div");
                    root.className = "autotag-root";

                    const controls = document.createElement("div");
                    controls.className = "autotag-controls";
                    
                    const randomAllBtn = document.createElement("button");
                    randomAllBtn.className = "autotag-btn";
                    randomAllBtn.textContent = "Random All";

                    const addRandomBtn = document.createElement("button");
                    addRandomBtn.className = "autotag-btn";
                    addRandomBtn.textContent = "Add Random";

                    const filesBtn = document.createElement("button");
                    filesBtn.className = "autotag-btn";
                    filesBtn.textContent = "Files ▾";

                    const clearBtn = document.createElement("button");
                    clearBtn.className = "autotag-btn";
                    clearBtn.textContent = "Clear";
                    
                    controls.appendChild(randomAllBtn);
                    controls.appendChild(addRandomBtn);
                    controls.appendChild(filesBtn);
                    controls.appendChild(clearBtn);
                    root.appendChild(controls);
                    
                    const container = document.createElement("div");
                    container.className = "autotag-container";
                    
                    const input = document.createElement("textarea");
                    input.className = "autotag-input";
                    input.placeholder = "Add tags...";
                    input.rows = 1;

                    const autocomplete = document.createElement("div");
                    autocomplete.className = "autotag-autocomplete";

                    container.appendChild(input);
                    root.appendChild(container);
                    document.body.appendChild(autocomplete);

                    let draggedTagIndex = -1;

                    const updatePills = () => {
                        const currentTags = widget.value.split(",").map(t => t.trim()).filter(t => t !== "");
                        container.querySelectorAll(".autotag-pill").forEach(p => p.remove());

                        currentTags.forEach((tag, index) => {
                            const pill = document.createElement("span");
                            pill.className = "autotag-pill";
                            pill.textContent = tag;
                            pill.draggable = true;

                            pill.ondragstart = (e) => {
                                draggedTagIndex = index;
                                pill.classList.add("dragging");
                                e.dataTransfer.effectAllowed = "move";
                            };

                            pill.ondragover = (e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                pill.classList.add("drag-over");
                            };

                            pill.ondragleave = () => {
                                pill.classList.remove("drag-over");
                            };

                            pill.ondrop = (e) => {
                                e.preventDefault();
                                pill.classList.remove("drag-over");
                                if (draggedTagIndex !== -1 && draggedTagIndex !== index) {
                                    const newTags = [...currentTags];
                                    const [movedTag] = newTags.splice(draggedTagIndex, 1);
                                    newTags.splice(index, 0, movedTag);
                                    widget.value = newTags.join(", ");
                                    updatePills();
                                    app.graph.setDirtyCanvas(true);
                                }
                            };

                            pill.ondragend = () => {
                                pill.classList.remove("dragging");
                                draggedTagIndex = -1;
                            };

                            pill.ondblclick = (e) => {
                                e.stopPropagation();
                                const editInput = document.createElement("input");
                                editInput.type = "text";
                                editInput.value = tag;
                                editInput.className = "autotag-pill-edit";
                                pill.textContent = "";
                                pill.draggable = false;
                                pill.appendChild(editInput);
                                editInput.focus();
                                editInput.select();

                                const save = () => {
                                    const newVal = editInput.value.trim();
                                    if (newVal && newVal !== tag) {
                                        const newTags = [...currentTags];
                                        newTags[index] = newVal;
                                        widget.value = newTags.join(", ");
                                        app.graph.setDirtyCanvas(true);
                                    }
                                    updatePills();
                                };

                                const originalEditOnKeyDown = editInput.onkeydown;
                                editInput.onkeydown = (e) => {
                                    if (e.key === "Enter") {
                                        const handled = originalEditOnKeyDown ? originalEditOnKeyDown.apply(editInput, [e]) : false;
                                        if (!handled) save();
                                    } else if (e.key === "Escape") {
                                        e.stopPropagation();
                                        editInput.onblur = null;
                                        updatePills();
                                    } else {
                                        if (originalEditOnKeyDown) originalEditOnKeyDown.apply(editInput, [e]);
                                    }
                                };
                                editInput.onblur = save;

                                setupAutocomplete(editInput, (newVal) => {
                                    if (newVal && newVal !== tag) {
                                        const newTags = [...currentTags];
                                        newTags[index] = newVal;
                                        widget.value = newTags.join(", ");
                                        app.graph.setDirtyCanvas(true);
                                    }
                                    updatePills();
                                });
                            };

                            const removeBtn = document.createElement("span");
                            removeBtn.className = "remove-btn";
                            removeBtn.innerHTML = "&times;";
                            removeBtn.onclick = (e) => {
                                e.stopPropagation();
                                const newTags = currentTags.filter(t => t !== tag);
                                widget.value = newTags.join(", ");
                                updatePills();
                                input.focus();
                                app.graph.setDirtyCanvas(true);
                            };
                            pill.appendChild(removeBtn);
                            container.insertBefore(pill, input);
                        });
                        input.style.height = "auto";
                        input.style.height = Math.max(20, input.scrollHeight) + "px";
                    };

                    const addTag = (tag) => {
                        tag = tag.trim().replace(/^,|,$/g, "");
                        if (!tag) return;
                        const currentTags = widget.value.split(",").map(t => t.trim()).filter(t => t !== "");
                        if (!currentTags.includes(tag)) {
                            currentTags.push(tag);
                            widget.value = currentTags.join(", ");
                        }
                        input.value = "";
                        input.style.height = "20px";
                        autocomplete.style.display = "none";
                        updatePills();
                        app.graph.setDirtyCanvas(true);
                    };

                    randomAllBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (tagsData.length === 0) return;
                        const maxTagsWidget = this.widgets.find(w => w.name === "max_tags");
                        const count = maxTagsWidget ? maxTagsWidget.value : 10;
                        const shuffled = [...tagsData].sort(() => 0.5 - Math.random());
                        const selected = shuffled.slice(0, Math.min(count, shuffled.length)).map(t => t.tag);
                        widget.value = selected.join(", ");
                        updatePills();
                        app.graph.setDirtyCanvas(true);
                    };

                    addRandomBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (tagsData.length === 0) return;
                        const maxTagsWidget = this.widgets.find(w => w.name === "max_tags");
                        const count = maxTagsWidget ? maxTagsWidget.value : 10;
                        const currentTags = widget.value.split(",").map(t => t.trim()).filter(t => t !== "");
                        const available = tagsData.filter(t => !currentTags.includes(t.tag));
                        if (available.length === 0) return;
                        const shuffled = [...available].sort(() => 0.5 - Math.random());
                        const selected = shuffled.slice(0, Math.min(count, shuffled.length)).map(t => t.tag);
                        widget.value = [...currentTags, ...selected].join(", ");
                        updatePills();
                        app.graph.setDirtyCanvas(true);
                    };

                    clearBtn.onclick = (e) => {
                        e.stopPropagation();
                        widget.value = "";
                        updatePills();
                        app.graph.setDirtyCanvas(true);
                    };

                    filesBtn.onclick = (e) => {
                        e.stopPropagation();
                        const existingMenu = document.querySelector(".autotag-file-menu");
                        if (existingMenu) { existingMenu.remove(); return; }

                        const menu = document.createElement("div");
                        menu.className = "autotag-file-menu";
                        const rect = filesBtn.getBoundingClientRect();
                        menu.style.left = rect.left + "px";
                        menu.style.top = rect.bottom + "px";

                        const selectedFiles = filesWidget.value ? filesWidget.value.split(",") : [];

                        availableFiles.forEach(file => {
                            const item = document.createElement("div");
                            item.className = "autotag-file-item";
                            const isSelected = selectedFiles.includes(file);
                            item.innerHTML = `<input type="checkbox" ${isSelected ? 'checked' : ''}> <span>${file}</span>`;
                            item.onclick = (e) => {
                                e.stopPropagation();
                                const checkbox = item.querySelector("input");
                                checkbox.checked = !checkbox.checked;
                                updateSelectedFiles();
                            };
                            item.querySelector("input").onclick = (e) => {
                                e.stopPropagation();
                                updateSelectedFiles();
                            };

                            const updateSelectedFiles = () => {
                                const checkboxes = menu.querySelectorAll("input:checked");
                                const selected = Array.from(checkboxes).map(cb => cb.nextElementSibling.textContent);
                                filesWidget.value = selected.join(",");
                                fetchTags();
                            };
                            menu.appendChild(item);
                        });

                        document.body.appendChild(menu);
                        const closeMenu = (e) => {
                            if (!menu.contains(e.target) && e.target !== filesBtn) {
                                menu.remove();
                                document.removeEventListener("mousedown", closeMenu);
                            }
                        };
                        document.addEventListener("mousedown", closeMenu);
                    };

                    Object.defineProperty(root, 'value', {
                        get() { return widget.value; },
                        set(v) { 
                            if (widget.value !== v) {
                                widget.value = v; 
                                updatePills(); 
                            }
                        }
                    });

                    widget.inputEl.replaceWith(root);
                    widget.inputEl = root;

                    let filteredTags = [];
                    let highlightedIndex = -1;

                    const setupAutocomplete = (targetInput, onSelect) => {
                        targetInput.oninput = () => {
                            if (targetInput.tagName === "TEXTAREA") {
                                targetInput.style.height = "auto";
                                targetInput.style.height = Math.max(20, targetInput.scrollHeight) + "px";
                            }
                            const query = targetInput.value.toLowerCase().trim();
                            if (!query) { autocomplete.style.display = "none"; return; }
                            
                            const regexQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[ _]');
                            const regex = new RegExp(regexQuery, "i");
                            filteredTags = tagsData.filter(t => regex.test(t.tag)).slice(0, 20);
                            
                            if (filteredTags.length === 0) { autocomplete.style.display = "none"; return; }

                            autocomplete.innerHTML = "";
                            highlightedIndex = 0;
                            filteredTags.forEach((t, i) => {
                                const item = document.createElement("div");
                                item.className = "autotag-autocomplete-item";
                                if (i === highlightedIndex) item.classList.add("highlighted");
                                item.innerHTML = `<span>${t.tag}</span><span class="weight">${t.weight}</span>`;
                                item.onclick = (e) => {
                                    e.stopPropagation();
                                    onSelect(t.tag);
                                    targetInput.focus();
                                };
                                autocomplete.appendChild(item);
                            });

                            const rect = targetInput.getBoundingClientRect();
                            autocomplete.style.left = rect.left + "px";
                            autocomplete.style.top = rect.bottom + "px";
                            autocomplete.style.width = Math.max(200, rect.width) + "px";
                            autocomplete.style.display = "block";
                        };

                        const originalOnKeyDown = targetInput.onkeydown;
                        targetInput.onkeydown = (e) => {
                            if (e.key === "Enter") {
                                if (autocomplete.style.display !== "none" && highlightedIndex >= 0) {
                                    e.preventDefault();
                                    onSelect(filteredTags[highlightedIndex].tag);
                                    return true;
                                }
                            } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                                if (autocomplete.style.display !== "none") {
                                    e.preventDefault();
                                    const delta = e.key === "ArrowDown" ? 1 : -1;
                                    highlightedIndex = (highlightedIndex + delta + filteredTags.length) % filteredTags.length;
                                    autocomplete.querySelectorAll(".autotag-autocomplete-item").forEach((item, i) => {
                                        item.classList.toggle("highlighted", i === highlightedIndex);
                                        if (i === highlightedIndex) item.scrollIntoView({ block: "nearest" });
                                    });
                                    return true;
                                }
                            } else if (e.key === "Escape") {
                                if (autocomplete.style.display !== "none") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    autocomplete.style.display = "none";
                                    return true;
                                }
                            }
                            if (originalOnKeyDown) return originalOnKeyDown.apply(targetInput, [e]);
                            return false;
                        };

                        const originalBlur = targetInput.onblur;
                        targetInput.onblur = (e) => {
                            setTimeout(() => { 
                                autocomplete.style.display = "none";
                                if (originalBlur) originalBlur.apply(targetInput, [e]);
                            }, 150);
                        };
                    };

                    setupAutocomplete(input, (tag) => { addTag(tag); });

                    input.addEventListener("keydown", (e) => {
                        if (e.key === ",") {
                            e.preventDefault();
                            addTag(input.value);
                        } else if (e.key === "Backspace" && input.value === "") {
                            const currentTags = widget.value.split(",").map(t => t.trim()).filter(t => t !== "");
                            if (currentTags.length > 0) {
                                currentTags.pop();
                                widget.value = currentTags.join(", ");
                                updatePills();
                                app.graph.setDirtyCanvas(true);
                            }
                        }
                    });

                    const originalInputOnKeyDown = input.onkeydown;
                    input.onkeydown = (e) => {
                        if (e.key === "Enter") {
                            const handled = originalInputOnKeyDown ? originalInputOnKeyDown.apply(input, [e]) : false;
                            if (!handled) {
                                e.preventDefault();
                                addTag(input.value);
                            }
                        } else {
                            if (originalInputOnKeyDown) originalInputOnKeyDown.apply(input, [e]);
                        }
                    };

                    container.onclick = () => { input.focus(); };
                    setTimeout(updatePills, 0);

                    const onRemoved = this.onRemoved;
                    this.onRemoved = function() {
                        if (onRemoved) onRemoved.apply(this, arguments);
                        root.remove();
                        autocomplete.remove();
                        const menu = document.querySelector(".autotag-file-menu");
                        if (menu) menu.remove();
                    };
                }
                return r;
            };
        }
    }
});
