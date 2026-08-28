import type { FileTab } from "./types";

export const SAMPLE_FILES: FileTab[] = [
  {
    id: "retry",
    name: "retry.ts",
    language: "typescript",
    content: `type RetryOptions = {
  attempts: number;
  baseMs: number;
  shouldRetry?: (error: unknown) => boolean;
};

export async function withRetry<T>(
  task: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { attempts, baseMs, shouldRetry = () => true } = options;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (i === attempts - 1 || !shouldRetry(error)) break;
      const jitter = Math.random() * baseMs;
      await sleep(baseMs * 2 ** i + jitter);
    }
  }

  throw lastError;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
`,
  },
  {
    id: "graph",
    name: "graph.py",
    language: "python",
    content: `from collections import defaultdict


def reachable(graph, start, seen=set()):
    """Return every node reachable from start, including start itself."""
    seen.add(start)
    for neighbor in graph[start]:
        if neighbor not in seen:
            reachable(graph, neighbor, seen)
    return seen


def build_graph(edges):
    graph = defaultdict(list)
    for src, dst in edges:
        graph[src].append(dst)
    return graph


if __name__ == "__main__":
    g = build_graph([("a", "b"), ("b", "c"), ("d", "e")])
    print(sorted(reachable(g, "a")))
    print(sorted(reachable(g, "d")))
`,
  },
  {
    id: "pool",
    name: "pool.go",
    language: "go",
    content: `package pool

import (
	"context"
	"sync"
)

type Job func(ctx context.Context) error

func Run(ctx context.Context, workers int, jobs []Job) error {
	if workers < 1 {
		workers = 1
	}

	ch := make(chan Job)
	errCh := make(chan error, 1)
	var wg sync.WaitGroup

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range ch {
				if err := job(ctx); err != nil {
					select {
					case errCh <- err:
					default:
					}
					return
				}
			}
		}()
	}

	go func() {
		defer close(ch)
		for _, job := range jobs {
			select {
			case <-ctx.Done():
				return
			case ch <- job:
			}
		}
	}()

	wg.Wait()
	select {
	case err := <-errCh:
		return err
	default:
		return ctx.Err()
	}
}
`,
  },
];

export function cloneSamples(): FileTab[] {
  return SAMPLE_FILES.map((file) => ({ ...file }));
}
