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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AuthUser, ImportableSpec, listSpecFiles, runTest } from "../services/apiClient";
import {
  buildRunRequest,
  buildLocalStepFromStep,
  addRunReport,
  deleteLocalTest,
  loadLocalTests,
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

  function formatDate(value: string | undefined) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
