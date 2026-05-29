import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

type AiSuggestionState = {
  pos: number;
  text: string;
} | null;

type AiSuggestionMeta =
  | { type: "set"; pos: number; text: string }
  | { type: "clear" };

export const aiSuggestionPluginKey = new PluginKey<AiSuggestionState>(
  "aiSuggestion",
);

export const AiSuggestionExtension = Extension.create({
  name: "aiSuggestion",

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const suggestion = aiSuggestionPluginKey.getState(this.editor.state);
        if (!suggestion?.text) return false;

        return this.editor.commands.command(({ tr, dispatch }) => {
          tr.insertText(suggestion.text, suggestion.pos);
          tr.setMeta(aiSuggestionPluginKey, { type: "clear" });
          dispatch?.(tr);
          return true;
        });
      },
      Escape: () => {
        const suggestion = aiSuggestionPluginKey.getState(this.editor.state);
        if (!suggestion) return false;

        clearAiSuggestion(this.editor);
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const plugin = new Plugin<AiSuggestionState>({
      key: aiSuggestionPluginKey,
      state: {
        init: () => null,
        apply: (tr, value) => {
          const meta = tr.getMeta(aiSuggestionPluginKey) as
            | AiSuggestionMeta
            | undefined;
          if (meta?.type === "set") {
            return meta.text ? { pos: meta.pos, text: meta.text } : null;
          }
          if (meta?.type === "clear") return null;
          if (tr.docChanged || tr.selectionSet) return null;
          return value;
        },
      },
      props: {
        decorations(state) {
          const suggestion = aiSuggestionPluginKey.getState(state);
          if (!suggestion?.text) return DecorationSet.empty;

          const widget = Decoration.widget(
            suggestion.pos,
            () => {
              const span = document.createElement("span");
              span.className = "tiptap-ai-suggestion";
              span.textContent = suggestion.text;
              span.setAttribute("aria-hidden", "true");
              return span;
            },
            { side: 1 },
          );

          return DecorationSet.create(state.doc, [widget]);
        },
      },
    });

    return [plugin];
  },
});

export function setAiSuggestion(
  editor: Editor,
  suggestion: { pos: number; text: string },
) {
  editor.view.dispatch(
    editor.state.tr.setMeta(aiSuggestionPluginKey, {
      type: "set",
      pos: suggestion.pos,
      text: suggestion.text,
    } satisfies AiSuggestionMeta),
  );
}

export function clearAiSuggestion(editor: Editor) {
  editor.view.dispatch(
    editor.state.tr.setMeta(aiSuggestionPluginKey, {
      type: "clear",
    } satisfies AiSuggestionMeta),
  );
}
