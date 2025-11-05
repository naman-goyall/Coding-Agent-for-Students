import chalk from 'chalk';

export class Logger {
  debug(message: string, metadata?: object): void {
    if (process.env.DEBUG) {
      console.error(chalk.gray(`[DEBUG] ${message}`), metadata || '');
    }
  }

  info(message: string): void {
    console.error(chalk.blue(`[INFO] ${message}`));
  }

  error(error: Error | string, context?: string): void {
    const message = error instanceof Error ? error.message : error;
    console.error(chalk.red(`[ERROR] ${context ? `${context}: ` : ''}${message}`));
    if (error instanceof Error && error.stack && process.env.DEBUG) {
      console.error(chalk.gray(error.stack));
    }
  }

  warn(message: string): void {
    console.error(chalk.yellow(`[WARN] ${message}`));
  }
}

export const logger = new Logger();

