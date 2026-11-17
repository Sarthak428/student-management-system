const fs = require('node:fs');
const path = require('node:path');
const newman = require('newman');

const projectRoot = path.join(__dirname, '..');
const collectionPath = path.join(projectRoot, 'postman', 'Student-Management-System.postman_collection.json');
const reportDirectory = path.join(projectRoot, 'reports');
const baseUrl = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const startedAt = new Date();
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
const baseUrlVariable = collection.variable.find((variable) => variable.key === 'baseUrl');

if (!baseUrlVariable) {
  throw new Error('The Postman collection must define a baseUrl variable.');
}
baseUrlVariable.value = baseUrl;

function getCreatedStudentId(executions) {
  const createRequest = executions.find((execution) => execution.item.name === 'POST - Create Student');
  if (!createRequest || !createRequest.response) return null;

  try {
    return createRequest.response.json()._id || null;
  } catch {
    return null;
  }
}

function formatExecution(execution) {
  const response = execution.response;
  const assertions = (execution.assertions || []).map((assertion) => ({
    name: assertion.assertion,
    passed: !assertion.error,
    error: assertion.error ? assertion.error.message : null
  }));
  const statusCode = response ? response.code : null;
  const requestPassed = Boolean(
    statusCode >= 200 &&
    statusCode < 300 &&
    assertions.length > 0 &&
    assertions.every((assertion) => assertion.passed)
  );

  return {
    name: execution.item.name,
    method: execution.request.method,
    statusCode,
    status: response ? response.status : 'No response',
    result: requestPassed ? 'PASS' : 'FAIL',
    assertions
  };
}

function makeMarkdownReport(report) {
  const lines = [
    '# Newman API Test Report',
    '',
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- API base URL: ${report.baseUrl}`,
    `- Result: ${report.result} (${report.passedRequests}/${report.totalRequests} requests passed)`,
    '',
    '| Request | HTTP status | Result | Assertions |',
    '| --- | ---: | :---: | --- |'
  ];

  for (const request of report.requests) {
    const assertions = request.assertions.length
      ? request.assertions.map((assertion) => `${assertion.passed ? 'PASS' : 'FAIL'}: ${assertion.name}`).join('<br>')
      : 'No assertions recorded';
    const status = request.statusCode ? `${request.statusCode} ${request.status}` : 'No response';
    lines.push(`| ${request.name} | ${status} | ${request.result} | ${assertions} |`);
  }

  if (report.failures.length > 0) {
    lines.push('', '## Newman failures', '');
    for (const failure of report.failures) {
      lines.push(`- ${failure}`);
    }
  }

  if (report.cleanup) {
    lines.push('', `Cleanup attempt for the temporary student: ${report.cleanup}.`);
  }

  lines.push('');
  return lines.join('\n');
}

async function writeReport(error, summary) {
  const executions = summary && summary.run ? summary.run.executions : [];
  const requests = executions.map(formatExecution);
  const newmanFailures = summary && summary.run
    ? summary.run.failures.map((failure) => {
      const requestName = failure.source && failure.source.name ? `${failure.source.name}: ` : '';
      return `${requestName}${failure.error ? failure.error.message : 'Unknown Newman failure'}`;
    })
    : [];
  if (error) newmanFailures.push(error.message);

  const report = {
    collection: collection.info.name,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    baseUrl,
    totalRequests: requests.length,
    passedRequests: requests.filter((request) => request.result === 'PASS').length,
    failedRequests: requests.filter((request) => request.result === 'FAIL').length,
    result: error || newmanFailures.length > 0 || requests.some((request) => request.result === 'FAIL')
      ? 'FAIL'
      : 'PASS',
    requests,
    failures: newmanFailures
  };

  const createId = getCreatedStudentId(executions);
  const deleteExecution = executions.find((execution) => execution.item.name === 'DELETE - Delete Student');
  if (createId && (!deleteExecution || !deleteExecution.response || deleteExecution.response.code !== 200)) {
    try {
      const cleanupResponse = await fetch(`${baseUrl}/api/students/${encodeURIComponent(createId)}`, {
        method: 'DELETE'
      });
      report.cleanup = `HTTP ${cleanupResponse.status}`;
    } catch (cleanupError) {
      report.cleanup = `failed: ${cleanupError.message}`;
      report.failures.push(`Temporary student cleanup failed: ${cleanupError.message}`);
      report.result = 'FAIL';
    }
  }

  fs.mkdirSync(reportDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(reportDirectory, 'newman-report.json'),
    `${JSON.stringify(report, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(reportDirectory, 'newman-report.md'),
    makeMarkdownReport(report)
  );

  console.log(`\nSaved Newman reports to ${path.join(reportDirectory, 'newman-report.md')} and newman-report.json`);
  if (report.result === 'FAIL') process.exitCode = 1;
}

newman.run(
  {
    collection,
    reporters: ['cli'],
    timeoutRequest: 15000
  },
  (error, summary) => {
    writeReport(error, summary).catch((reportError) => {
      console.error(`Could not write Newman report: ${reportError.message}`);
      process.exitCode = 1;
    });
  }
);
