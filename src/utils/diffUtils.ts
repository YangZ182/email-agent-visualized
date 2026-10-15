export interface DiffLine {
  type: 'equal' | 'insert' | 'delete' | 'empty';
  leftLineNumber?: number;
  rightLineNumber?: number;
  leftContent?: string;
  rightContent?: string;
}

export interface DiffResult {
  lines: DiffLine[];
  additions: number;
  deletions: number;
  unchanged: number;
}

/**
 * Computes a side-by-side line diff between original and modified text
 */
export function computeLineDiff(originalText: string, modifiedText: string): DiffResult {
  const origLines = originalText.split(/\r?\n/);
  const modLines = modifiedText.split(/\r?\n/);

  // Simple and effective LCS-based line differencing
  const matrix: number[][] = Array(origLines.length + 1)
    .fill(0)
    .map(() => Array(modLines.length + 1).fill(0));

  for (let i = 1; i <= origLines.length; i++) {
    for (let j = 1; j <= modLines.length; j++) {
      if (origLines[i - 1].trim() === modLines[j - 1].trim()) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  const resultLines: DiffLine[] = [];
  let i = origLines.length;
  let j = modLines.length;
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  const rawBacktrack: { type: 'equal' | 'delete' | 'insert'; origIdx?: number; modIdx?: number }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1].trim() === modLines[j - 1].trim()) {
      rawBacktrack.unshift({ type: 'equal', origIdx: i, modIdx: j });
      unchanged++;
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      rawBacktrack.unshift({ type: 'insert', modIdx: j });
      additions++;
      j--;
    } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
      rawBacktrack.unshift({ type: 'delete', origIdx: i });
      deletions++;
      i--;
    }
  }

  // Turn into side-by-side lines
  for (const item of rawBacktrack) {
    if (item.type === 'equal') {
      resultLines.push({
        type: 'equal',
        leftLineNumber: item.origIdx,
        rightLineNumber: item.modIdx,
        leftContent: origLines[(item.origIdx || 1) - 1],
        rightContent: modLines[(item.modIdx || 1) - 1]
      });
    } else if (item.type === 'delete') {
      resultLines.push({
        type: 'delete',
        leftLineNumber: item.origIdx,
        leftContent: origLines[(item.origIdx || 1) - 1],
        rightContent: ''
      });
    } else if (item.type === 'insert') {
      resultLines.push({
        type: 'insert',
        rightLineNumber: item.modIdx,
        leftContent: '',
        rightContent: modLines[(item.modIdx || 1) - 1]
      });
    }
  }

  return {
    lines: resultLines,
    additions,
    deletions,
    unchanged
  };
}
