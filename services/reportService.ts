export interface AgentReportResponse {
  report: string;
}

export async function fetchAgentReport(texts: string[]): Promise<string> {
  const payload = { texts };

  const response = await fetch("http://localhost:8000/api/generate-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = `请求失败：${response.status}`;
    try {
      const data = await response.json();
      if (data?.detail) {
        message = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // ignore parse error, keep default message
    }
    throw new Error(message);
  }

  const data: AgentReportResponse = await response.json();
  return data.report;
}


