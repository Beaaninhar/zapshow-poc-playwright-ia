import type { LocalStep } from "./localTests";
import type { Step } from "./apiClient";

export const STEP_TYPE_OPTIONS: Array<{ value: LocalStep["type"]; label: string }> = [
  { value: "goto", label: "Navegar para URL" },
  { value: "fill", label: "Preencher campo" },
  { value: "click", label: "Clicar no elemento" },
  { value: "expectText", label: "Validar texto" },
  { value: "expectVisible", label: "Validar visibilidade" },
  { value: "waitForTimeout", label: "Aguardar (ms)" },
  { value: "waitForSelector", label: "Aguardar seletor" },
  { value: "hover", label: "Passar o mouse" },
  { value: "print", label: "Imprimir mensagem" },
  { value: "screenshot", label: "Capturar screenshot" },
];

export function getStepTypeLabel(type: LocalStep["type"]): string {
  return STEP_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function summarizeRunStep(step: Step | undefined): string | null {
  if (!step) return null;
  switch (step.type) {
    case "goto":
      return `Navegar para ${step.url}`;
    case "fill":
      return `Preencher ${step.selector} com ${step.value}`;
    case "click":
      return `Clicar em ${step.selector}`;
    case "expectText":
      return `Validar texto ${step.text} em ${step.selector}`;
    case "expectVisible":
      return `Validar visibilidade de ${step.selector}`;
    case "waitForTimeout":
      return `Aguardar ${step.ms}ms`;
    case "waitForSelector":
      return `Aguardar seletor ${step.selector}`;
    case "hover":
      return `Passar o mouse em ${step.selector}`;
    case "print":
      return `Imprimir mensagem ${step.message}`;
    case "screenshot":
      return `Capturar screenshot ${step.name ?? ""}`;
  }
}

export function summarizeLocalStep(step: LocalStep): string {
  switch (step.type) {
    case "goto":
      return `Navegar para ${step.urlSource === "variable" ? `var:${step.urlVar ?? ""}` : step.url}`;
    case "fill":
      return `Preencher ${step.selector} com ${step.valueSource === "variable" ? `var:${step.valueVar ?? ""}` : step.value}`;
    case "click":
      return `Clicar em ${step.selector}`;
    case "expectText":
      return `Validar texto ${step.textSource === "variable" ? `var:${step.textVar ?? ""}` : step.text} em ${step.selector}`;
    case "expectVisible":
      return `Validar visibilidade de ${step.selector}`;
    case "waitForTimeout":
      return `Aguardar ${step.ms}ms`;
    case "waitForSelector":
      return `Aguardar seletor ${step.selector}`;
    case "hover":
      return `Passar o mouse em ${step.selector}`;
    case "print":
      return `Imprimir mensagem ${step.message}`;
    case "screenshot":
      return `Capturar screenshot ${step.name ?? ""}`;
  }
}

