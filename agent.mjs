// Picks a provider: Claude if ANTHROPIC_API_KEY is set, otherwise free Gemini (GEMINI_API_KEY).
export async function research(input,log){
 const m=process.env.ANTHROPIC_API_KEY?await import("./agent-claude.mjs"):await import("./agent-gemini.mjs");
 return m.research(input,log);
}
