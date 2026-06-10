import fs from 'fs';
import path from 'path';
import { type Assertion } from '../config/schema';
import { type ExecutionResult } from '../engine/execution';
import { type AssertionResult } from './index';

export function systematicGrade(
  assertion: Assertion,
  execResult: ExecutionResult
): AssertionResult {
  switch (assertion.type) {
    case 'is-json':
      return gradeIsJson(execResult.response);

    case 'equals-json':
      return gradeEqualsJson(execResult.response, assertion.value as string);

    case 'matches-schema':
      return gradeMatchesSchema(execResult.response, assertion.value as string);

    case 'contains-substring':
      return gradeContainsSubstring(execResult.response, assertion.value as string);

    case 'latency':
      return gradeLatency(execResult.latencyMs, assertion.value as number);

    default:
      return { type: assertion.type, pass: false, message: `Unknown systematic grader: ${assertion.type}` };
  }
}

function gradeIsJson(response: string): AssertionResult {
  try {
    JSON.parse(response);
    return { type: 'is-json', pass: true, message: 'Response is valid JSON' };
  } catch {
    return { type: 'is-json', pass: false, message: 'Response is not valid JSON', actual: response.slice(0, 100) };
  }
}

function gradeEqualsJson(response: string, expectedJson: string): AssertionResult {
  try {
    const actual = JSON.parse(response);
    let expected: unknown;
    try {
      expected = JSON.parse(expectedJson);
    } catch {
      return { type: 'equals-json', pass: false, message: `Invalid expected JSON: ${expectedJson.slice(0, 100)}` };
    }
    const pass = JSON.stringify(sortKeys(actual)) === JSON.stringify(sortKeys(expected));
    return {
      type: 'equals-json',
      pass,
      message: pass ? 'Response JSON matches expected output exactly' : 'Response JSON does not match expected output',
      expected: JSON.stringify(expected),
      actual: JSON.stringify(actual).slice(0, 200),
    };
  } catch {
    return { type: 'equals-json', pass: false, message: 'Response is not valid JSON', actual: response.slice(0, 100) };
  }
}

function sortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>).sort().reduce((acc, key) => {
      acc[key] = sortKeys((obj as Record<string, unknown>)[key]);
      return acc;
    }, {} as Record<string, unknown>);
  }
  return obj;
}

function gradeMatchesSchema(response: string, schemaPath: string): AssertionResult {
  try {
    const parsed = JSON.parse(response);

    // Load JSON schema file
    const resolvedPath = path.resolve(process.cwd(), schemaPath);
    if (!fs.existsSync(resolvedPath)) {
      return { type: 'matches-schema', pass: false, message: `Schema file not found: ${schemaPath}` };
    }

    const schema = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));

    // Basic schema validation: check required fields exist
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in parsed)) {
          return {
            type: 'matches-schema',
            pass: false,
            message: `Missing required field: ${field}`,
            expected: `Field "${field}" required`,
            actual: JSON.stringify(Object.keys(parsed)),
          };
        }
      }
    }

    // Check property types if defined
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in parsed) {
          const expectedType = (propSchema as Record<string, string>).type;
          const actualType = Array.isArray(parsed[key]) ? 'array' : typeof parsed[key];
          if (expectedType && actualType !== expectedType) {
            return {
              type: 'matches-schema',
              pass: false,
              message: `Field "${key}" type mismatch`,
              expected: expectedType,
              actual: actualType,
            };
          }
        }
      }
    }

    return { type: 'matches-schema', pass: true, message: 'Response matches schema' };
  } catch {
    return { type: 'matches-schema', pass: false, message: 'Response is not valid JSON for schema check' };
  }
}

function gradeContainsSubstring(response: string, substring: string): AssertionResult {
  const contains = response.toLowerCase().includes(substring.toLowerCase());
  return {
    type: 'contains-substring',
    pass: contains,
    message: contains ? `Response contains "${substring}"` : `Response does not contain "${substring}"`,
    expected: substring,
  };
}

function gradeLatency(latencyMs: number, maxLatencyMs: number): AssertionResult {
  const pass = latencyMs <= maxLatencyMs;
  return {
    type: 'latency',
    pass,
    message: pass
      ? `Latency ${latencyMs}ms within threshold ${maxLatencyMs}ms`
      : `Latency ${latencyMs}ms exceeds threshold ${maxLatencyMs}ms`,
    expected: `<= ${maxLatencyMs}ms`,
    actual: `${latencyMs}ms`,
  };
}
