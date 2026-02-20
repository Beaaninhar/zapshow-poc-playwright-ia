import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  Box,
  LinearProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AuthUser, ImportableSpec, Job, Step, createJob, getJob, listDbTests, listSpecFiles, runTest, runTestsBatch } from "../services/apiClient";
import {
  buildRunRequest,
  buildTestDefinition,
  buildLocalStepFromStep,
  addRunReport,
  deleteLocalTest,
  loadLocalTests,
  saveLocalTests,
  updateRunReport,
  type RunReport,
  type TestRunReportEntry,
  upsertLocalTest,
  type LocalTest,
} from "../services/localTests";
import { formatErrorMessage } from "../services/errorUtils";

type TestsPageProps = {
  currentUser: AuthUser;
  onLogout: () => void;
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function TestsPage({ currentUser, onLogout }: TestsPageProps) {
  const navigate = useNavigate();
  const [tests, setTests] = useState<LocalTest[]>([]);
  const [runningIds, setRunningIds] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState<LocalTest | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importableSpecs, setImportableSpecs] = useState<ImportableSpec[]>([]);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [jobUrl, setJobUrl] = useState(() => window.location.origin);
  const [jobObjective, setJobObjective] = useState("Smoke tests");
  const [jobRoutesInput, setJobRoutesInput] = useState("");
  const [loginEnabled, setLoginEnabled] = useState(false);
  const [loginUrl, setLoginUrl] = useState("/login");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginUsernameSelector, setLoginUsernameSelector] = useState("input[name='email'], input[type='email']");
  const [loginPasswordSelector, setLoginPasswordSelector] = useState("input[name='password'], input[type='password']");
  const [loginSubmitSelector, setLoginSubmitSelector] = useState("button[type='submit']");
  const [job, setJob] = useState<Job | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);

  const hasSelection = useMemo(() => selectedIds.size > 0, [selectedIds]);
  const allSelected = tests.length > 0 && selectedIds.size === tests.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < tests.length;

  useEffect(() => {
    const refresh = () => {
      const nextTests = loadLocalTests();
      setTests(nextTests);
      setSelectedIds((prev) =>
        new Set(nextTests.filter((test) => prev.has(test.id)).map((test) => test.id)),
      );
      setRunningIds(
        new Set(nextTests.filter((t) => t.lastRun?.status === "running").map((t) => t.id)),
      );
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const syncDbTests = async () => {
      try {
        const dbTests = await listDbTests(currentUser);
        if (!active || dbTests.length === 0) return;

        const now = new Date().toISOString();
        const mapped: LocalTest[] = dbTests.map((item) => ({
          id: `db-${item.testId}`,
          identifier: item.testId,
          name: item.definition.name?.trim() || item.testId,
          baseURL: item.definition.baseURL || window.location.origin,
          steps: item.definition.steps.map((step) => buildLocalStepFromStep(step)),
          variables: {},
          createdAt: item.createdAt || now,
          updatedAt: item.createdAt || now,
        }));

        saveLocalTests(mapped);
        setTests(mapped);
      } catch (error) {
        toast.error(`Failed to load tests from DB: ${formatErrorMessage(error)}`);
      }
    };

    syncDbTests();
    return () => {
      active = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!job) return;
    if (job.status === "completed" || job.status === "failed") return;

    const timer = window.setInterval(async () => {
      try {
        const refreshed = await getJob(currentUser, job.id);
        setJob(refreshed);
      } catch (error) {
        setJobError(formatErrorMessage(error) || "Failed to refresh job");
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [job, currentUser]);

  useEffect(() => {
    if (!job || job.status !== "completed") return;
    const generatedTests = job.artifacts?.tests ?? [];
    if (!generatedTests.length) return;

    const existing = loadLocalTests();
    const existingIds = new Set(existing.map((item) => item.id));
    const createdAt = new Date().toISOString();

    const newTests: LocalTest[] = generatedTests
      .map((test, index) => {
        const id = `job-${job.id}-${index + 1}`;
        if (existingIds.has(id)) return null;

        return {
          id,
          identifier: buildIdentifier(test.name) || id,
          name: test.name,
          baseURL: test.baseURL || job.url,
          steps: test.steps.map((step) => buildLocalStepFromStep(step)),
          variables: {},
          createdAt,
          updatedAt: createdAt,
        } as LocalTest;
      })
      .filter((item): item is LocalTest => Boolean(item));

    if (!newTests.length) return;
    const merged = [...newTests, ...existing];
    saveLocalTests(merged);
    setTests(merged);
    toast.success(`Imported ${newTests.length} generated tests`);
  }, [job]);

  function formatDate(value: string | undefined) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  }

  function buildIdentifier(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  function markRunning(test: LocalTest) {
    const startedAt = new Date().toISOString();
    const updated: LocalTest = {
      ...test,
      lastRun: {
        status: "running",
        startedAt,
        finishedAt: startedAt,
        stepsTotal: test.steps.length,
        stepsCompleted: 0,
      },
    };
    const updatedList = upsertLocalTest(updated);
    setTests(updatedList);
    setRunningIds((prev) => new Set(prev).add(test.id));
  }

  function buildReportEntry(
    test: LocalTest,
    result: { status: "passed" | "failed"; startedAt?: string; finishedAt: string; durationMs?: number; summary?: { stepsTotal: number; stepsCompleted: number }; stepResults?: TestRunReportEntry["stepResults"]; error?: { message?: unknown }; artifacts?: RunReport["tests"][number]["artifacts"]; logs?: string[]; failedStepIndex?: number; failedStep?: RunReport["tests"][number]["failedStep"] },
  ): TestRunReportEntry {
    const errorMessage = result.status === "failed"
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
      stepsTotal: result.summary?.stepsTotal ?? test.steps.length,
      stepsCompleted: result.summary?.stepsCompleted ?? 0,
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

  function buildLoginSharedSteps() {
    if (!loginEnabled || !loginUsername || !loginPassword) return undefined;
    const steps: Step[] = [
      { type: "goto", url: loginUrl.trim() || "/login" },
      { type: "waitForSelector", selector: loginUsernameSelector.trim() || "input[name='email'], input[type='email']" },
      {
        type: "fill",
        selector: loginUsernameSelector.trim() || "input[name='email'], input[type='email']",
        value: loginUsername.trim(),
      },
      {
        type: "fill",
        selector: loginPasswordSelector.trim() || "input[name='password'], input[type='password']",
        value: loginPassword,
      },
      {
        type: "click",
        selector: loginSubmitSelector.trim() || "button[type='submit']",
      },
      { type: "waitForSelector", selector: "body" },
    ];
    return steps;
  }

  async function runAndUpdate(test: LocalTest) {
    markRunning(test);
    try {
      const result = await runTest(currentUser, buildRunRequest(test));

      const updated: LocalTest = {
        ...test,
        lastRun: {
          status: result.status,
          startedAt: test.lastRun?.startedAt ?? result.startedAt,
          finishedAt: result.finishedAt,
          durationMs: result.durationMs,
          stepsTotal: result.summary.stepsTotal,
          stepsCompleted: result.summary.stepsCompleted,
        },
      };

      const updatedList = upsertLocalTest(updated);
      setTests(updatedList);

      return { result, updated };
    } catch (error) {
      const message = formatErrorMessage(error) || "Failed to run test";
      const failed: LocalTest = {
        ...test,
        lastRun: {
          status: "failed",
          startedAt: test.lastRun?.startedAt,
          finishedAt: new Date().toISOString(),
          stepsTotal: test.steps.length,
          stepsCompleted: 0,
        },
      };
      const updatedList = upsertLocalTest(failed);
      setTests(updatedList);
      const finishedAt = failed.lastRun?.finishedAt ?? new Date().toISOString();
      return {
        result: {
          status: "failed" as const,
          startedAt: failed.lastRun?.startedAt ?? finishedAt,
          finishedAt,
          durationMs: 0,
          error: { message },
          summary: { stepsTotal: test.steps.length, stepsCompleted: 0 },
        },
        updated: failed,
      };
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(test.id);
        return next;
      });
    }
  }

  async function handleRun(test: LocalTest) {
    const reportId = createId("report");
    const startedAt = new Date().toISOString();
    const runningReport: RunReport = {
      id: reportId,
      kind: "single",
      createdAt: startedAt,
      finishedAt: startedAt,
      tests: [buildQueuedEntry(test, startedAt)],
    };
    addRunReport(runningReport);
    updateRunReport(reportId, () => ({
      id: reportId,
      kind: "single",
      createdAt: startedAt,
      finishedAt: startedAt,
      tests: [buildRunningEntry(test, startedAt)],
    }));

    try {
      const { result } = await runAndUpdate(test);
      const report: RunReport = {
        id: reportId,
        kind: "single",
        createdAt: result.startedAt ?? new Date().toISOString(),
        finishedAt: result.finishedAt,
        tests: [buildReportEntry(test, result)],
      };
      updateRunReport(reportId, () => report);
    } catch {
      // handled in runAndUpdate
    }
  }

  function toggleSelected(testId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(tests.map((test) => test.id)));
  }

  function handleDeleteRequest(test: LocalTest) {
    setDeleteTarget(test);
    setDeleteInput("");
  }

  function handleDeleteClose() {
    setDeleteTarget(null);
    setDeleteInput("");
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const updated = deleteLocalTest(deleteTarget.id);
    setTests(updated);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(deleteTarget.id);
      return next;
    });
    setDeleteTarget(null);
    setDeleteInput("");
    toast.success("Test deleted");
  }

  async function handleCreateJob() {
    const url = jobUrl.trim();
    const objective = jobObjective.trim();
    if (!url) {
      setJobError("URL is required");
      return;
    }
    if (!objective) {
      setJobError("Objective is required");
      return;
    }

    setJobLoading(true);
    setJobError(null);
    try {
      const routes = jobRoutesInput
        .split(",")
        .map((route) => route.trim())
        .filter(Boolean);

      const payload: Parameters<typeof createJob>[1] = {
        url,
        objective,
        routes: routes.length ? routes : undefined,
      };

      if (loginEnabled && loginUsername && loginPassword) {
        payload.login = {
          url: loginUrl.trim() || undefined,
          username: loginUsername.trim(),
          password: loginPassword,
          usernameSelector: loginUsernameSelector.trim() || undefined,
          passwordSelector: loginPasswordSelector.trim() || undefined,
          submitSelector: loginSubmitSelector.trim() || undefined,
        };
      }

      const created = await createJob(currentUser, payload);
      setJob(created);
    } catch (error) {
      setJobError(formatErrorMessage(error) || "Failed to create job");
    } finally {
      setJobLoading(false);
    }
  }


  async function openImportDialog() {
    setImportDialogOpen(true);
    setLoadingSpecs(true);
    try {
      const specs = await listSpecFiles(currentUser);
      setImportableSpecs(specs);
    } catch (error) {
      toast.error(`Failed to load /tests specs: ${formatErrorMessage(error)}`);
      setImportDialogOpen(false);
    } finally {
      setLoadingSpecs(false);
    }
  }

  function handleImportSpec(spec: ImportableSpec) {
    const now = new Date().toISOString();
    const imported: LocalTest = {
      id: `${spec.id}-${Date.now()}`,
      identifier: spec.id,
      name: spec.name,
      baseURL: spec.baseURL,
      steps: spec.steps.map((step) => buildLocalStepFromStep(step)),
      variables: {},
      createdAt: now,
      updatedAt: now,
    };

    const updated = upsertLocalTest(imported);
    setTests(updated);
    setImportDialogOpen(false);

    if (spec.warnings.length > 0) {
      toast.warn(`Imported with ${spec.warnings.length} unsupported lines.`);
    } else {
      toast.success(`Imported ${spec.path}`);
    }

    navigate(`/tests/${imported.id}/edit`);
  }

  async function handleRunSelected() {
    const testsToRun = tests.filter((test) => selectedIds.has(test.id));
    if (!testsToRun.length) return;
    const batchStarted = new Date().toISOString();
    const reportId = createId("report");
    const runningReport: RunReport = {
      id: reportId,
      kind: "batch",
      createdAt: batchStarted,
      finishedAt: batchStarted,
      tests: testsToRun.map((test) => buildQueuedEntry(test, batchStarted)),
    };
    addRunReport(runningReport);

    const batchEntries: TestRunReportEntry[] = [];
    for (const test of testsToRun) {
      const runningAt = new Date().toISOString();
      updateRunReport(reportId, (report) => ({
        ...report,
        tests: report.tests.map((item) =>
          item.testId === test.id ? buildRunningEntry(test, runningAt) : item,
        ),
        finishedAt: runningAt,
      }));
      const { result } = await runAndUpdate(test);
      const entry = buildReportEntry(test, result);
      batchEntries.push(entry);
      updateRunReport(reportId, (report) => ({
        ...report,
        tests: report.tests.map((item) => (item.testId === test.id ? entry : item)),
        finishedAt: result.finishedAt,
      }));
    }
    const batchReport: RunReport = {
      id: reportId,
      kind: "batch",
      createdAt: batchStarted,
      finishedAt: new Date().toISOString(),
      tests: batchEntries,
    };
    updateRunReport(reportId, () => batchReport);
  }

  async function handleRunSelectedShared() {
    const testsToRun = tests.filter((test) => selectedIds.has(test.id));
    if (!testsToRun.length) return;

    const batchStarted = new Date().toISOString();
    const reportId = createId("report");
    const runningReport: RunReport = {
      id: reportId,
      kind: "batch",
      createdAt: batchStarted,
      finishedAt: batchStarted,
      tests: testsToRun.map((test) => buildQueuedEntry(test, batchStarted)),
    };
    addRunReport(runningReport);

    const sharedSteps = buildLoginSharedSteps();
    try {
      const result = await runTestsBatch(currentUser, {
        baseURL: testsToRun[0]?.baseURL || jobUrl,
        tests: testsToRun.map((test) => buildTestDefinition(test)),
        sharedSteps,
        artifacts: {
          screenshot: "on",
          video: "on",
          trace: "retain-on-failure",
        },
      });

      if (!result.results.length) {
        toast.error(result.error?.message || "Batch run failed");
        return;
      }

      const reportEntries: TestRunReportEntry[] = [];
      for (let i = 0; i < testsToRun.length; i += 1) {
        const test = testsToRun[i];
        const entryResult = result.results[i]?.result;
        if (!entryResult) continue;

        const updated: LocalTest = {
          ...test,
          lastRun: {
            status: entryResult.status,
            startedAt: entryResult.startedAt,
            finishedAt: entryResult.finishedAt,
            durationMs: entryResult.durationMs,
            stepsTotal: entryResult.summary.stepsTotal,
            stepsCompleted: entryResult.summary.stepsCompleted,
          },
        };
        const updatedList = upsertLocalTest(updated);
        setTests(updatedList);

        reportEntries.push(buildReportEntry(test, entryResult));
      }

      updateRunReport(reportId, () => ({
        id: reportId,
        kind: "batch",
        createdAt: batchStarted,
        finishedAt: result.finishedAt,
        tests: reportEntries,
      }));
    } catch (error) {
      toast.error(formatErrorMessage(error) || "Batch run failed");
    }
  }

  return (
    <Container id="page-tests" data-page-name="tests-page" maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography component="h1" variant="h4">
          Playwright Tests
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate("/events")}
            startIcon={<ArrowBackIcon />}
          >
            Back
          </Button>
          <Button variant="text" size="small" onClick={onLogout}>
            Logout ({currentUser.name})
          </Button>
        </Stack>
      </Box>

      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Generate tests (Jobs)</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Target URL"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Objective"
                  value={jobObjective}
                  onChange={(e) => setJobObjective(e.target.value)}
                  fullWidth
                />
              </Stack>
              <TextField
                label="Routes (comma-separated)"
                value={jobRoutesInput}
                onChange={(e) => setJobRoutesInput(e.target.value)}
                helperText="Leave empty to auto-discover links"
                fullWidth
              />
              <Stack direction="row" spacing={2} alignItems="center">
                <Checkbox
                  checked={loginEnabled}
                  onChange={(e) => setLoginEnabled(e.target.checked)}
                />
                <Typography variant="body2">Use login</Typography>
              </Stack>
              {loginEnabled ? (
                <Stack spacing={2}>
                  <TextField
                    label="Login URL"
                    value={loginUrl}
                    onChange={(e) => setLoginUrl(e.target.value)}
                    fullWidth
                  />
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <TextField
                      label="Username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <TextField
                      label="Username selector"
                      value={loginUsernameSelector}
                      onChange={(e) => setLoginUsernameSelector(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Password selector"
                      value={loginPasswordSelector}
                      onChange={(e) => setLoginPasswordSelector(e.target.value)}
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Submit selector"
                    value={loginSubmitSelector}
                    onChange={(e) => setLoginSubmitSelector(e.target.value)}
                    fullWidth
                  />
                </Stack>
              ) : null}
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  onClick={handleCreateJob}
                  disabled={jobLoading}
                >
                  {jobLoading ? "Creating..." : "Generate Tests"}
                </Button>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    if (!job) return;
                    try {
                      const refreshed = await getJob(currentUser, job.id);
                      setJob(refreshed);
                    } catch (error) {
                      setJobError(formatErrorMessage(error) || "Failed to refresh job");
                    }
                  }}
                  disabled={!job}
                >
                  Refresh
                </Button>
                {job ? (
                  <Chip label={`Status: ${job.status}`} />
                ) : null}
              </Stack>

              {jobError ? (
                <Typography color="error" variant="body2">
                  {jobError}
                </Typography>
              ) : null}

              {job ? (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" color="textSecondary">
                      Phase: {job.phase?.name ?? "-"}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Progress: {job.phase?.percentage ?? 0}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.max(0, job.phase?.percentage ?? 0))}
                  />
                  {job.phase?.logs?.length ? (
                    <TextField
                      label="Logs"
                      value={job.phase.logs.join("\n")}
                      fullWidth
                      multiline
                      minRows={4}
                      InputProps={{ readOnly: true }}
                    />
                  ) : null}
                  {job.artifacts?.testPlan ? (
                    <TextField
                      label="Test plan"
                      value={job.artifacts.testPlan}
                      fullWidth
                      multiline
                      minRows={4}
                      InputProps={{ readOnly: true }}
                    />
                  ) : null}
                </Stack>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<PlayArrowIcon />}
              disabled={!hasSelection}
              onClick={handleRunSelected}
            >
              Run Selected
            </Button>
            <Button
              variant="outlined"
              disabled={!hasSelection}
              onClick={handleRunSelectedShared}
            >
              Run Selected (Shared Login)
            </Button>
            <Typography variant="body2" color="textSecondary">
              Selected: {selectedIds.size}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => navigate("/tests/reports")}
            >
              Reports
            </Button>
            <Button variant="outlined" onClick={openImportDialog}>
              Import from /tests
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/tests/new")}
            >
              Create New Test
            </Button>
          </Stack>
        </Box>

        {tests.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <Typography color="textSecondary" gutterBottom>
                No tests created yet
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate("/tests/new")}
                sx={{ mt: 2 }}
              >
                Create Your First Test
              </Button>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Test Name</TableCell>
                  <TableCell>Identifier</TableCell>
                  <TableCell align="center">Steps</TableCell>
                  <TableCell align="left">Created</TableCell>
                  <TableCell align="left">Last Run</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tests.map((test) => (
                  <TableRow key={test.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={selectedIds.has(test.id)}
                        onChange={() => toggleSelected(test.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {test.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {test.identifier || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{test.steps.length}</Typography>
                    </TableCell>
                    <TableCell align="left">
                      <Typography variant="body2">
                        {formatDate(test.updatedAt ?? test.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="left">
                      {test.lastRun ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            label={test.lastRun.status}
                            color={
                              test.lastRun.status === "passed"
                                ? "success"
                                : test.lastRun.status === "running"
                                  ? "warning"
                                  : "error"
                            }
                          />
                          <Typography variant="body2">
                            {formatDate(test.lastRun.finishedAt || test.lastRun.startedAt)}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          Not run yet
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleRun(test)}
                          disabled={runningIds.has(test.id)}
                        >
                          {runningIds.has(test.id) ? "Running..." : "Run"}
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => navigate(`/tests/${test.id}/edit`)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteRequest(test)}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import tests from /tests</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {loadingSpecs ? (
              <Typography variant="body2" color="textSecondary">Loading specs...</Typography>
            ) : importableSpecs.length === 0 ? (
              <Typography variant="body2" color="textSecondary">No .spec files found in /tests.</Typography>
            ) : (
              importableSpecs.map((spec) => (
                <Card key={spec.path} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                      <Box>
                        <Typography variant="subtitle2">{spec.name}</Typography>
                        <Typography variant="caption" color="textSecondary">{spec.path}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Steps parsed: {spec.steps.length}
                          {spec.warnings.length > 0 ? ` • warnings: ${spec.warnings.length}` : ""}
                        </Typography>
                      </Box>
                      <Button variant="contained" size="small" onClick={() => handleImportSpec(spec)}>
                        Import
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(deleteTarget)} onClose={handleDeleteClose}>
        <DialogTitle>Delete Test</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="textSecondary">
              Type the identifier to confirm deletion.
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {deleteTarget?.identifier || deleteTarget?.name}
            </Typography>
            <TextField
              id="tests-delete-identifier"
              label="Identifier"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              fullWidth
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={
              !deleteTarget ||
              deleteInput.trim() !== (deleteTarget.identifier || deleteTarget.name).trim()
            }
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
