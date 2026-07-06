import { z } from "zod";

// The "react" artifact type stores a structured multi-file project, not a
// single code blob — this maps directly onto Sandpack's `files` /
// `customSetup.dependencies` props (see ArtifactPanel -> ReactArtifact).
export const ReactArtifactContentSchema = z.object({
  entry: z.string().optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  files: z
    .record(z.string(), z.string())
    .refine((files) => Object.keys(files).length > 0, {
      message: "files must contain at least one entry",
    }),
});

export type ReactArtifactContent = z.infer<typeof ReactArtifactContentSchema>;

// Packages the model is allowed to request for a react artifact's live,
// third-party-hosted Sandpack preview. Anything not on this list is a
// dependency the app hasn't vetted for that sandbox, so it's stripped
// rather than resolved from npm sight-unseen.
export const ALLOWED_REACT_DEPENDENCIES: Record<string, string> = {
  "lucide-react": "latest",
  recharts: "latest",
  lodash: "latest",
  d3: "latest",
  mathjs: "latest",
  "plotly.js": "latest",
  "react-plotly.js": "latest",
  three: "latest",
  papaparse: "latest",
  xlsx: "latest",
  "chart.js": "latest",
  "react-chartjs-2": "latest",
  tone: "latest",
  mammoth: "latest",
  "@tensorflow/tfjs": "latest",
};

export function sanitizeReactDependencies(
  requested: Record<string, string> | undefined
): Record<string, string> {
  if (!requested) return {};
  const sanitized: Record<string, string> = {};
  for (const name of Object.keys(requested)) {
    if (Object.prototype.hasOwnProperty.call(ALLOWED_REACT_DEPENDENCIES, name)) {
      sanitized[name] = ALLOWED_REACT_DEPENDENCIES[name];
    }
  }
  return sanitized;
}

export type ParsedReactArtifact =
  | { ok: true; content: ReactArtifactContent }
  | { ok: false; error: string };

export function parseReactArtifactContent(raw: string): ParsedReactArtifact {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Content is not valid JSON." };
  }

  const result = ReactArtifactContentSchema.safeParse(json);
  if (!result.success) {
    return { ok: false, error: result.error.issues.map((i) => i.message).join("; ") };
  }

  return {
    ok: true,
    content: {
      ...result.data,
      dependencies: sanitizeReactDependencies(result.data.dependencies),
    },
  };
}
