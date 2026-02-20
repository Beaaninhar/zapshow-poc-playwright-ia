import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loadLocalTests,
  loadRunReports,
  type RunReport,
} from "../services/localTests";
import { formatErrorMessage } from "../services/errorUtils";
import { getFileName, toArtifactUrl } from "../services/fileUtils";
import { formatDateTime } from "../services/commonUtils";
import { summarizeLocalStep, summarizeRunStep } from "../services/stepDescriptions";

function renderReportTestPreview(report: RunReport, testId: string) {
  const tests = loadLocalTests();
  const test = tests.find((item) => item.id === testId);
  if (!test) return null;

  const previewSteps = test.steps.slice(0, 3).map(summarizeLocalStep);
  if (!previewSteps.length) return null;

  return (
    <Stack spacing={0.5} sx={{ mt: 1 }}>
      <Typography variant="caption" color="textSecondary">
        Preview ({Math.min(3, test.steps.length)} of {test.steps.length} steps)
      </Typography>
      {previewSteps.map((step, index) => (
        <Typography key={`${report.id}-${testId}-${index}`} variant="body2">
          {index + 1}. {step}
        </Typography>
      ))}
    </Stack>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<RunReport[]>([]);
  const [viewerPath, setViewerPath] = useState<string | null>(null);
  const [viewerLabel, setViewerLabel] = useState<string>("");
  const [viewerType, setViewerType] = useState<"image" | "video">("image");

  const viewerUrl = useMemo(() => (viewerPath ? toArtifactUrl(viewerPath) : ""), [viewerPath]);

  useEffect(() => {
    const refresh = () => setReports(loadRunReports());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setReports(loadRunReports());
    }, 2000);
    return () => window.clearInterval(interval);
  }, []);

  function openViewer(path: string, type: "image" | "video" = "image") {
    setViewerPath(path);
    setViewerLabel(getFileName(path));
    setViewerType(type);
  }

  function closeViewer() {
    setViewerPath(null);
    setViewerType("image");
  }

  return (
    <Container id="page-reports" data-page-name="reports-page" maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography component="h1" variant="h4">
          Test Run Reports
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/tests")}
        >
          Back to Tests
        </Button>
      </Box>

      {reports.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="textSecondary">No reports yet.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {reports.map((report) => (
            <Accordion key={report.id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip
                    size="small"
                    label={report.kind === "batch" ? "Batch" : "Single"}
                    color={report.kind === "batch" ? "info" : "default"}
                  />
                  <Typography variant="body2" color="textSecondary">
                    Started: {formatDateTime(report.createdAt)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Finished: {formatDateTime(report.finishedAt)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Tests: {report.tests.length}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1}>
                  {report.tests.map((entry) => (
                    <Box key={`${report.id}-${entry.testId}`}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          label={entry.status}
                          color={
                            entry.status === "passed"
                              ? "success"
                              : entry.status === "running"
                                ? "warning"
                                : entry.status === "queued"
                                  ? "info"
                                  : "error"
                          }
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {entry.testName}
                        </Typography>
                        {entry.testIdentifier && (
                          <Typography variant="caption" color="textSecondary">
                            {entry.testIdentifier}
                          </Typography>
                        )}
                        <Typography variant="caption" color="textSecondary">
                          {formatDateTime(entry.finishedAt)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                        <Typography variant="body2">
                          Steps: {entry.stepsCompleted ?? 0}/{entry.stepsTotal ?? 0}
                        </Typography>
                        {typeof entry.durationMs === "number" && (
                          <Typography variant="body2">
                            Duration: {Math.round(entry.durationMs / 1000)}s
                          </Typography>
                        )}
                      </Stack>
                      {entry.errorMessage && (
                        <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                          Error: {formatErrorMessage(entry.errorMessage)}
                        </Typography>
                      )}
                      {entry.failedStepIndex !== undefined && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                          Failed step #{entry.failedStepIndex + 1}: {summarizeRunStep(entry.failedStep) ?? "-"}
                        </Typography>
                      )}
                      {entry.artifacts?.screenshotPaths?.length ? (
                        <Stack spacing={1} sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="textSecondary">
                            Screenshots:
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {entry.artifacts.screenshotPaths.map((path) => (
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
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {entry.artifacts.screenshotPaths.map((path) => (
                              <Box
                                key={`${path}-thumb`}
                                component="img"
                                src={toArtifactUrl(path)}
                                alt={getFileName(path)}
                                sx={{ width: 160, borderRadius: 1, cursor: "pointer", border: "1px solid", borderColor: "divider" }}
                                onClick={() => openViewer(path)}
                              />
                            ))}
                          </Stack>
                        </Stack>
                      ) : null}
                      {entry.artifacts?.tracePath && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                          Trace: {getFileName(entry.artifacts.tracePath)}
                        </Typography>
                      )}
                      {entry.artifacts?.videoPath && (
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="textSecondary">
                            Video: {getFileName(entry.artifacts.videoPath)}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ width: "fit-content" }}
                            onClick={() => {
                              const { videoPath } = entry.artifacts ?? {};
                              if (!videoPath) return;
                              openViewer(videoPath, "video");
                            }}
                          >
                            Open video
                          </Button>
                        </Stack>
                      )}
                      {entry.stepResults?.length ? (
                        <Accordion sx={{ mt: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="body2">Steps ({entry.stepResults.length})</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Stack spacing={1}>
                              {entry.stepResults.map((stepResult) => (
                                <Accordion key={`${report.id}-${entry.testId}-step-${stepResult.index}`}>
                                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Chip
                                        size="small"
                                        label={stepResult.status}
                                        color={stepResult.status === "passed" ? "success" : "error"}
                                      />
                                      <Typography variant="body2">
                                        Step #{stepResult.index + 1}
                                      </Typography>
                                      <Typography variant="body2" color="textSecondary">
                                        {summarizeRunStep(stepResult.step) ?? "-"}
                                      </Typography>
                                    </Stack>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    {typeof stepResult.durationMs === "number" && (
                                      <Typography variant="body2" color="textSecondary">
                                        Duration: {Math.round(stepResult.durationMs / 1000)}s
                                      </Typography>
                                    )}
                                    {stepResult.errorMessage && (
                                      <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                                        Error: {formatErrorMessage(stepResult.errorMessage)}
                                      </Typography>
                                    )}
                                  </AccordionDetails>
                                </Accordion>
                              ))}
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                      ) : (
                        renderReportTestPreview(report, entry.testId)
                      )}
                      <Divider sx={{ mt: 1 }} />
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}
      <Dialog open={Boolean(viewerPath)} onClose={closeViewer} maxWidth="md" fullWidth>
        <DialogTitle>{viewerLabel || "Artifact"}</DialogTitle>
        <DialogContent>
          {viewerUrl ? (
            viewerType === "video" ? (
              <Box
                component="video"
                controls
                src={viewerUrl}
                sx={{ width: "100%", borderRadius: 1 }}
              />
            ) : (
              <Box
                component="img"
                src={viewerUrl}
                alt={viewerLabel}
                sx={{ width: "100%", borderRadius: 1 }}
              />
            )
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeViewer}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
