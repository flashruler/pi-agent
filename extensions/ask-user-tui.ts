import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";

const optionSchema = Type.Object({
  label: Type.String({ description: "Short label shown in the picker" }),
  value: Type.Optional(Type.String({ description: "Machine-readable value; defaults to label" })),
  description: Type.Optional(Type.String({ description: "Additional context shown next to the option" })),
});

const questionSchema = Type.Object({
  id: Type.String({ description: "Stable identifier for this question, e.g. 'scope'" }),
  prompt: Type.String({ description: "Question text to show the user" }),
  options: Type.Array(optionSchema, {
    description: "Suggested answers. Provide concrete choices whenever possible.",
    minItems: 1,
  }),
  allowOther: Type.Optional(Type.Boolean({ description: "Whether to include a Type something option" })),
});

const askUserTuiSchema = Type.Object({
  title: Type.Optional(Type.String({ description: "Dialog title" })),
  questions: Type.Array(questionSchema, {
    description: "One or more questions to ask the user in the terminal UI",
    minItems: 1,
  }),
});

type AskUserTuiParams = Static<typeof askUserTuiSchema>;

type Answer = {
  id: string;
  prompt: string;
  answer: string;
  label: string;
};

export default function questionTuiExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "ask_user_tui",
    label: "Ask User (TUI)",
    description:
      "Ask the user one or more clarification questions using Pi's terminal UI instead of requiring chat replies.",
    promptSnippet: "Ask the user clarification questions in an interactive terminal UI.",
    promptGuidelines: [
      "Use ask_user_tui instead of asking clarification questions in assistant text when the user needs to choose between options or answer several setup questions.",
      "When using ask_user_tui, ask all related clarification questions in one call where possible, provide concise option labels, and include an 'Other' option only when useful.",
      "After ask_user_tui returns, continue using the returned answers without asking the same questions again in chat.",
    ],
    parameters: askUserTuiSchema,
    async execute(_toolCallId, params: AskUserTuiParams, signal, _onUpdate, ctx) {
      if (!ctx.hasUI) {
        const fallback = params.questions
          .map((q, i) => `${i + 1}. ${q.prompt}\n${q.options.map((o) => `   - ${o.label}`).join("\n")}`)
          .join("\n\n");
        return {
          content: [
            {
              type: "text",
              text: `No interactive UI is available. Ask the user in chat:\n\n${fallback}`,
            },
          ],
          details: { answers: [], uiAvailable: false },
        };
      }

      const answers: Answer[] = [];
      const title = params.title ?? "Clarifying questions";

      for (let i = 0; i < params.questions.length; i++) {
        if (signal?.aborted) throw new Error("Question dialog cancelled");

        const question = params.questions[i];
        const choices = question.options.map((option) => {
          const value = option.value ?? option.label;
          return option.description ? `${option.label} — ${option.description}` : option.label;
        });
        const labelsToValues = new Map(
          question.options.map((option) => [
            option.description ? `${option.label} — ${option.description}` : option.label,
            { value: option.value ?? option.label, label: option.label },
          ]),
        );

        const otherLabel = "Type something else…";
        if (question.allowOther !== false) choices.push(otherLabel);

        const selected = await ctx.ui.select(
          `${title} (${i + 1}/${params.questions.length})\n\n${question.prompt}`,
          choices,
          { signal },
        );

        if (!selected) {
          throw new Error(`User cancelled question: ${question.id}`);
        }

        if (selected === otherLabel) {
          const typed = await ctx.ui.input(question.prompt, "Type your answer", { signal });
          if (!typed) throw new Error(`User cancelled question: ${question.id}`);
          answers.push({ id: question.id, prompt: question.prompt, answer: typed, label: typed });
        } else {
          const mapped = labelsToValues.get(selected);
          if (!mapped) throw new Error(`Unknown selection for question: ${question.id}`);
          answers.push({ id: question.id, prompt: question.prompt, answer: mapped.value, label: mapped.label });
        }
      }

      const summary = answers.map((a) => `- ${a.id}: ${a.label}`).join("\n");
      return {
        content: [{ type: "text", text: `User answered via TUI:\n${summary}` }],
        details: { answers, uiAvailable: true },
      };
    },
  });

  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt:
        event.systemPrompt +
        "\n\nQuestion UI preference: If you need clarification from the user, prefer the ask_user_tui tool over asking questions in normal assistant chat. Batch related questions into one ask_user_tui call when practical.",
    };
  });
}
