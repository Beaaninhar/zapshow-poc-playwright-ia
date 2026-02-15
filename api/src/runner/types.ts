export type Step =
  | { type: "goto"; url: string }
  | { type: "fill"; selector: string; value: string }
  | { type: "click"; selector: string }
  | { type: "expectText"; selector: string; text: string };

export type TestDefinition = {
  name: string;
  steps: Step[];
};

export type RunRequest = {
  baseURL: string;
  test: TestDefinition;
  artifacts?: {
    screenshot?: "off" | "only-on-failure";
  };
};
