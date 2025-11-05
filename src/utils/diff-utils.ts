import chalk from 'chalk';

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  lineNum?: number;
  content: string;
}

export interface ParsedDiff {
  oldFile: string;
  newFile: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export class DiffUtils {
  /**
   * Create a unified diff between two strings
   */
  static createUnifiedDiff(
    original: string,
    modified: string,
    filename: string = 'file',
    contextLines: number = 3
  ): string {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');

    // Simple line-by-line diff
    const diff: string[] = [];
    diff.push(`--- a/${filename}`);
    diff.push(`+++ b/${filename}`);

    // Find changes
    const changes = this.findChanges(originalLines, modifiedLines);

    if (changes.length === 0) {
      return ''; // No changes
    }

    // Group changes into hunks
    const hunks = this.groupIntoHunks(changes, originalLines, modifiedLines, contextLines);

    // Format hunks
    for (const hunk of hunks) {
      diff.push(
        `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`
      );

      for (const line of hunk.lines) {
        if (line.type === 'context') {
          diff.push(` ${line.content}`);
        } else if (line.type === 'remove') {
          diff.push(`-${line.content}`);
        } else if (line.type === 'add') {
          diff.push(`+${line.content}`);
        }
      }
    }

    return diff.join('\n');
  }

  /**
   * Find all changes between two arrays of lines
   */
  private static findChanges(
    original: string[],
    modified: string[]
  ): Array<{ type: 'add' | 'remove' | 'same'; oldIdx: number; newIdx: number }> {
    const changes: Array<{ type: 'add' | 'remove' | 'same'; oldIdx: number; newIdx: number }> =
      [];

    let oldIdx = 0;
    let newIdx = 0;

    while (oldIdx < original.length || newIdx < modified.length) {
      if (oldIdx >= original.length) {
        // Remaining lines are additions
        changes.push({ type: 'add', oldIdx, newIdx });
        newIdx++;
      } else if (newIdx >= modified.length) {
        // Remaining lines are deletions
        changes.push({ type: 'remove', oldIdx, newIdx });
        oldIdx++;
      } else if (original[oldIdx] === modified[newIdx]) {
        // Lines match
        changes.push({ type: 'same', oldIdx, newIdx });
        oldIdx++;
        newIdx++;
      } else {
        // Lines differ - mark as remove and add
        changes.push({ type: 'remove', oldIdx, newIdx });
        oldIdx++;
        if (newIdx < modified.length) {
          changes.push({ type: 'add', oldIdx, newIdx });
          newIdx++;
        }
      }
    }

    return changes;
  }

  /**
   * Group changes into hunks with context lines
   */
  private static groupIntoHunks(
    changes: Array<{ type: 'add' | 'remove' | 'same'; oldIdx: number; newIdx: number }>,
    original: string[],
    modified: string[],
    contextLines: number
  ): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];

      if (change.type === 'same') {
        // Check if we should close current hunk
        if (currentHunk) {
          currentHunk.lines.push({
            type: 'context',
            content: original[change.oldIdx],
          });

          // Check if there are more changes coming soon
          const hasMoreChanges = changes
            .slice(i + 1, i + contextLines + 1)
            .some(c => c.type !== 'same');

          if (!hasMoreChanges) {
            // Close this hunk
            hunks.push(currentHunk);
            currentHunk = null;
          }
        }
      } else {
        // Start new hunk if needed
        if (!currentHunk) {
          const oldStart = Math.max(0, change.oldIdx - contextLines);
          const newStart = Math.max(0, change.newIdx - contextLines);

          currentHunk = {
            oldStart: oldStart + 1,
            oldLines: 0,
            newStart: newStart + 1,
            newLines: 0,
            lines: [],
          };

          // Add context before
          for (let j = oldStart; j < change.oldIdx; j++) {
            currentHunk.lines.push({
              type: 'context',
              content: original[j],
            });
          }
        }

        // Add change
        if (change.type === 'remove') {
          currentHunk.lines.push({
            type: 'remove',
            content: original[change.oldIdx],
          });
          currentHunk.oldLines++;
        } else {
          currentHunk.lines.push({
            type: 'add',
            content: modified[change.newIdx],
          });
          currentHunk.newLines++;
        }
      }
    }

    // Close last hunk if open
    if (currentHunk) {
      hunks.push(currentHunk);
    }

    // Calculate hunk sizes
    for (const hunk of hunks) {
      const contextCount = hunk.lines.filter(l => l.type === 'context').length;
      hunk.oldLines += contextCount;
      hunk.newLines += contextCount;
    }

    return hunks;
  }

  /**
   * Add colors to diff for terminal display
   */
  static colorDiff(diffText: string): string {
    const lines = diffText.split('\n');
    const coloredLines = lines.map(line => {
      if (line.startsWith('---') || line.startsWith('+++')) {
        return chalk.bold(line);
      } else if (line.startsWith('@@')) {
        return chalk.cyan(line);
      } else if (line.startsWith('+')) {
        return chalk.green(line);
      } else if (line.startsWith('-')) {
        return chalk.red(line);
      } else {
        return chalk.gray(line);
      }
    });

    return coloredLines.join('\n');
  }

  /**
   * Parse a unified diff string
   */
  static parseDiff(diffText: string): ParsedDiff | null {
    const lines = diffText.split('\n');
    let oldFile = '';
    let newFile = '';
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;

    for (const line of lines) {
      if (line.startsWith('---')) {
        oldFile = line.substring(4).trim();
      } else if (line.startsWith('+++')) {
        newFile = line.substring(4).trim();
      } else if (line.startsWith('@@')) {
        // Parse hunk header: @@ -oldStart,oldLines +newStart,newLines @@
        const match = line.match(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
        if (match) {
          if (currentHunk) {
            hunks.push(currentHunk);
          }
          currentHunk = {
            oldStart: parseInt(match[1], 10),
            oldLines: parseInt(match[2], 10),
            newStart: parseInt(match[3], 10),
            newLines: parseInt(match[4], 10),
            lines: [],
          };
        }
      } else if (currentHunk) {
        if (line.startsWith('+')) {
          currentHunk.lines.push({
            type: 'add',
            content: line.substring(1),
          });
        } else if (line.startsWith('-')) {
          currentHunk.lines.push({
            type: 'remove',
            content: line.substring(1),
          });
        } else if (line.startsWith(' ')) {
          currentHunk.lines.push({
            type: 'context',
            content: line.substring(1),
          });
        }
      }
    }

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    if (hunks.length === 0) {
      return null;
    }

    return { oldFile, newFile, hunks };
  }

  /**
   * Get a summary of changes
   */
  static summarizeChanges(diffText: string): string {
    const lines = diffText.split('\n');
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
      }
    }

    return `+${additions} -${deletions}`;
  }
}

