import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { AuthUser, RunResult, Step, runTest, saveTestVersion } from "../services/apiClient";
import {
  ArtifactSettings,
  LocalStep,
  LocalTest,
  SelectorType,
  ValueSource,
  addRunReport,
  buildRunRequest,
  buildTestDefinition,
  getLocalTest,
  type RunReport,
  type TestRunReportEntry,
  updateRunReport,
  upsertLocalTest,
} from "../services/localTests";
import { formatErrorMessage } from "../services/errorUtils";
import { getFileName, toFileUrl } from "../services/fileUtils";

type CreateTestPageProps = {
  currentUser: AuthUser;
};

type VariableItem = {
  id: string;
  name: string;
  value: string;
  locked?: boolean;
};

const DEFAULT_BASE_URL = "http://localhost:5173";
const BASE_VAR_NAME = "baseUrl";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function buildReportEntry(
  test: LocalTest,
  result: RunResult,
): TestRunReportEntry {
  const errorMessage =
    result.status === "failed"
      ? formatErrorMessage(result.error?.message ?? result.error)
      : undefined;

  return {
    testId: test.id,
    testIdentifier: test.identifier,
    testName: test.name,
    status: result.status,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    durationMs: result.durationMs,
    stepsTotal: result.summary.stepsTotal,
    stepsCompleted: result.summary.stepsCompleted,
    stepResults: result.stepResults,
    errorMessage,
    failedStepIndex: result.failedStepIndex,
    failedStep: result.failedStep,
    artifacts: result.artifacts,
    logs: result.logs,
  };
}

function buildQueuedEntry(test: LocalTest, startedAt: string): TestRunReportEntry {
  return {
    testId: test.id,
    testIdentifier: test.identifier,
    testName: test.name,
    status: "queued",
    startedAt,
    finishedAt: startedAt,
    durationMs: 0,
    stepsTotal: test.steps.length,
    stepsCompleted: 0,
  };
}

function summarizeFailedStep(step: Step | undefined): string | null {
  if (!step) return null;
  switch (step.type) {
    case "goto":
      return `goto ${step.url}`;
    case "fill":
      return `fill ${step.selector} -> ${step.value}`;
    case "click":
      return `click ${step.selector}`;
    case "expectText":
      return `expect ${step.selector} text ${step.text}`;
    case "expectVisible":
      return `expect visible ${step.selector}`;
    case "waitForTimeout":
      return `wait ${step.ms}ms`;
    case "waitForSelector":
      return `wait for ${step.selector}`;
    case "hover":
      return `hover ${step.selector}`;
    case "print":
      return `print ${step.message}`;
    case "screenshot":
      return `screenshot ${step.name ?? ""}`;
  }
}

function buildRunningEntry(test: LocalTest, startedAt: string): TestRunReportEntry {
  return {
    testId: test.id,
    testIdentifier: test.identifier,
    testName: test.name,
    status: "running",
    startedAt,
    finishedAt: startedAt,
    durationMs: 0,
    stepsTotal: test.steps.length,
    stepsCompleted: 0,
  };
}

function isStepValid(step: LocalStep): boolean {
  switch (step.type) {
    case "goto":
      return step.urlSource === "variable" ? Boolean(step.urlVar) : step.url.trim().length > 0;
    case "fill":
      if (!step.selector.trim()) return false;
      return step.valueSource === "variable"
        ? Boolean(step.valueVar)
        : step.value.trim().length > 0;
    case "click":
      return step.selector.trim().length > 0;
    case "expectText":
      if (!step.selector.trim()) return false;
      return step.textSource === "variable"
        ? Boolean(step.textVar)
        : step.text.trim().length > 0;
    case "expectVisible":
      return step.selector.trim().length > 0;
    case "waitForTimeout":
      return step.ms > 0;
    case "waitForSelector":
      return step.selector.trim().length > 0;
    case "hover":
      return step.selector.trim().length > 0;
    case "print":
      return step.message.trim().length > 0;
    case "screenshot":
      return true;
  }
}

function getSnapshot(data: {
  name: string;
  identifier: string;
  baseURL: string;
  steps: LocalStep[];
  variables: VariableItem[];
  artifacts: ArtifactSettings;
}) {
  const variablesRecord = data.variables.reduce<Record<string, string>>((acc, variable) => {
    const key = variable.name.trim();
    if (key) acc[key] = variable.value;
    return acc;
  }, {});

  return JSON.stringify({
    name: data.name.trim(),
    identifier: data.identifier.trim(),
    baseURL: data.baseURL,
    steps: data.steps,
    variables: variablesRecord,
    artifacts: data.artifacts,
  });
}

function getDefaultStep(type: LocalStep["type"]): LocalStep {
  switch (type) {
    case "goto":
      return { type: "goto", url: "", urlSource: "literal" };
    case "fill":
      return {
        type: "fill",
        selectorType: "css",
        selector: "",
        value: "",
        valueSource: "literal",
      };
    case "click":
      return { type: "click", selectorType: "css", selector: "" };
    case "expectText":
      return {
        type: "expectText",
        selectorType: "css",
        selector: "",
        text: "",
        textSource: "literal",
      };
    case "expectVisible":
      return { type: "expectVisible", selectorType: "css", selector: "" };
    case "waitForTimeout":
      return { type: "waitForTimeout", ms: 1000 };
    case "waitForSelector":
      return { type: "waitForSelector", selectorType: "css", selector: "" };
    case "hover":
      return { type: "hover", selectorType: "css", selector: "" };
    case "print":
      return { type: "print", message: "", messageSource: "literal" };
    case "screenshot":
      return { type: "screenshot", name: "" };
  }
}

export default function CreateTestPage({ currentUser }: CreateTestPageProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const testIdRef = useRef(id ?? createId("test"));
  const initialSnapshotRef = useRef<string | null>(null);
  const [existingTest, setExistingTest] = useState<LocalTest | null>(null);
  const [testName, setTestName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [identifierTouched, setIdentifierTouched] = useState(false);
  const [baseURL, setBaseURL] = useState(DEFAULT_BASE_URL);
  const [steps, setSteps] = useState<LocalStep[]>([]);
  const [variables, setVariables] = useState<VariableItem[]>([
    { id: createId("var"), name: BASE_VAR_NAME, value: DEFAULT_BASE_URL, locked: true },
  ]);
  const [artifacts, setArtifacts] = useState<ArtifactSettings>({
    screenshot: "only-on-failure",
    video: "off",
    trace: "off",
  });
  const [lastRunResult, setLastRunResult] = useState<RunResult | null>(null);
  const [artifactsAnchor, setArtifactsAnchor] = useState<null | HTMLElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewerPath, setViewerPath] = useState<string | null>(null);
  const [viewerLabel, setViewerLabel] = useState<string>("");

  const viewerUrl = useMemo(() => (viewerPath ? toFileUrl(viewerPath) : ""), [viewerPath]);

  function openViewer(path: string) {
    setViewerPath(path);
    setViewerLabel(getFileName(path));
  }

  const variableOptions = useMemo(() => {
    return variables
      .map((variable) => variable.name.trim())
      .filter((name) => name.length > 0);
  }, [variables]);

  const customVariableOptions = useMemo(() => {
    return variableOptions.filter((name) => name !== BASE_VAR_NAME);
  }, [variableOptions]);

  const hasCustomVariables = customVariableOptions.length > 0;

  useEffect(() => {
    if (!id) return;
    const stored = getLocalTest(id);
    if (!stored) {
      toast.error("Test not found");
      navigate("/tests");
      return;
    }

    setExistingTest(stored);
    setTestName(stored.name);
    setIdentifier(stored.identifier || buildSlug(stored.name));
    setBaseURL(stored.baseURL);
    setSteps(stored.steps);
    setArtifacts(
      stored.artifacts ?? { screenshot: "only-on-failure", video: "off", trace: "off" },
    );

    const storedVariables: VariableItem[] = Object.entries(stored.variables).map(
      ([name, value]) => ({
        id: createId("var"),
        name,
        value,
        locked: name === BASE_VAR_NAME,
      }),
    );

    if (!storedVariables.find((variable) => variable.name === BASE_VAR_NAME)) {
      storedVariables.unshift({
        id: createId("var"),
        name: BASE_VAR_NAME,
        value: stored.baseURL,
        locked: true,
      });
    }

    setVariables(storedVariables);
    testIdRef.current = stored.id;
    initialSnapshotRef.current = getSnapshot({
      name: stored.name,
      identifier: stored.identifier || buildSlug(stored.name),
      baseURL: stored.baseURL,
      steps: stored.steps,
      variables: storedVariables,
      artifacts: stored.artifacts ?? { screenshot: "only-on-failure", video: "off", trace: "off" },
    });
  }, [id, navigate]);

  useEffect(() => {
    if (!isEdit && !initialSnapshotRef.current) {
      initialSnapshotRef.current = getSnapshot({
        name: testName,
        identifier,
        baseURL,
        steps,
        variables,
        artifacts,
      });
    }
  }, [isEdit]);

  useEffect(() => {
    if (identifierTouched) return;
    if (!identifier && testName.trim()) {
      setIdentifier(buildSlug(testName));
    }
  }, [identifierTouched, identifier, testName]);

  useEffect(() => {
    setVariables((prev) =>
      prev.map((variable) =>
        variable.name === BASE_VAR_NAME
          ? { ...variable, value: baseURL, locked: true }
          : variable,
      ),
    );
  }, [baseURL]);

  const isDirty = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return (
      getSnapshot({ name: testName, identifier, baseURL, steps, variables, artifacts }) !==
      initialSnapshotRef.current
    );
  }, [testName, identifier, baseURL, steps, variables, artifacts]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function addVariable() {
    setVariables((prev) => [...prev, { id: createId("var"), name: "", value: "" }]);
  }

  function updateVariable(index: number, field: "name" | "value", value: string) {
    setVariables((prev) =>
      prev.map((variable, i) =>
        i === index ? { ...variable, [field]: value } : variable,
      ),
    );
  }

  function removeVariable(index: number) {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  }

  function addStep() {
    setSteps((prev) => [...prev, getDefaultStep("goto")]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function setStepType(index: number, type: LocalStep["type"]) {
    setSteps((prev) => prev.map((step, i) => (i === index ? getDefaultStep(type) : step)));
  }

  function updateStep(index: number, patch: Partial<LocalStep>) {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? ({ ...step, ...patch } as LocalStep) : step)),
    );
  }

  function buildLocalTest(nextUpdatedAt?: string): LocalTest {
    const now = new Date().toISOString();
    const testId = testIdRef.current;
    if (!testId) {
      throw new Error("Test name is required");
    }

    const variablesRecord = variables.reduce<Record<string, string>>((acc, variable) => {
      const key = variable.name.trim();
      if (!key) return acc;
      acc[key] = variable.value;
      return acc;
    }, {});

    variablesRecord[BASE_VAR_NAME] = baseURL;

    return {
      id: testId,
      identifier: identifier.trim() || buildSlug(testName),
      name: testName.trim(),
      baseURL,
      steps,
      variables: variablesRecord,
      artifacts,
      createdAt: existingTest?.createdAt ?? now,
      updatedAt: nextUpdatedAt,
      lastRun: existingTest?.lastRun,
    };
  }

  async function handleRun() {
    if (!testName.trim()) {
      toast.error("Test name is required");
      return;
    }

    if (!identifier.trim() && !buildSlug(testName)) {
      toast.error("Identifier is required");
      return;
    }

    if (steps.length === 0) {
      toast.error("Add at least one step");
      return;
    }

    const invalidIndex = steps.findIndex((step) => !isStepValid(step));
    if (invalidIndex !== -1) {
      toast.error(`Step ${invalidIndex + 1} is incomplete`);
      return;
    }

    const reportId = createId("report");
    const startedAt = new Date().toISOString();
    try {
      setIsRunning(true);
      if (!testIdRef.current) {
        testIdRef.current = buildSlug(testName) || createId("test");
      }
      const draft = buildLocalTest();
      const runningReport: RunReport = {
        id: reportId,
        kind: "single",
        createdAt: startedAt,
        finishedAt: startedAt,
        tests: [buildQueuedEntry(draft, startedAt)],
      };
      addRunReport(runningReport);
      updateRunReport(reportId, (report) => ({
        ...report,
        tests: [buildRunningEntry(draft, startedAt)],
      }));
      upsertLocalTest({
        ...draft,
        lastRun: {
          status: "running",
          startedAt,
          finishedAt: startedAt,
          stepsTotal: draft.steps.length,
          stepsCompleted: 0,
        },
      });
      const result = await runTest(currentUser, buildRunRequest(draft));
      setLastRunResult(result);

      const updated: LocalTest = {
        ...draft,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        lastRun: {
          status: result.status,
          startedAt: result.startedAt,
          finishedAt: result.finishedAt,
          durationMs: result.durationMs,
          stepsTotal: result.summary.stepsTotal,
          stepsCompleted: result.summary.stepsCompleted,
        },
      };

      upsertLocalTest(updated);

      const report: RunReport = {
        id: reportId,
        kind: "single",
        createdAt: result.startedAt,
        finishedAt: result.finishedAt,
        tests: [buildReportEntry(updated, result)],
      };
      updateRunReport(reportId, () => report);
    } catch (error) {
      const message = formatErrorMessage(error) || "Unknown error";
      const now = new Date().toISOString();
      const fallbackResult: RunResult = {
        status: "failed",
        startedAt: now,
        finishedAt: now,
        durationMs: 0,
        summary: { stepsTotal: steps.length, stepsCompleted: 0 },
        error: { message },
      };

      setLastRunResult(fallbackResult);
      const draft = buildLocalTest();
      upsertLocalTest({
        ...draft,
        lastRun: {
          status: "failed",
          startedAt: fallbackResult.startedAt,
          finishedAt: fallbackResult.finishedAt,
          durationMs: fallbackResult.durationMs,
          stepsTotal: fallbackResult.summary.stepsTotal,
          stepsCompleted: fallbackResult.summary.stepsCompleted,
        },
      });

      const report: RunReport = {
        id: reportId,
        kind: "single",
        createdAt: fallbackResult.startedAt,
        finishedAt: fallbackResult.finishedAt,
        tests: [buildReportEntry(draft, fallbackResult)],
      };
      updateRunReport(reportId, () => report);

    } finally {
      setIsRunning(false);
    }
  }

  async function handleSave() {
    if (!testName.trim()) {
      toast.error("Test name is required");
      return;
    }

    if (!identifier.trim() && !buildSlug(testName)) {
      toast.error("Identifier is required");
      return;
    }

    if (steps.length === 0) {
      toast.error("Add at least one step");
      return;
    }

    const invalidIndex = steps.findIndex((step) => !isStepValid(step));
    if (invalidIndex !== -1) {
      toast.error(`Step ${invalidIndex + 1} is incomplete`);
      return;
    }

    try {
      if (isEdit && initialSnapshotRef.current) {
        const currentSnapshot = getSnapshot({ name: testName, identifier, baseURL, steps, variables, artifacts });
        if (currentSnapshot === initialSnapshotRef.current) {
          toast.info("No changes to save");
          return;
        }
      }

      setIsSaving(true);
      const now = new Date().toISOString();
      if (!testIdRef.current) {
        testIdRef.current = buildSlug(testName) || createId("test");
      }
      const draft = buildLocalTest(now);
      const testDef = buildTestDefinition(draft);

      await saveTestVersion(currentUser, draft.id, testDef);
      upsertLocalTest(draft);

      initialSnapshotRef.current = getSnapshot({
        name: draft.name,
        identifier: draft.identifier,
        baseURL: draft.baseURL,
        steps: draft.steps,
        variables,
        artifacts: draft.artifacts ?? artifacts,
      });
      toast.success(isEdit ? "Test updated!" : "Test saved!");
      navigate("/tests");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save test");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography component="h1" variant="h4">
          {isEdit ? "Edit Playwright Test" : "Create Playwright Test"}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/tests")}
        >
          Back
        </Button>
      </Stack>

      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label="Test Name"
                fullWidth
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g., Login and Create Event"
              />
              <TextField
                label="Identifier"
                fullWidth
                value={identifier}
                onChange={(e) => {
                  setIdentifierTouched(true);
                  setIdentifier(e.target.value);
                }}
                placeholder="e.g., testeFront-001"
                helperText="Used for delete confirmation and reports"
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                <TextField
                  label="Base URL"
                  fullWidth
                  value={baseURL}
                  onChange={(e) => setBaseURL(e.target.value)}
                  placeholder="e.g., http://localhost:5173"
                />
                <IconButton
                  onClick={(event) => setArtifactsAnchor(event.currentTarget)}
                  aria-label="open artifacts"
                >
                  <SettingsIcon />
                </IconButton>
                <Popover
                  open={Boolean(artifactsAnchor)}
                  anchorEl={artifactsAnchor}
                  onClose={() => setArtifactsAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <Box sx={{ p: 2, minWidth: 260 }}>
                    <Stack spacing={2}>
                      <Typography variant="subtitle1">Artifacts</Typography>
                      <FormControl fullWidth size="small">
                        <InputLabel>Screenshot</InputLabel>
                        <Select
                          value={artifacts.screenshot ?? "only-on-failure"}
                          onChange={(e) =>
                            setArtifacts((prev) => ({
                              ...prev,
                              screenshot: e.target.value as ArtifactSettings["screenshot"],
                            }))
                          }
                          label="Screenshot"
                        >
                          <MenuItem value="off">Off</MenuItem>
                          <MenuItem value="only-on-failure">Only on Failure</MenuItem>
                          <MenuItem value="on">On</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small">
                        <InputLabel>Video</InputLabel>
                        <Select
                          value={artifacts.video ?? "off"}
                          onChange={(e) =>
                            setArtifacts((prev) => ({
                              ...prev,
                              video: e.target.value as ArtifactSettings["video"],
                            }))
                          }
                          label="Video"
                        >
                          <MenuItem value="off">Off</MenuItem>
                          <MenuItem value="on">On</MenuItem>
                          <MenuItem value="retain-on-failure">Retain on Failure</MenuItem>
                          <MenuItem value="on-first-retry">On First Retry</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small">
                        <InputLabel>Trace</InputLabel>
                        <Select
                          value={artifacts.trace ?? "off"}
                          onChange={(e) =>
                            setArtifacts((prev) => ({
                              ...prev,
                              trace: e.target.value as ArtifactSettings["trace"],
                            }))
                          }
                          label="Trace"
                        >
                          <MenuItem value="off">Off</MenuItem>
                          <MenuItem value="on">On</MenuItem>
                          <MenuItem value="retain-on-failure">Retain on Failure</MenuItem>
                          <MenuItem value="on-first-retry">On First Retry</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                  </Box>
                </Popover>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Variables</Typography>
                <Button variant="outlined" size="small" onClick={addVariable}>
                  Add Variable
                </Button>
              </Stack>
              {variables.map((variable, index) => (
                <Grid container spacing={2} key={variable.id} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Name"
                      value={variable.name}
                      onChange={(e) => updateVariable(index, "name", e.target.value)}
                      disabled={variable.locked}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Value"
                      value={variable.value}
                      onChange={(e) => updateVariable(index, "value", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <IconButton
                      color="error"
                      size="small"
                      disabled={variable.locked}
                      onClick={() => removeVariable(index)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={2}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">Steps</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={addStep}>
              Add Step
            </Button>
          </Box>

          {steps.length === 0 ? (
            <Typography color="textSecondary" sx={{ py: 2, textAlign: "center" }}>
              No steps yet. Click "Add Step" to begin.
            </Typography>
          ) : (
            steps.map((step, index) => (
              <Card key={index}>
                <CardContent>
                  <Grid container spacing={2} alignItems="flex-start">
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={step.type}
                          onChange={(e) =>
                            setStepType(index, e.target.value as LocalStep["type"])
                          }
                          label="Type"
                        >
                          <MenuItem value="goto">Navigate to URL</MenuItem>
                          <MenuItem value="fill">Fill Input</MenuItem>
                          <MenuItem value="click">Click Element</MenuItem>
                          <MenuItem value="expectText">Expect Text</MenuItem>
                          <MenuItem value="expectVisible">Expect Visible</MenuItem>
                          <MenuItem value="waitForTimeout">Wait (ms)</MenuItem>
                          <MenuItem value="waitForSelector">Wait for Selector</MenuItem>
                          <MenuItem value="hover">Hover</MenuItem>
                          <MenuItem value="print">Print</MenuItem>
                          <MenuItem value="screenshot">Screenshot</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {(step.type === "fill" ||
                      step.type === "click" ||
                      step.type === "expectText" ||
                      step.type === "expectVisible" ||
                      step.type === "waitForSelector" ||
                      step.type === "hover") && (
                      <Grid item xs={12} sm={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Selector Type</InputLabel>
                          <Select
                            value={step.selectorType ?? "css"}
                            onChange={(e) =>
                              updateStep(index, { selectorType: e.target.value as SelectorType })
                            }
                            label="Selector Type"
                          >
                            <MenuItem value="css">CSS</MenuItem>
                            <MenuItem value="xpath">XPath</MenuItem>
                            <MenuItem value="text">Text</MenuItem>
                            <MenuItem value="role">Role</MenuItem>
                            <MenuItem value="testid">Test Id</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    )}

                    {(step.type === "fill" ||
                      step.type === "click" ||
                      step.type === "expectText" ||
                      step.type === "expectVisible" ||
                      step.type === "waitForSelector" ||
                      step.type === "hover") && (
                      <Grid item xs={12} sm={5}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Selector"
                          value={step.selector}
                          onChange={(e) => updateStep(index, { selector: e.target.value })}
                          placeholder="e.g., [data-testid='submit']"
                        />
                      </Grid>
                    )}

                    {step.type === "goto" && (
                      <>
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>URL Source</InputLabel>
                            <Select
                              value={step.urlSource ?? "literal"}
                              onChange={(e) =>
                                updateStep(index, { urlSource: e.target.value as ValueSource })
                              }
                              label="URL Source"
                            >
                              <MenuItem value="literal">Literal</MenuItem>
                              <MenuItem value="variable" disabled={!variableOptions.length}>
                                Variable
                              </MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        {step.urlSource === "variable" ? (
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Variable</InputLabel>
                              <Select
                                value={step.urlVar ?? ""}
                                onChange={(e) => updateStep(index, { urlVar: e.target.value })}
                                label="Variable"
                              >
                                {variableOptions.map((name) => (
                                  <MenuItem key={name} value={name}>
                                    {name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        ) : (
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="URL"
                              value={step.url}
                              onChange={(e) => updateStep(index, { url: e.target.value })}
                              placeholder="e.g., /login"
                            />
                          </Grid>
                        )}
                      </>
                    )}

                    {step.type === "fill" && (
                      <>
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Value Source</InputLabel>
                            <Select
                              value={step.valueSource ?? "literal"}
                              onChange={(e) =>
                                updateStep(index, { valueSource: e.target.value as ValueSource })
                              }
                              label="Value Source"
                            >
                              <MenuItem value="literal">Literal</MenuItem>
                              <MenuItem value="variable" disabled={!hasCustomVariables}>
                                Variable
                              </MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        {step.valueSource === "variable" ? (
                          <Grid item xs={12} sm={5}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Variable</InputLabel>
                              <Select
                                value={step.valueVar ?? ""}
                                onChange={(e) => updateStep(index, { valueVar: e.target.value })}
                                label="Variable"
                              >
                                {customVariableOptions.map((name) => (
                                  <MenuItem key={name} value={name}>
                                    {name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        ) : (
                          <Grid item xs={12} sm={5}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Value"
                              value={step.value}
                              onChange={(e) => updateStep(index, { value: e.target.value })}
                              placeholder="e.g., user@example.com"
                            />
                          </Grid>
                        )}
                      </>
                    )}

                    {step.type === "expectText" && (
                      <>
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Text Source</InputLabel>
                            <Select
                              value={step.textSource ?? "literal"}
                              onChange={(e) =>
                                updateStep(index, { textSource: e.target.value as ValueSource })
                              }
                              label="Text Source"
                            >
                              <MenuItem value="literal">Literal</MenuItem>
                              <MenuItem value="variable" disabled={!hasCustomVariables}>
                                Variable
                              </MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        {step.textSource === "variable" ? (
                          <Grid item xs={12} sm={5}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Variable</InputLabel>
                              <Select
                                value={step.textVar ?? ""}
                                onChange={(e) => updateStep(index, { textVar: e.target.value })}
                                label="Variable"
                              >
                                {customVariableOptions.map((name) => (
                                  <MenuItem key={name} value={name}>
                                    {name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        ) : (
                          <Grid item xs={12} sm={5}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Expected Text"
                              value={step.text}
                              onChange={(e) => updateStep(index, { text: e.target.value })}
                              placeholder="e.g., Event created successfully"
                            />
                          </Grid>
                        )}
                      </>
                    )}

                    {step.type === "waitForTimeout" && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Milliseconds"
                          type="number"
                          inputProps={{ min: 0 }}
                          value={step.ms}
                          onChange={(e) =>
                            updateStep(index, { ms: Number(e.target.value) || 0 })
                          }
                        />
                      </Grid>
                    )}

                    {step.type === "print" && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Message"
                          value={step.message}
                          onChange={(e) => updateStep(index, { message: e.target.value })}
                          placeholder="e.g., Starting checkout flow"
                        />
                      </Grid>
                    )}

                    {step.type === "screenshot" && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Screenshot Name"
                          value={step.name ?? ""}
                          onChange={(e) => updateStep(index, { name: e.target.value })}
                          placeholder="e.g., after-login"
                        />
                      </Grid>
                    )}

                    <Grid item xs={12} sm={1}>
                      <IconButton color="error" size="small" onClick={() => removeStep(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>

        {lastRunResult && (
          <Card>
            <CardContent>
              {(() => {
                const durationMs =
                  lastRunResult.durationMs ??
                  (lastRunResult.startedAt && lastRunResult.finishedAt
                    ? Math.max(
                        0,
                        new Date(lastRunResult.finishedAt).getTime() -
                          new Date(lastRunResult.startedAt).getTime(),
                      )
                    : 0);
                return (
              <Stack spacing={1}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip
                    label={lastRunResult.status}
                    color={lastRunResult.status === "passed" ? "success" : "error"}
                    size="small"
                  />
                  <Typography variant="body2">
                    Duration: {Math.round(durationMs / 1000)}s
                  </Typography>
                  <Typography variant="body2">
                    Steps: {lastRunResult.summary.stepsCompleted}/
                    {lastRunResult.summary.stepsTotal}
                  </Typography>
                </Stack>
                {lastRunResult.error?.message && (
                  <Typography variant="body2" color="error">
                    Error: {formatErrorMessage(lastRunResult.error.message)}
                  </Typography>
                )}
                {lastRunResult.failedStepIndex !== undefined && (
                  <Typography variant="body2" color="textSecondary">
                    Failed step #{lastRunResult.failedStepIndex + 1}: {summarizeFailedStep(lastRunResult.failedStep) ?? "-"}
                  </Typography>
                )}
                {lastRunResult.logs?.length ? (
                  <Typography variant="body2">
                    Logs: {lastRunResult.logs.join(" | ")}
                  </Typography>
                ) : null}
                {lastRunResult.artifacts?.screenshotPaths?.length ? (
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="textSecondary">
                      Screenshots:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {lastRunResult.artifacts.screenshotPaths.map((path) => (
                        <Button
                          key={path}
                          size="small"
                          variant="outlined"
                          onClick={() => openViewer(path)}
                        >
                          {getFileName(path)}
                        </Button>
                      ))}
                    </Stack>
                  </Stack>
                ) : null}
                {lastRunResult.artifacts?.videoPath ? (
                  <Typography variant="body2" color="textSecondary">
                    Video: {getFileName(lastRunResult.artifacts.videoPath)}
                  </Typography>
                ) : null}
                {lastRunResult.artifacts?.tracePath ? (
                  <Typography variant="body2" color="textSecondary">
                    Trace: {getFileName(lastRunResult.artifacts.tracePath)}
                  </Typography>
                ) : null}
              </Stack>
                );
              })()}
            </CardContent>
          </Card>
        )}

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={() => navigate("/tests")}>
            Cancel
          </Button>
          <Button variant="contained" color="warning" onClick={handleRun} disabled={isRunning}>
            {isRunning ? "Running..." : "Run Test"}
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Changes" : "Save Test"}
          </Button>
        </Stack>
        <Dialog open={Boolean(viewerPath)} onClose={() => setViewerPath(null)} maxWidth="md" fullWidth>
          <DialogTitle>{viewerLabel || "Screenshot"}</DialogTitle>
          <DialogContent>
            {viewerUrl ? (
              <Box
                component="img"
                src={viewerUrl}
                alt={viewerLabel}
                sx={{ width: "100%", borderRadius: 1 }}
              />
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewerPath(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Container>
  );
}
